// server/network/matchManager.js
// Phase E-02：同步選牌與回合解析
// 負責：
//   1. 建立對戰（由房間玩家建立 gameEngine state）
//   2. 等待所有玩家選牌（同步選牌機制）
//   3. 所有玩家選完後，server-side 回合解析並廣播結果
//   4. 斷線重連與狀態恢復
// 純邏輯、不依賴 socket.io 實例，方便單元測試。

const gameEngine = require("../game/gameEngine");
const { autoSelectAiPlayers } = require("../game/ai/aiMatch");

// 建立對戰 state（由房間玩家建立）
// roomPlayers: [{ socketId, name, characterId }]
// 回傳 { state, playerIdBySocket }
function createMatchFromRoom(roomPlayers, options = {}) {
  const positions = options.positions || [
    { x: 1, y: 1 },
    { x: 3, y: 3 },
    { x: 1, y: 3 },
    { x: 3, y: 1 },
  ];

  const players = roomPlayers.map((p, index) => ({
    id: p.socketId, // 用 socketId 作為玩家 id，方便斷線重連對應
    position: positions[index % positions.length],
    characterId: p.characterId,
  }));

  const state = gameEngine.createMatch({ players });

  // 標記所有玩家為人類（多人模式）
  for (const p of state.players) {
    p.isAi = false;
  }
  state.aiPlayerIds = [];

  return { state };
}

