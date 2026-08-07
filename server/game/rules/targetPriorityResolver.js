// server/game/rules/targetPriorityResolver.js
// 多目標自動規則：最近距離 → 最低 HP → 背面 → 座位 tie-breaker

const { manhattanDistance } = require("./distance");
const { relativeFacing } = require("./facing");

// 依規則排序候選目標（由高優先到低優先）
// 1. 距離（越近越優先）
// 2. HP（越低越優先）
// 3. 背面（背對 source 越優先）
// 4. 座位 tie-breaker（turnOrder index 越小越優先）
function sortTargetsByPriority(state, sourcePlayer, candidates) {
  const turnOrderIndex = new Map(
    (state.turnOrder || []).map((id, index) => [id, index])
  );

  return [...candidates].sort((a, b) => {
    const distA = manhattanDistance(sourcePlayer.position, a.position);
    const distB = manhattanDistance(sourcePlayer.position, b.position);
    if (distA !== distB) return distA - distB;

    if (a.hp !== b.hp) return a.hp - b.hp;

    const facingA = relativeFacing(sourcePlayer, a);
    const facingB = relativeFacing(sourcePlayer, b);
    const backScoreA = facingA === "back" ? 0 : 1;
    const backScoreB = facingB === "back" ? 0 : 1;
    if (backScoreA !== backScoreB) return backScoreA - backScoreB;

    const idxA = turnOrderIndex.has(a.id) ? turnOrderIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
    const idxB = turnOrderIndex.has(b.id) ? turnOrderIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
    return idxA - idxB;
  });
}

// 取得自動目標（排除自己與淘汰者，並依優先規則排序）
function getAutoTargets(state, sourcePlayer, candidates) {
  const enemies = candidates.filter(
    (p) => p.id !== sourcePlayer.id && !p.isEliminated
  );
  return sortTargetsByPriority(state, sourcePlayer, enemies);
}

module.exports = {
  sortTargetsByPriority,
  getAutoTargets,
};
