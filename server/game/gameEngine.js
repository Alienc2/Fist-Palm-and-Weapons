// server/game/gameEngine.js

const { createInitialState } = require("./state/createInitialState");
const { resolveTurn } = require("./rules/turnEngine");

function createMatch() {
  const state = createInitialState();
  return state;
}

// 提交本回合選牌（簡化版）
function submitSelection(state, playerId, selections) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error("player not found");
  player.selectedCards = selections; // [{card, extra}]
}

function playOneTurn(state) {
  resolveTurn(state);
}

module.exports = {
  createMatch,
  submitSelection,
  playOneTurn,
};