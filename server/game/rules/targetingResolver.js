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

  return getDefaultEnemyTarget(state, player);
}

module.exports = {
  getEnemies,
  getDefaultEnemyTarget,
  getSelfChosenEnemyTargets,
  getTargets,
};