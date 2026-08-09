// client/views/handView.js
// 手牌顯示。I-02-H：扇形排列喺畫面下方，hover 升高，可點擊打出。

import { el, clear, qs, cardNode } from "../layout.js";
import { gameStore } from "../gameStore.js";
import { handleCardSelection } from "../selectionFlow.js";


export function renderHand(state) {
  const container = qs("#handView");
  clear(container);

  if (!state) {
    container.appendChild(el("p", { class: "muted-text", text: "開始對戰後顯示手牌。" }));
    return;
  }

  const player = gameStore.getActivePlayer();
  if (!player) {
    container.appendChild(el("p", { class: "muted-text", text: "找不到目前玩家。" }));
    return;
  }

  const pending = gameStore.getPendingSelections(player.id);
  const pendingInstanceIds = new Set(
    pending.map((item) => item.card.instanceId || item.card.id)
  );

  if (!player.hand || player.hand.length === 0) {
    container.appendChild(el("p", { class: "muted-text", text: "手牌為空。" }));
    return;
  }

  // I-02-H：扇形排列（每張牌依 index 旋轉角度，底部對齊）
  const fan = el("div", { class: "hand-fan" });
  const count = player.hand.length;
  const maxAngle = 30; // 最大扇形角度（度）
  const step = count > 1 ? (maxAngle * 2) / (count - 1) : 0;

  player.hand.forEach((card, index) => {
    const alreadySelected = pendingInstanceIds.has(card.instanceId || card.id);
    const angle = count > 1 ? -maxAngle + step * index : 0;
    const cardEl = cardNode(card, {
      selected: alreadySelected,
      disabled: alreadySelected,
      onClick: () => {
        if (alreadySelected) return;
        handleCardSelection(player.id, card);
      },
    });
    cardEl.style.setProperty("--fan-angle", `${angle}deg`);
    cardEl.style.setProperty("--fan-index", index);
    fan.appendChild(cardEl);
  });

  container.appendChild(fan);
}


