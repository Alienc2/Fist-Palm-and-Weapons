// client/views/shopModal.js
// 商店 modal。顯示商店卡牌與庫存，供玩家選擇購買。

import { el, openModal, closeModal, button, cardNode } from "../layout.js";
import { gameStore } from "../gameStore.js";

export function openShopModal(playerId, onBuy) {
  const state = gameStore.state;
  if (!state) return;

  const player = state.players.find((p) => p.id === playerId);
  const shopCards = state.shop?.cards || [];

  const content = el("div", { class: "shop-modal" }, [
    el("p", {
      class: "muted-text",
      text: `${playerId} 目前 MP：${player ? player.mp : "?"}。選擇要購買的卡牌：`,
    }),
  ]);

  if (shopCards.length === 0) {
    content.appendChild(el("p", { class: "muted-text", text: "商店沒有卡牌。" }));
  } else {
    const grid = el("div", { class: "shop-grid" });
    for (const card of shopCards) {
      const stock = Number(card.stock) || 0;
      const disabled = stock <= 0;
      grid.appendChild(
        cardNode(card, {
          showStock: true,
          disabled,
          onClick: () => {
            if (disabled) return;
            onBuy(card.id);
            closeModal();
          },
        })
      );
    }
    content.appendChild(grid);
  }

  openModal("商店", content, [
    button("關閉", "secondary-button", () => closeModal()),
  ]);
}
