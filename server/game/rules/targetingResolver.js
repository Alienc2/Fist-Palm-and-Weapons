// server/game/rules/targetingResolver.js

function getEnemies(state, player) {
  return state.players.filter((p) => p.id !== player.id && !p.isEliminated);
}

function getDefaultEnemyTarget(state, player) {
  const enemies = getEnemies(state, player);
  return enemies.length > 0 ? [enemies[0]] : [];
}

function getSelfChosenEnemyTargets(state, player, extra = {}) {
  const enemies = getEnemies(state, player);
  if (enemies.length === 0) return [];

  if (extra.preferredTargetId) {
    const preferred = enemies.find((enemy) => enemy.id === extra.preferredTargetId);
    if (preferred) {
      return [preferred];
    }
  }

  return [enemies[0]];
}

function getTargets(state, player, card, extra = {}) {
  const targeting = card.targeting || "single_enemy";

  if (targeting === "single_enemy") {
    return getDefaultEnemyTarget(state, player);
  }

  if (targeting === "self_chosen_enemies") {
    return getSelfChosenEnemyTargets(state, player, extra);
  }

  if (targeting === "all_enemies") {
    return getAllEnemyTargets(state, player);
  }

  if (targeting === "adjacent_enemies") {
    return getAdjacentEnemyTargets(state, player);
  }

  if (targeting === "cross_enemies") {
    return getCrossEnemyTargets(state, player);
  }

  return getDefaultEnemyTarget(state, player);
}

module.exports = {
  getEnemies,
  getDefaultEnemyTarget,
  getSelfChosenEnemyTargets,
  getAllEnemyTargets,
  getAdjacentEnemyTargets,
  getCrossEnemyTargets,
  isTargetStillLegal,
  retargetDeclaredTargets,
  getTargets,
};

function isAdjacent(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx + dy === 1;
}

function isCrossAligned(a, b) {
  return a.x === b.x || a.y === b.y;
}

function getAllEnemyTargets(state, player) {
  return getEnemies(state, player);
}

function getAdjacentEnemyTargets(state, player) {
  return getEnemies(state, player).filter((enemy) =>
    isAdjacent(player.position, enemy.position)
  );
}

function getCrossEnemyTargets(state, player) {
  return getEnemies(state, player).filter((enemy) =>
    isCrossAligned(player.position, enemy.position)
  );
}

function isTargetStillLegal(state, sourcePlayer, card, target) {
  if (!target) return false;
  if (target.isEliminated) return false;

  const current = state.players.find((p) => p.id === target.id);
  if (!current) return false;
  if (current.isEliminated) return false;

  const targeting = card.targeting || "single_enemy";

  if (targeting === "single_enemy" || targeting === "self_chosen_enemies") {
    return current.id !== sourcePlayer.id;
  }

  if (targeting === "all_enemies") {
    return current.id !== sourcePlayer.id;
  }

  if (targeting === "adjacent_enemies") {
    return current.id !== sourcePlayer.id && isAdjacent(sourcePlayer.position, current.position);
  }

  if (targeting === "cross_enemies") {
    return current.id !== sourcePlayer.id && isCrossAligned(sourcePlayer.position, current.position);
  }

  return current.id !== sourcePlayer.id;
}

function retargetDeclaredTargets(state, sourcePlayer, card, declaredTargets, extra = {}) {
  if (!extra.retargetToId) {
    return declaredTargets;
  }

  const candidate = state.players.find(
    (p) => p.id === extra.retargetToId && !p.isEliminated
  );

  if (!candidate) {
    return declaredTargets;
  }

  if (!isTargetStillLegal(state, sourcePlayer, card, candidate)) {
    return declaredTargets;
  }

  return [candidate];
}

