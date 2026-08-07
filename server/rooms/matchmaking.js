// server/rooms/matchmaking.js
// Phase E-03：Matchmaking 配對系統
// 負責：
//   1. 等待佇列（玩家排隊等待配對）
//   2. 超時處理（等待過久自動取消或補 AI）
//   3. 多種模式配對（2人 / 3人 / 4人）
// 純邏輯、不依賴 socket.io 實例，方便單元測試。

const { createRoom } = require("../network/roomManager");

// 依模式取得所需人數
function getRequiredPlayers(mode) {
  if (mode === "3p") return 3;
  if (mode === "4p") return 4;
  return 2; // 2p 或預設
}

// 建立配對管理器
// options:
//   - timeoutMs: 等待超時（預設 30 秒）
//   - onMatchFound: (room, players) => void 配對成功回呼
//   - onTimeout: (queueEntry) => void 超時回呼
function createMatchmaking(options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const onMatchFound = options.onMatchFound || null;
  const onTimeout = options.onTimeout || null;

  // 等待佇列：{ socketId, name, mode, maxPlayers, characterId, joinedAt, timer }
  const queue = new Map();


  // 玩家加入等待佇列
  // 回傳 { ok, position, requiredPlayers }
  function enqueue(socketId, options = {}) {
    if (queue.has(socketId)) {
      return { ok: false, reason: "ALREADY_IN_QUEUE" };
    }

    const mode = options.mode || "2p";
    const requiredPlayers = getRequiredPlayers(mode);

    const entry = {
      socketId,
      name: options.name || "Player",
      mode,
      maxPlayers: requiredPlayers,
      characterId: options.characterId || null,
      joinedAt: Date.now(),
      timer: null,
    };

    queue.set(socketId, entry);

    // 設定超時計時器
    entry.timer = setTimeout(() => {
      queue.delete(socketId);
      if (onTimeout) onTimeout(entry);
    }, timeoutMs);

    // 檢查是否已湊齊人數
    const matched = tryMatch(mode);

    return {
      ok: true,
      position: getQueuePosition(socketId),
      requiredPlayers,
      matched,
    };
  }

  // 玩家離開等待佇列
  function dequeue(socketId) {
    const entry = queue.get(socketId);
    if (!entry) return { ok: false, reason: "NOT_IN_QUEUE" };
    clearTimeout(entry.timer);
    queue.delete(socketId);
    return { ok: true };
  }

  // 嘗試配對指定模式的玩家
  // 回傳配對到的玩家陣列（或 null）
  function tryMatch(mode) {
    const requiredPlayers = getRequiredPlayers(mode);
    const candidates = [...queue.values()].filter((e) => e.mode === mode);

    if (candidates.length < requiredPlayers) {
      return null;
    }

    // 取前 N 位玩家
    const matched = candidates.slice(0, requiredPlayers);

    // 從佇列移除並清除計時器
    for (const entry of matched) {
      clearTimeout(entry.timer);
      queue.delete(entry.socketId);
    }

    // 建立房間並回呼
    const room = createRoom({
      hostId: matched[0].socketId,
      hostName: matched[0].name,
      hostCharacterId: matched[0].characterId,
      maxPlayers: requiredPlayers,
      mode,
    });

    // 其餘玩家加入房間
    for (let i = 1; i < matched.length; i++) {
      room.players.push({
        socketId: matched[i].socketId,
        name: matched[i].name,
        characterId: matched[i].characterId,
        ready: false,
      });
    }

    if (onMatchFound) {
      onMatchFound(room, matched);
    }

    return matched;
  }

  // 取得玩家在佇列中的位置
  function getQueuePosition(socketId) {
    const entries = [...queue.values()];
    const index = entries.findIndex((e) => e.socketId === socketId);
    return index === -1 ? -1 : index + 1;
  }

  // 取得佇列狀態
  function getQueueStatus() {
    return [...queue.values()].map((e) => ({
      socketId: e.socketId,
      name: e.name,
      mode: e.mode,
      maxPlayers: e.maxPlayers,
      joinedAt: e.joinedAt,
    }));
  }

  // 取得佇列人數
  function getQueueSize() {
    return queue.size;
  }

  // 清理所有佇列（測試用）
  function clear() {
    for (const entry of queue.values()) {
      clearTimeout(entry.timer);
    }
    queue.clear();
  }

  return {
    enqueue,
    dequeue,
    tryMatch,
    getQueuePosition,
    getQueueStatus,
    getQueueSize,
    clear,
    _queue: queue,
  };
}

module.exports = {
  createMatchmaking,
  getRequiredPlayers,
};
