// server/game/gameEngine.js

const { createInitialState } = require("./state/createInitialState");
const { resolveTurn } = require("./rules/turnEngine");
const { setFacingChange } = require("./rules/facingChangeResolver");

function createMatch(options = {}) {
  const state = createInitialState(options);
  return state;
}


// 提交本回合選牌（簡化版）
function submitSelection(state, playerId, selections) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error("player not found");
  player.selectedCards = selections; // [{card, extra}]
}

// 設定本回合最終朝向（免費轉向 1 次）
function setFacing(state, playerId, facing) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error("player not found");
  return setFacingChange(player, facing);
}

function playOneTurn(state) {
  resolveTurn(state);
}

module.exports = {
  createMatch,
  submitSelection,
  setFacing,
  playOneTurn,
};


