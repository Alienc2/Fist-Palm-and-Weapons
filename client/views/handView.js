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

  // I-02-H / P5：可壓縮扇形（中央錨點 + 邊界保護）。
  //   1. 先計可用寬度，依張數動態縮細卡牌與壓縮角度，確保左右唔越界。
  //   2. 卡牌數量多或窄視窗（手機）時用低角度扇形，保留橫向捲動作後備。
  const fan = el("div", { class: "hand-fan" });
  const count = player.hand.length;
  const viewportWidth = window.innerWidth || 1280;
  // 可用寬度：viewport 扣除左右 padding + safe-area，預留邊界保護
  const availableWidth = Math.max(240, viewportWidth - 48);

  // 卡寬隨畫面縮放（手機上細啲，避免過密）
  const baseWidth = Math.min(150, Math.max(84, availableWidth * 0.22));
  const overlap = Math.max(26, baseWidth * 0.35);
  const totalWidth = baseWidth + (count - 1) * (baseWidth - overlap);

  // 依可用寬度壓縮：卡牌縮細 + 角度收窄（多卡 / 窄視窗 → 低角度）
  const scale = Math.min(1, availableWidth / Math.max(totalWidth, 1));
  const maxAngle = 24; // 最大扇形角度（度）
  const spreadFactor = Math.max(0.35, Math.min(1, availableWidth / Math.max(totalWidth, 1)));
  const spreadAngle = maxAngle * spreadFactor;
  const step = count > 1 ? (spreadAngle * 2) / (count - 1) : 0;

  player.hand.forEach((card, index) => {
    const alreadySelected = pendingInstanceIds.has(card.instanceId || card.id);
    const angle = count > 1 ? -spreadAngle + step * index : 0;
    const cardEl = cardNode(card, {
      selected: alreadySelected,
      disabled: alreadySelected,
      onClick: () => {
        if (alreadySelected) return;
        handleCardSelection(player.id, card);
      },
    });
    cardEl.style.setProperty("--fan-angle", `${angle}deg`);
    cardEl.style.setProperty("--card-scale", scale);
    fan.appendChild(cardEl);
  });

  container.appendChild(fan);
}



