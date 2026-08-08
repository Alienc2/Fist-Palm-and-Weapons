// client/views/discardPicker.js
// 手牌上限棄牌選擇器（modal）。當玩家手牌超過上限時，選擇要棄哪些牌。
// 由 app.js 在「結算回合」流程中呼叫。

import { el, openModal, closeModal, button, cardNode } from "../layout.js";
import { gameStore } from "../gameStore.js";

// 開啟棄牌選擇 modal。
// playerId：要棄牌的玩家
// onConfirm：確認棄牌後的回呼（可選）
export function openDiscardPicker(playerId, onConfirm) {
  const state = gameStore.state;
  if (!state) return;

  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.hand) return;

  const limit = player.handLimit || 8;
  const excess = Math.max(0, player.hand.length - limit);
  if (excess <= 0) {
    // 無需棄牌，直接完成
    if (onConfirm) onConfirm([]);
    return;
  }

  // 已選要棄的牌（instanceId 集合）
  const selectedIds = new Set();

  const content = el("div", { class: "discard-picker" }, [
    el("p", {
      class: "muted-text",
      text: `${player.id} 手牌 ${player.hand.length}/${limit}，需棄 ${excess} 張。點擊要棄的牌：`,
    }),
  ]);

  const list = el("div", { class: "discard-list" });

  function renderCards() {
    clear(list);
    for (const card of player.hand) {
      const instanceId = card.instanceId || card.id;
      const isSelected = selectedIds.has(instanceId);
      list.appendChild(
        cardNode(card, {
          selected: isSelected,
          onClick: () => {
            if (selectedIds.has(instanceId)) {
              selectedIds.delete(instanceId);
            } else {
              if (selectedIds.size >= excess) return; // 已選足，不能再多選
              selectedIds.add(instanceId);
            }
            renderCards();
            updateConfirmButton();
          },
        })
      );
    }
  }

  const confirmBtn = button("確認棄牌", "primary-button", async () => {
    const discards = player.hand
      .filter((card) => selectedIds.has(card.instanceId || card.id))
      .map((card) => ({ instanceId: card.instanceId || card.id }));
    try {
      await gameStore.setPendingDiscards(playerId, discards);
      closeModal();
      if (onConfirm) onConfirm(discards);
    } catch (error) {
      alert(`棄牌失敗：${error.message}`);
    }
  }, true);

  function updateConfirmButton() {
    confirmBtn.disabled = selectedIds.size !== excess;
  }

  content.appendChild(list);
  content.appendChild(
    el("p", {
      class: "muted-text discard-hint",
      text: `已選 ${selectedIds.size}/${excess} 張`,
    })
  );

  renderCards();
  updateConfirmButton();

  openModal("棄牌到上限", content, [
    confirmBtn,
    button("取消", "secondary-button", () => closeModal()),
  ]);
}
