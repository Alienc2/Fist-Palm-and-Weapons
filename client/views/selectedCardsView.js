// client/views/selectedCardsView.js
// 本回合選牌顯示。可移除選牌、設定朝向。

import { el, clear, qs, cardNode, button } from "../layout.js";
import { gameStore } from "../gameStore.js";
import { openFacingPicker } from "./facingPicker.js";

export function renderSelectedCards(state) {
  const container = qs("#selectedCardsView");
  clear(container);

  if (!state) {
    container.appendChild(el("p", { class: "muted-text", text: "尚未選牌。" }));
    return;
  }

  const player = gameStore.getActivePlayer();
  if (!player) {
    container.appendChild(el("p", { class: "muted-text", text: "找不到目前玩家。" }));
    return;
  }

  const pending = gameStore.getPendingSelections(player.id);

  if (pending.length === 0) {
    container.appendChild(el("p", { class: "muted-text", text: "尚未選牌。" }));
  } else {
    const list = el("div", { class: "selected-list" });
    pending.forEach((item, index) => {
      const cardEl = cardNode(item.card, {
        selected: true,
        onClick: () => gameStore.removeSelection(player.id, index),
      });
      const removeBtn = button("移除", "mini-button", () =>
        gameStore.removeSelection(player.id, index)
      );
      cardEl.appendChild(removeBtn);
      list.appendChild(cardEl);
    });
    container.appendChild(list);
  }

  // 朝向設定
  const facingRow = el("div", { class: "facing-row" });
  const currentFacing = gameStore.getPendingFacing(player.id) || player.facing;
  facingRow.appendChild(
    el("span", { class: "facing-label", text: `朝向：${currentFacing}` })
  );
  facingRow.appendChild(
    button("設定朝向", "secondary-button", () => {
      openFacingPicker(player.id, (facing) => {
        gameStore.setPendingFacing(player.id, facing);
      });
    })
  );
  container.appendChild(facingRow);

  // 清空選牌
  if (pending.length > 0) {
    container.appendChild(
      button("清空選牌", "secondary-button", () => gameStore.clearSelections(player.id))
    );
  }
}
