// server/network/socketServer.js
// Phase E：Socket.IO server 整合
// 把 roomManager / matchManager / matchmaking 串接成完整的多人對戰網路層。
// 提供：
//   - 房間：create / join / leave / list / setCharacter / setReady / start
//   - 對戰：select / facing / play（同步選牌 + 回合解析 + 廣播）
//   - 配對：enqueue / dequeue / queueStatus
//   - 斷線重連：disconnect / reconnect

const { Server } = require("socket.io");
const {
  createRoomManager,
  getPublicRoom,
  joinRoom,
  leaveRoom,
  setCharacter,
  setReady,
  isAllReady,
} = require("./roomManager");
const {
  createMatchFromRoom,
  createMatchController,
} = require("./matchManager");
const { createMatchmaking } = require("../rooms/matchmaking");

// 建立 Socket.IO server
// options:
//   - httpServer: HTTP server 實例
//   - matchmakingTimeoutMs: 配對超時（預設 30 秒）
function createSocketServer(httpServer, options = {}) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const roomManager = createRoomManager();
  const matchmaking = createMatchmaking({
    timeoutMs: options.matchmakingTimeoutMs || 30000,
    onMatchFound: (room, players) => {
      // 配對成功：把玩家加入 socket.io room
      for (const p of players) {
        const socket = io.sockets.sockets.get(p.socketId);
        if (socket) {
          socket.join(room.id);
          socket.emit("match:found", { roomId: room.id });
        }
      }
      io.to(room.id).emit("room:update", getPublicRoom(room));
    },
    onTimeout: (entry) => {
      const socket = io.sockets.sockets.get(entry.socketId);
      if (socket) {
        socket.emit("matchmaking:timeout", { mode: entry.mode });
      }
    },
  });

  // 對戰控制器快取：roomId -> matchController
  const matches = new Map();

  // 廣播對戰狀態給房間內所有玩家
  function broadcastMatchState(roomId, controller) {
    io.to(roomId).emit("match:state", controller.serialize());
  }

  // 建立對戰（所有玩家已準備）
  function startMatch(room) {
    const controller = createMatchController(
      createMatchFromRoom(room.players).state,
      {
        onStateChange: (state) => {
          broadcastMatchState(room.id, controller);
        },
        onRoundComplete: (state, events) => {
          io.to(room.id).emit("match:round", {
            round: state.round,
            log: state.log,
            events: events || [],
          });
        },
        onMatchEnd: (state, winnerId) => {
          io.to(room.id).emit("match:end", { winnerId });
        },
      }
    );

    // 綁定每位玩家的 socket 到 playerId
    for (const p of room.players) {
      controller.bindSocket(p.socketId, p.socketId);
    }

    matches.set(room.id, controller);
    room.status = "playing";
    room.matchId = controller.state.matchId;

    // 廣播對戰開始
    io.to(room.id).emit("match:start", {
      matchId: controller.state.matchId,
      state: controller.serialize(),
    });

    return controller;
  }

  // 處理 socket 連線
  io.on("connection", (socket) => {
    // ---- 房間事件 ----

    // 建立房間
    socket.on("room:create", (payload = {}, ack) => {
      const maxPlayers = payload.maxPlayers || 2;
      const room = roomManager.create({
        hostId: socket.id,
        hostName: payload.name || "Player",
        hostCharacterId: payload.characterId || null,
        maxPlayers,
        mode: payload.mode || `${maxPlayers}p`,
      });

      socket.join(room.id);
      socket.emit("room:created", getPublicRoom(room));
      if (ack) ack({ ok: true, room: getPublicRoom(room) });
    });

    // 加入房間
    socket.on("room:join", (payload = {}, ack) => {
      const room = roomManager.get(payload.roomId);
      if (!room) {
        if (ack) ack({ ok: false, reason: "ROOM_NOT_FOUND" });
        return;
      }

      const result = joinRoom(room, socket.id, {
        name: payload.name || "Player",
        characterId: payload.characterId || null,
      });

      if (!result.ok) {
        if (ack) ack({ ok: false, reason: result.reason });
        return;
      }

      socket.join(room.id);
      io.to(room.id).emit("room:update", getPublicRoom(room));
      if (ack) ack({ ok: true, room: getPublicRoom(room) });
    });

    // 離開房間
    socket.on("room:leave", (payload = {}, ack) => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) {
        if (ack) ack({ ok: false, reason: "NOT_IN_ROOM" });
        return;
      }

      const result = leaveRoom(room, socket.id);
      socket.leave(room.id);

      if (result.ok && room.players.length === 0) {
        roomManager.remove(room.id);
        matches.delete(room.id);
      } else if (result.ok) {
        io.to(room.id).emit("room:update", getPublicRoom(room));
      }

      if (ack) ack({ ok: result.ok, reason: result.reason || null });
    });

    // 列出等待中的房間
    socket.on("room:list", (payload = {}, ack) => {
      const rooms = roomManager.listWaiting();
      if (ack) ack({ ok: true, rooms });
    });

    // 設定角色
    socket.on("room:setCharacter", (payload = {}, ack) => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) {
        if (ack) ack({ ok: false, reason: "NOT_IN_ROOM" });
        return;
      }

      const result = setCharacter(room, socket.id, payload.characterId);
      if (result.ok) {
        io.to(room.id).emit("room:update", getPublicRoom(room));
      }
      if (ack) ack({ ok: result.ok, reason: result.reason || null });
    });

    // 設定準備狀態
    socket.on("room:setReady", (payload = {}, ack) => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) {
        if (ack) ack({ ok: false, reason: "NOT_IN_ROOM" });
        return;
      }

      const result = setReady(room, socket.id, payload.ready);
      if (result.ok) {
        io.to(room.id).emit("room:update", getPublicRoom(room));
      }
      if (ack) ack({ ok: result.ok, reason: result.reason || null });
    });

    // 開始對戰（房主觸發，需所有玩家準備）
    socket.on("room:start", (payload = {}, ack) => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) {
        if (ack) ack({ ok: false, reason: "NOT_IN_ROOM" });
        return;
      }

      if (room.hostId !== socket.id) {
        if (ack) ack({ ok: false, reason: "NOT_HOST" });
        return;
      }

      if (!isAllReady(room)) {
        if (ack) ack({ ok: false, reason: "NOT_ALL_READY" });
        return;
      }

      const controller = startMatch(room);
      if (ack) ack({ ok: true, matchId: controller.state.matchId });
    });

    // ---- 對戰事件 ----

    // 提交選牌
    socket.on("match:select", (payload = {}, ack) => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) {
        if (ack) ack({ ok: false, reason: "NOT_IN_ROOM" });
        return;
      }

      const controller = matches.get(room.id);
      if (!controller) {
        if (ack) ack({ ok: false, reason: "NO_MATCH" });
        return;
      }

      const playerId = controller.getPlayerIdForSocket(socket.id);
      if (!playerId) {
        if (ack) ack({ ok: false, reason: "NOT_A_PLAYER" });
        return;
      }

      const result = controller.submitSelection(playerId, payload.selections || []);
      if (ack) ack({ ok: result.ok, reason: result.reason || null, allSubmitted: result.allSubmitted });

      // 若所有玩家都已選完，自動結算回合
      if (result.ok && result.allSubmitted) {
        controller.resolveTurn();
      }
    });

    // 設定朝向
    socket.on("match:facing", (payload = {}, ack) => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) {
        if (ack) ack({ ok: false, reason: "NOT_IN_ROOM" });
        return;
      }

      const controller = matches.get(room.id);
      if (!controller) {
        if (ack) ack({ ok: false, reason: "NO_MATCH" });
        return;
      }

      const playerId = controller.getPlayerIdForSocket(socket.id);
      if (!playerId) {
        if (ack) ack({ ok: false, reason: "NOT_A_PLAYER" });
        return;
      }

      const result = controller.setFacing(playerId, payload.facing);
      if (ack) ack({ ok: result.ok !== false, reason: result.reason || null });
    });

    // 設定要棄的牌（手牌超過上限時）
    socket.on("match:discard", (payload = {}, ack) => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) {
        if (ack) ack({ ok: false, reason: "NOT_IN_ROOM" });
        return;
      }

      const controller = matches.get(room.id);
      if (!controller) {
        if (ack) ack({ ok: false, reason: "NO_MATCH" });
        return;
      }

      const playerId = controller.getPlayerIdForSocket(socket.id);
      if (!playerId) {
        if (ack) ack({ ok: false, reason: "NOT_A_PLAYER" });
        return;
      }

      const result = controller.setPendingDiscards(playerId, payload.discards || []);
      if (ack) ack({ ok: result.ok !== false, reason: result.reason || null });
    });


    // 手動結算回合（房主觸發，供測試 / 除錯）
    socket.on("match:play", (payload = {}, ack) => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) {
        if (ack) ack({ ok: false, reason: "NOT_IN_ROOM" });
        return;
      }

      const controller = matches.get(room.id);
      if (!controller) {
        if (ack) ack({ ok: false, reason: "NO_MATCH" });
        return;
      }

      const result = controller.resolveTurn();
      if (ack) ack({ ok: result.ok, winner: result.winner, matchEnded: result.matchEnded });
    });

    // ---- 配對事件 ----

    // 加入配對佇列
    socket.on("matchmaking:enqueue", (payload = {}, ack) => {
      const result = matchmaking.enqueue(socket.id, {
        name: payload.name || "Player",
        mode: payload.mode || "2p",
        characterId: payload.characterId || null,
      });

      if (ack) ack(result);
    });

    // 離開配對佇列
    socket.on("matchmaking:dequeue", (payload = {}, ack) => {
      const result = matchmaking.dequeue(socket.id);
      if (ack) ack(result);
    });

    // 取得配對佇列狀態
    socket.on("matchmaking:status", (payload = {}, ack) => {
      if (ack) ack({ ok: true, queue: matchmaking.getQueueStatus() });
    });

    // ---- 斷線處理 ----

    socket.on("disconnect", () => {
      // 從配對佇列移除
      matchmaking.dequeue(socket.id);

      // 從房間移除
      const room = roomManager.findRoomBySocket(socket.id);
      if (room) {
        // 若對戰進行中，標記玩家斷線
        const controller = matches.get(room.id);
        if (controller) {
          const playerId = controller.getPlayerIdForSocket(socket.id);
          if (playerId) {
            controller.onDisconnect(playerId);
          }
        }

        const result = leaveRoom(room, socket.id);
        if (result.ok && room.players.length === 0) {
          roomManager.remove(room.id);
          matches.delete(room.id);
        } else if (result.ok) {
          io.to(room.id).emit("room:update", getPublicRoom(room));
        }
      }
    });
  });

  return {
    io,
    roomManager,
    matchmaking,
    matches,
    startMatch,
  };
}

module.exports = {
  createSocketServer,
};
