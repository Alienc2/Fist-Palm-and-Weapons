// server/game/ai/aiMatch.js
// Phase F：AI 對戰 runner
// 負責把 AI decision 接入 gameEngine，自動為 AI 玩家填選牌並推進回合。
// 支援 AI vs AI、AI vs 人類（人類玩家由外部 submitSelection）。

const gameEngine = require("../gameEngine");
const { decideSelection } = require("./aiDecision");

// 判斷玩家是否為 AI 控制
function isAiPlayer(player, aiPlayerIds) {
  return aiPlayerIds.includes(player.id);
}

// 為所有 AI 玩家自動填選牌
// options:
//   - aiPlayerIds: 由 AI 控制的玩家 id 陣列
//   - profileByPlayerId: { [playerId]: profileId }
//   - rng: 隨機函式
//   - maxCards: 每回合最多出幾張牌
function autoSelectAiPlayers(state, options = {}) {
  const aiPlayerIds = options.aiPlayerIds || state.players.map((p) => p.id);
  const profileByPlayerId = options.profileByPlayerId || {};
  const rng = options.rng || Math.random;
  const maxCards = options.maxCards || 1;

  for (const player of state.players) {
    if (!isAiPlayer(player, aiPlayerIds)) continue;
    if (player.isEliminated) continue;

    const profileId = profileByPlayerId[player.id] || undefined;
    const selections = decideSelection(player, state.players, {
      profileId,
      rng,
      maxCards,
      shop: state.shop,
    });

    gameEngine.submitSelection(state, player.id, selections);
  }
}

// 執行一整個 AI 對戰，直到分出勝負或達到最大回合數
// options:
//   - players: 玩家設定（id / position / characterId / aiProfileId）
//   - maxRounds: 最大回合數（預設 20）
//   - rng: 隨機函式
//   - maxCards: 每回合最多出幾張牌
//   - onRound: 每回合結束後的回呼（可選）
function runAiMatch(options = {}) {
  const players = options.players || [
    { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack", aiProfileId: "ai_normal" },
    { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense", aiProfileId: "ai_normal" },
  ];
  const maxRounds = options.maxRounds || 20;
  const rng = options.rng || Math.random;
  const maxCards = options.maxCards || 1;
  const onRound = options.onRound || null;

  const aiPlayerIds = players
    .filter((p) => p.aiProfileId !== undefined && p.aiProfileId !== null)
    .map((p) => p.id);

  const profileByPlayerId = Object.fromEntries(
    players
      .filter((p) => p.aiProfileId)
      .map((p) => [p.id, p.aiProfileId])
  );

  const state = gameEngine.createMatch({
    players: players.map((p) => ({
      id: p.id,
      position: p.position,
      characterId: p.characterId,
    })),
  });

  const roundLog = [];

  for (let round = 1; round <= maxRounds; round++) {
    // 檢查是否已分出勝負
    const alive = state.players.filter((p) => !p.isEliminated);
    if (alive.length <= 1) break;

    autoSelectAiPlayers(state, {
      aiPlayerIds,
      profileByPlayerId,
      rng,
      maxCards,
    });

    gameEngine.playOneTurn(state);

    if (onRound) {
      onRound(state, round);
    }

    roundLog.push({
      round,
      players: state.players.map((p) => ({
        id: p.id,
        hp: p.hp,
        mp: p.mp,
        position: p.position,
        isEliminated: p.isEliminated,
      })),
    });
  }

  const alive = state.players.filter((p) => !p.isEliminated);
  const winner = alive.length === 1 ? alive[0].id : null;

  return {
    state,
    winner,
    rounds: roundLog.length,
    roundLog,
  };
}

module.exports = {
  isAiPlayer,
  autoSelectAiPlayers,
  runAiMatch,
};
