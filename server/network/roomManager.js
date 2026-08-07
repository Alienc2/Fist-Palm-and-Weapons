// server/network/roomManager.js
// Phase E-01：Socket.IO 房間系統
// 負責房間的建立、加入、離開、狀態廣播。
// 純邏輯、不依賴 socket.io 實例，方便單元測試。

const crypto = require("node:crypto");

// 產生短房間代碼（6 位大寫字母數字）
function generateRoomCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

// 建立一個新的房間
// options:
//   - hostId: 房主 socket id
//   - hostName: 房主顯示名稱
//   - maxPlayers: 最大玩家數（2 / 3 / 4）
//   - mode: 模式（"2p" / "3p" / "4p"）
function createRoom(options = {}) {
  const maxPlayers = options.maxPlayers || 2;
  const room = {
    id: options.id || generateRoomCode(),
    hostId: options.hostId || null,
    maxPlayers,
    mode: options.mode || `${maxPlayers}p`,
    players: [], // [{ socketId, name, characterId, ready }]
    status: "waiting", // waiting / playing / finished
    matchId: null,
    createdAt: Date.now(),
  };

  if (options.hostId) {
    room.players.push({
      socketId: options.hostId,
      name: options.hostName || "Player",
      characterId: options.hostCharacterId || null,
      ready: false,
    });
  }

  return room;
}

// 玩家加入房間
// 回傳 { ok, reason, room }
function joinRoom(room, socketId, options = {}) {
  if (room.status !== "waiting") {
    return { ok: false, reason: "ROOM_NOT_ACCEPTING" };
  }

  if (room.players.length >= room.maxPlayers) {
    return { ok: false, reason: "ROOM_FULL" };
  }

  if (room.players.some((p) => p.socketId === socketId)) {
    return { ok: false, reason: "ALREADY_IN_ROOM" };
  }

  room.players.push({
    socketId,
    name: options.name || "Player",
    characterId: options.characterId || null,
    ready: false,
  });

  return { ok: true, room };
}

// 玩家離開房間
// 回傳 { ok, room, hostChanged }
function leaveRoom(room, socketId) {
  const index = room.players.findIndex((p) => p.socketId === socketId);
  if (index === -1) {
    return { ok: false, reason: "NOT_IN_ROOM" };
  }

  room.players.splice(index, 1);

  // 若房主離開，轉移房主給下一位玩家
  let hostChanged = false;
  if (room.hostId === socketId) {
    if (room.players.length > 0) {
      room.hostId = room.players[0].socketId;
      hostChanged = true;
    } else {
      room.hostId = null;
    }
  }

  return { ok: true, room, hostChanged };
}

// 設定玩家角色
function setCharacter(room, socketId, characterId) {
  const player = room.players.find((p) => p.socketId === socketId);
  if (!player) return { ok: false, reason: "NOT_IN_ROOM" };
  player.characterId = characterId;
  return { ok: true, room };
}

// 設定玩家準備狀態
function setReady(room, socketId, ready) {
  const player = room.players.find((p) => p.socketId === socketId);
  if (!player) return { ok: false, reason: "NOT_IN_ROOM" };
  player.ready = !!ready;
  return { ok: true, room };
}

// 檢查是否所有玩家都已準備且選好角色
function isAllReady(room) {
  if (room.players.length < 2) return false;
  return room.players.every(
    (p) => p.ready && p.characterId
  );
}

// 取得房間公開狀態（不含 socket 內部資訊）
function getPublicRoom(room) {
  return {
    id: room.id,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    mode: room.mode,
    status: room.status,
    matchId: room.matchId,
    playerCount: room.players.length,
    players: room.players.map((p) => ({
      socketId: p.socketId,
      name: p.name,
      characterId: p.characterId,
      ready: p.ready,
    })),
  };
}

// 房間管理員：管理多個房間
function createRoomManager() {
  const rooms = new Map();

  return {
    // 建立房間
    create(options = {}) {
      const room = createRoom(options);
      rooms.set(room.id, room);
      return room;
    },

    // 依 id 取得房間
    get(roomId) {
      return rooms.get(roomId) || null;
    },

    // 依 socketId 找玩家所在的房間
    findRoomBySocket(socketId) {
      for (const room of rooms.values()) {
        if (room.players.some((p) => p.socketId === socketId)) {
          return room;
        }
      }
      return null;
    },

    // 列出所有等待中的房間
    listWaiting() {
      return [...rooms.values()]
        .filter((room) => room.status === "waiting")
        .map(getPublicRoom);
    },

    // 刪除房間
    remove(roomId) {
      return rooms.delete(roomId);
    },

    // 取得所有房間（公開狀態）
    listAll() {
      return [...rooms.values()].map(getPublicRoom);
    },

    // 內部存取（供測試）
    _rooms: rooms,
  };
}

module.exports = {
  generateRoomCode,
  createRoom,
  joinRoom,
  leaveRoom,
  setCharacter,
  setReady,
  isAllReady,
  getPublicRoom,
  createRoomManager,
};