// 建立對戰控制器
// 管理單一對戰的同步選牌流程
function createMatchController(state, options = {}) {
  const playerIds = state.players.map((p) => p.id);
  const onStateChange = options.onStateChange || null; // (state) => void
  const onRoundComplete = options.onRoundComplete || null; // (state) => void
  const onMatchEnd = options.onMatchEnd || null; // (state, winnerId) => void

  // 記錄每位玩家是否已提交本回合選牌
  const submitted = new Set();

  // 記錄斷線玩家（等待重連）
  const disconnected = new Set();

  // 記錄玩家 socket 對應（socketId -> playerId）
  const socketToPlayer = new Map();

  function emitState() {
    if (onStateChange) onStateChange(state);
  }

  // 綁定 socket 到玩家（用於斷線重連）
  function bindSocket(socketId, playerId) {
    socketToPlayer.set(socketId, playerId);
    // 若該玩家之前斷線，重連後移除斷線標記
    disconnected.delete(playerId);
  }

  // 玩家提交選牌
  // 回傳 { ok, reason, allSubmitted }
  function submitSelection(playerId, selections) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, reason: "PLAYER_NOT_FOUND" };
    if (player.isEliminated) return { ok: false, reason: "PLAYER_ELIMINATED" };

    gameEngine.submitSelection(state, playerId, selections);
    submitted.add(playerId);

    const allSubmitted = playerIds.every(
      (id) => submitted.has(id) || state.players.find((p) => p.id === id)?.isEliminated
    );

    emitState();
    return { ok: true, allSubmitted };
  }

  // 玩家設定朝向
  function setFacing(playerId, facing) {
    const result = gameEngine.setFacing(state, playerId, facing);
    emitState();
    return result;
  }

  // 玩家設定要棄的牌（手牌超過上限時）
  function setPendingDiscards(playerId, discards) {
    const result = gameEngine.setPendingDiscards(state, playerId, discards);
    emitState();
    return result;
  }


  // 結算回合（所有玩家已選完）
  // 回傳 { ok, winner }
  function resolveTurn() {
    // 為 AI 玩家自動選牌（若有多人模式混入 AI）
    const aiPlayerIds = state.aiPlayerIds || [];
    if (aiPlayerIds.length > 0) {
      autoSelectAiPlayers(state, { aiPlayerIds });
    }

    gameEngine.playOneTurn(state);
    submitted.clear();
    const events = gameEngine.takeEvents(state);

    if (onRoundComplete) onRoundComplete(state, events);

    // 檢查遊戲是否結束
    const alive = state.players.filter((p) => !p.isEliminated);
    if (alive.length <= 1) {
      const winnerId = alive.length === 1 ? alive[0].id : null;
      if (onMatchEnd) onMatchEnd(state, winnerId);
      emitState();
      return { ok: true, winner: winnerId, matchEnded: true };
    }

    emitState();
    return { ok: true, winner: null, matchEnded: false };
  }

  // 玩家斷線
  function onDisconnect(playerId) {
    disconnected.add(playerId);
    emitState();
  }

  // 玩家重連
  function onReconnect(playerId) {
    disconnected.delete(playerId);
    emitState();
  }

  // 取得玩家是否已提交
  function hasSubmitted(playerId) {
    return submitted.has(playerId);
  }

  // 取得所有已提交玩家
  function getSubmittedPlayerIds() {
    return [...submitted];
  }

  // 取得斷線玩家
  function getDisconnectedPlayerIds() {
    return [...disconnected];
  }

  // 取得玩家對應的 socketId
  function getSocketForPlayer(playerId) {
    for (const [socketId, pid] of socketToPlayer) {
      if (pid === playerId) return socketId;
    }
    return null;
  }

  // 取得玩家對應的 playerId
  function getPlayerIdForSocket(socketId) {
    return socketToPlayer.get(socketId) || null;
  }

  // 序列化狀態（供廣播）
  function serialize() {
    return {
      matchId: state.matchId,
      phase: state.phase,
      round: state.round,
      turn: state.turn,
      revealIndex: state.revealIndex,
      startingPlayerIndex: state.startingPlayerIndex,
      activePlayerIndex: state.activePlayerIndex,
      turnOrder: state.turnOrder,
      aiPlayerIds: state.aiPlayerIds || [],
      players: state.players.map((p) => ({
        id: p.id,
        characterId: p.characterId,
        characterName: p.characterName,
        role: p.role,
        tokenColor: p.tokenColor,
        hp: p.hp,
        maxHp: p.maxHp,
        mp: p.mp,
        maxMp: p.maxMp,
        hand: (p.hand || []).map(serializeCard),
        deckCount: Array.isArray(p.deck) ? p.deck.length : 0,
        discardCount: Array.isArray(p.discard) ? p.discard.length : 0,
        position: p.position,
        facing: p.facing,
        selectedCards: (p.selectedCards || []).map((item) => ({
          card: serializeCard(item.card),
          extra: item.extra || {},
        })),
        lastDefenseCard: p.lastDefenseCard,
        lastRevealedSubtype: p.lastRevealedSubtype || null,
        guardSubtype: p.guardSubtype || null,
        isEliminated: !!p.isEliminated,
        isAi: !!p.isAi,
        hasSubmitted: submitted.has(p.id),
        isDisconnected: disconnected.has(p.id),
      })),
      shop: {
        cards: (state.shop?.cards || []).map((card) => ({
          ...serializeCard(card),
          stock: card.stock,
        })),
        stockByCardId: state.shop?.stockByCardId || {},
      },
      stackCount: Array.isArray(state.stack) ? state.stack.length : 0,
      eliminatedPlayers: state.eliminatedPlayers || [],
      log: Array.isArray(state.log) ? [...state.log] : [],
    };
  }

  return {
    state,
    bindSocket,
    submitSelection,
    setFacing,
    setPendingDiscards,
    resolveTurn,
    onDisconnect,
    onReconnect,
    hasSubmitted,
    getSubmittedPlayerIds,
    getDisconnectedPlayerIds,
    getSocketForPlayer,
    getPlayerIdForSocket,
    serialize,
  };

}

function serializeCard(card) {
  if (!card) return null;
  return {
    id: card.id,
    instanceId: card.instanceId,
    definitionId: card.definitionId,
    name_zh: card.name_zh,
    alias_group: card.alias_group,
    group: card.group,
    type: card.type,
    subtype: card.subtype,
    mp_cost: card.mp_cost,
    buy_cost: card.buy_cost,
    range_min: card.range_min,
    range_max: card.range_max,
    damage: card.damage,
    block_value: card.block_value,
    hp_gain: card.hp_gain,
    mp_gain: card.mp_gain,
    draw_count: card.draw_count,
    move_min: card.move_min,
    move_max: card.move_max,
    stock: card.stock,
    persist_until_triggered: card.persist_until_triggered,
    keywords: card.keywords,
    target_rule: card.target_rule,
    description_template: card.description_template,
    enabled: card.enabled,
  };
}

module.exports = {
  createMatchFromRoom,
  createMatchController,
};
