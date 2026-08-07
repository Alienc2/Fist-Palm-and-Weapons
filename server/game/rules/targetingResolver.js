// server/game/rules/targetingResolver.js

const { getAutoTargets } = require("./targetPriorityResolver");

function getEnemies(state, player) {
  return state.players.filter((p) => p.id !== player.id && !p.isEliminated);
}

function getDefaultEnemyTarget(state, player) {
  const enemies = getAutoTargets(state, player, state.players);
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

  const autoTargets = getAutoTargets(state, player, state.players);
  return autoTargets.length > 0 ? [autoTargets[0]] : [];
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
  declareTargetSet,
  hydrateDeclaredTargets,
  validateDeclaredTargets,
  applyRetargetInstruction,
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

function declareTargetSet(state, sourcePlayer, card, extra = {}) {
  const rawTargets = getTargets(state, sourcePlayer, card, extra);

  return {
    targeting: card.targeting || "single_enemy",
    requiredTargets: card.requiredTargets ?? 1,
    allowPartialResolution: card.allowPartialResolution ?? true,
    targets: rawTargets.map((target) => ({ id: target.id })),
  };
}

function hydrateDeclaredTargets(state, declaredTargetSet) {
  return declaredTargetSet.targets
    .map((targetRef) => state.players.find((p) => p.id === targetRef.id))
    .filter(Boolean);
}

function validateDeclaredTargets(state, sourcePlayer, card, declaredTargetSet) {
  const hydratedTargets = hydrateDeclaredTargets(state, declaredTargetSet);

  const legalTargets = hydratedTargets.filter((target) =>
    isTargetStillLegal(state, sourcePlayer, card, target)
  );

  const requiredTargets = declaredTargetSet.requiredTargets ?? 1;
  const allowPartialResolution = declaredTargetSet.allowPartialResolution ?? true;

  if (allowPartialResolution) {
    return {
      isValid: legalTargets.length > 0,
      legalTargets,
      invalidTargetIds: declaredTargetSet.targets
        .map((t) => t.id)
        .filter((id) => !legalTargets.some((target) => target.id === id)),
    };
  }

  return {
    isValid: legalTargets.length >= requiredTargets,
    legalTargets: legalTargets.length >= requiredTargets ? legalTargets : [],
    invalidTargetIds: declaredTargetSet.targets
      .map((t) => t.id)
      .filter((id) => !legalTargets.some((target) => target.id === id)),
  };
}

function applyRetargetInstruction(state, sourcePlayer, card, declaredTargetSet, extra = {}) {
  if (!extra.retargetInstruction?.toTargetId) {
    return declaredTargetSet;
  }

  const candidate = state.players.find(
    (p) => p.id === extra.retargetInstruction.toTargetId
  );

  if (!candidate) {
    return declaredTargetSet;
  }

  if (!isTargetStillLegal(state, sourcePlayer, card, candidate)) {
    return declaredTargetSet;
  }

  return {
    ...declaredTargetSet,
    targets: [{ id: candidate.id }],
  };
}