// client/views/shopModal.js
// 解封武功 modal。顯示可解封嘅武功卡牌與庫存，供玩家選擇解封。

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
      text: `${playerId} 目前 MP：${player ? player.mp : "?"}。選擇要解封的武功：`,
    }),
  ]);

  if (shopCards.length === 0) {
    content.appendChild(el("p", { class: "muted-text", text: "暫時沒有可解封的武功。" }));
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

  openModal("解封武功", content, [
    button("不購買", "secondary-button", () => closeModal()),
  ]);
}



