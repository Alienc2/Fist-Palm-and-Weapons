// server/game/rules/eliminationResolver.js

const { isEdgePosition } = require("./distance");

function log(state, msg) {
  state.log.push(msg);
}

function getEliminationReason(player) {
  if (player.hp <= 0) {
    return "HP_ZERO";
  }

  if (
    isEdgePosition(player.position) &&
    player.hp < 3 &&
    player.lastDamageContext &&
    player.lastDamageContext.sourceGroup === "advanced"
  ) {
    return "EDGE_KO";
  }

  return null;
}

function eliminatePlayer(state, player, reason) {
  if (player.isEliminated) {
    return false;
  }

  player.isEliminated = true;

  if (reason === "HP_ZERO") {
    log(state, `${player.id} 因 HP 歸零而出場`);
  } else if (reason === "EDGE_KO") {
    log(state, `${player.id} 因邊緣擊出而出場`);
  } else {
    log(state, `${player.id} 出場`);
  }

  return true;
}

function resolveEliminations(state) {
  const eliminated = [];

  for (const player of state.players) {
    const reason = getEliminationReason(player);
    if (!reason) continue;

    const didEliminate = eliminatePlayer(state, player, reason);
    if (didEliminate) {
      eliminated.push({
        playerId: player.id,
        reason,
      });
    }
  }

  return eliminated;
}

module.exports = {
  getEliminationReason,
  eliminatePlayer,
  resolveEliminations,
};