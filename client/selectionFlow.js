// client/selectionFlow.js
// 選牌流程共用邏輯：依卡牌類型決定 extra。
// 由 app.js 與 handView.js 共用，確保攻擊選目標 / 移動選方向 / 購買開解封武功一致。
// I-02-H2 / I-02-H3：移動/攻擊卡改為喺棋盤高亮選擇，取代 facingPicker / targetPicker。


import { gameStore } from "./gameStore.js";
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
    // I-02-H3：喺棋盤高亮可攻擊敵人，點擊敵人選擇目標
    gameStore.setBoardSelection({ type: "attack", card, playerId });
    return;
  }

  if (card.type === "move") {
    // I-02-H2：喺棋盤高亮可移動格，點擊地圖選擇移動目標
    gameStore.setBoardSelection({ type: "move", card, playerId });
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


