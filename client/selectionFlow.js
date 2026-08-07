// client/selectionFlow.js
// 選牌流程共用邏輯：依卡牌類型決定 extra。
// 由 app.js 與 handView.js 共用，確保攻擊選目標 / 移動選方向 / 購買開商店一致。

import { gameStore } from "./gameStore.js";
import { openTargetPicker } from "./views/targetPicker.js";
import { openFacingPicker } from "./views/facingPicker.js";
import { openShopModal } from "./views/shopModal.js";

export function facingToDxDy(facing) {
  switch (facing) {
    case "up":
      return { dx: 0, dy: -1 };
    case "down":
      return { dx: 0, dy: 1 };
    case "left":
      return { dx: -1, dy: 0 };
    case "right":
      return { dx: 1, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}

// 依卡牌類型決定 extra 並加入選牌
export function handleCardSelection(playerId, card) {
  if (card.type === "attack") {
    openTargetPicker(playerId, card, (targetId) => {
      gameStore.addSelection(playerId, card, { preferredTargetId: targetId });
    });
    return;
  }

  if (card.type === "move") {
    openFacingPicker(playerId, (facing) => {
      const dxdy = facingToDxDy(facing);
      gameStore.addSelection(playerId, card, dxdy);
    });
    return;
  }

  if (card.type === "buy") {
    openShopModal(playerId, (shopCardId) => {
      gameStore.addSelection(playerId, card, { shopCardId });
    });
    return;
  }

  // defense / recover / counter：無需額外 extra
  gameStore.addSelection(playerId, card, {});
}
