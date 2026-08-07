// client/views/handView.js
// 手牌顯示。點擊手牌加入本回合選牌。

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

  const list = el("div", { class: "hand-list" });

  for (const card of player.hand) {
    const alreadySelected = pendingInstanceIds.has(card.instanceId || card.id);
    list.appendChild(
      cardNode(card, {
        selected: alreadySelected,
        disabled: alreadySelected,
        onClick: () => {
          if (alreadySelected) return;
          handleCardSelection(player.id, card);
        },

      })
    );
  }

  container.appendChild(list);
}
