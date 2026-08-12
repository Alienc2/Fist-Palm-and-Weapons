// client/views/selectedCardsView.js
// 本回合選牌顯示。I-02-H：打出嘅牌按順序左至右喺上方列出。

import { el, clear, qs, cardNode, button } from "../layout.js";
import { gameStore } from "../gameStore.js";

// 朝向選擇：本回合內用 5 個按鍵即時設定（上▲ / 下▼ / 左◀ / 右▶ / 保持）
const FACING_OPTIONS = [
  { value: "up", label: "🔼" },
  { value: "down", label: "🔽" },
  { value: "left", label: "◀️" },
  { value: "right", label: "▶️" },
  { value: "none", label: "❌" },
];

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
    // I-02-H：水平排列，按順序左至右
    const list = el("div", { class: "selected-list" });
    pending.forEach((item, index) => {
      const cardEl = cardNode(item.card, {
        selected: true,
        compact: true,
        onClick: () => gameStore.removeSelection(player.id, index),
      });
      list.appendChild(cardEl);
    });
    container.appendChild(list);
  }

  // 朝向設定：5 個按鍵即時 setPendingFacing，「保持」→ "none"
  const facingRow = el("div", { class: "facing-row" });
  const currentFacing = gameStore.getPendingFacing(player.id) || player.facing;
  facingRow.appendChild(
    el("span", { class: "facing-label", text: "面向：" })
  );
  for (const opt of FACING_OPTIONS) {
    const isActive = String(currentFacing) === String(opt.value);
    facingRow.appendChild(
      button(opt.label, `facing-option${isActive ? " is-active" : ""}`, () => {
        gameStore.setPendingFacing(player.id, opt.value);
      })
    );
  }
  container.appendChild(facingRow);

  // 清空選牌
  if (pending.length > 0) {
    container.appendChild(
      button("清空選牌", "secondary-button", () => gameStore.clearSelections(player.id))
    );
  }
}


