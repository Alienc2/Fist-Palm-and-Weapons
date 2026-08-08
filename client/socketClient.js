// client/socketClient.js
// Phase H-03：前端 Socket.IO 連線模組。
// 負責：
//   1. 建立與 server 的 Socket.IO 連線
//   2. 房間事件（create / join / leave / list / setCharacter / setReady / start）
//   3. 對戰事件（select / facing / discard / play）
//   4. 監聽 server 廣播（room:update / match:start / match:state / match:round / match:end）
// 提供 Promise 化的 emit（支援 ack），並把 server 廣播轉發給訂閱者。

// 動態載入 socket.io client（由 server 提供 /socket.io/socket.io.js）
let socket = null;
let connected = false;
let socketId = null;
let playerName = "Player";
let currentRoom = null; // { id, hostId, maxPlayers, mode, players, ... }
let currentMatch = null; // 最近一次 match:state 的序列化狀態


const listeners = {}; // eventName -> [fn]

function on(event, fn) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(fn);
  return () => off(event, fn);
}

function off(event, fn) {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter((f) => f !== fn);
}

function emitLocal(event, data) {
  const fns = listeners[event] || [];
  for (const fn of fns) {
    try {
      fn(data);
    } catch (error) {
      console.error(`[socketClient] listener error on ${event}:`, error);
    }
  }
}

// 建立連線（若尚未連線）
function connect(options = {}) {
  if (socket) return socket;

  const io = window.io;
  if (!io) {
    console.error("[socketClient] socket.io client not loaded");
    return null;
  }

  socket = io(options.url || "", {
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    connected = true;
    socketId = socket.id || null;
    emitLocal("connect", {});
  });


  socket.on("disconnect", () => {
    connected = false;
    emitLocal("disconnect", {});
  });

  // ---- server 廣播事件 ----
  socket.on("room:created", (room) => {
    currentRoom = room;
    emitLocal("room:update", room);
  });

  socket.on("room:update", (room) => {
    currentRoom = room;
    emitLocal("room:update", room);
  });

  socket.on("match:found", (data) => {
    emitLocal("match:found", data);
  });

  socket.on("match:start", (data) => {
    currentMatch = data.state;
    emitLocal("match:start", data);
  });

  socket.on("match:state", (state) => {
    currentMatch = state;
    emitLocal("match:state", state);
  });

  socket.on("match:round", (data) => {
    emitLocal("match:round", data);
  });

  socket.on("match:end", (data) => {
    emitLocal("match:end", data);
  });

  socket.on("matchmaking:timeout", (data) => {
    emitLocal("matchmaking:timeout", data);
  });

  return socket;
}

// Promise 化 emit（支援 ack）
function emit(event, payload = {}) {
  return new Promise((resolve) => {
    if (!socket || !connected) {
      resolve({ ok: false, reason: "NOT_CONNECTED" });
      return;
    }
    socket.emit(event, payload, (response) => resolve(response || { ok: true }));
  });
}

// ---- 房間 API ----

async function createRoom(options = {}) {
  const result = await emit("room:create", {
    name: options.name || playerName,
    maxPlayers: options.maxPlayers || 2,
    mode: options.mode || `${options.maxPlayers || 2}p`,
    characterId: options.characterId || null,
  });
  if (result.ok && result.room) currentRoom = result.room;
  return result;
}

async function joinRoom(roomId, options = {}) {
  const result = await emit("room:join", {
    roomId,
    name: options.name || playerName,
    characterId: options.characterId || null,
  });
  if (result.ok && result.room) currentRoom = result.room;
  return result;
}

async function leaveRoom() {
  const result = await emit("room:leave", {});
  currentRoom = null;
  return result;
}

async function listRooms() {
  const result = await emit("room:list", {});
  return result.rooms || [];
}

async function setCharacter(characterId) {
  return emit("room:setCharacter", { characterId });
}

async function setReady(ready) {
  return emit("room:setReady", { ready });
}

async function startMatch() {
  return emit("room:start", {});
}

// ---- 對戰 API ----

async function submitSelection(selections) {
  return emit("match:select", { selections });
}

async function setFacing(facing) {
  return emit("match:facing", { facing });
}

async function setPendingDiscards(discards) {
  return emit("match:discard", { discards });
}

async function playTurn() {
  return emit("match:play", {});
}

// ---- 配對 API ----

async function enqueueMatchmaking(options = {}) {
  return emit("matchmaking:enqueue", {
    name: options.name || playerName,
    mode: options.mode || "2p",
    characterId: options.characterId || null,
  });
}

async function dequeueMatchmaking() {
  return emit("matchmaking:dequeue", {});
}

// ---- 狀態存取 ----

function isConnected() {
  return connected;
}

function getSocketId() {
  return socketId;
}

function getCurrentRoom() {
  return currentRoom;
}


function getCurrentMatch() {
  return currentMatch;
}

function setPlayerName(name) {
  playerName = name;
}

function getPlayerName() {
  return playerName;
}

function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
    connected = false;
    currentRoom = null;
    currentMatch = null;
  }
}

export const socketClient = {
  connect,
  disconnect,
  emit,
  on,
  off,
  isConnected,
  getSocketId,
  getCurrentRoom,
  getCurrentMatch,
  setPlayerName,
  getPlayerName,

  createRoom,
  joinRoom,
  leaveRoom,
  listRooms,
  setCharacter,
  setReady,
  startMatch,
  submitSelection,
  setFacing,
  setPendingDiscards,
  playTurn,
  enqueueMatchmaking,
  dequeueMatchmaking,
};
