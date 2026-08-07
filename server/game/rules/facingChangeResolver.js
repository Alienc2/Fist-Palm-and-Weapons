// server/game/rules/facingChangeResolver.js
// 轉向規則：每回合每位玩家即使不移動，也可以免費轉向 1 次。
// 轉向視為獨立回合輸入，必須在 Ready 前確認。

const { getFreeFacingChangeCount } = require("./passiveResolver");

const VALID_FACINGS = ["up", "down", "left", "right"];


function isValidFacing(facing) {
  return VALID_FACINGS.includes(facing);
}

// 設定玩家本回合的最終朝向。
// facingChange 可為 "none"（不轉向）或 up / down / left / right。
function setFacingChange(player, facingChange) {
  if (facingChange === undefined || facingChange === null || facingChange === "none") {
    player.facingChange = "none";
    return { ok: true, facing: player.facing };
  }

  if (!isValidFacing(facingChange)) {
    return { ok: false, reason: "INVALID_FACING", facing: player.facing };
  }

  player.facingChange = facingChange;
  return { ok: true, facing: facingChange };
}

// 在回合解析開始時套用轉向。
// 若玩家有移動，移動完成後會再套用最終朝向（由 resolveMove 處理）。
function applyFacingChange(state, player) {
  const facingChange = player.facingChange || "none";

  if (facingChange === "none") {
    return { changed: false, facing: player.facing };
  }

  if (!isValidFacing(facingChange)) {
    return { changed: false, facing: player.facing };
  }

  const before = player.facing;
  player.facing = facingChange;
  player.facingChange = "none";

  // 若玩家有 free_facing_change 被動，記錄免費轉向使用次數
  const freeCount = getFreeFacingChangeCount(player);
  if (freeCount > 0) {
    player.freeFacingChangeUsed = (player.freeFacingChangeUsed || 0) + 1;
  }

  state.log.push(`${player.id} 轉向 ${before} -> ${facingChange}`);
  return { changed: true, facing: facingChange };
}


module.exports = {
  VALID_FACINGS,
  isValidFacing,
  setFacingChange,
  applyFacingChange,
};
