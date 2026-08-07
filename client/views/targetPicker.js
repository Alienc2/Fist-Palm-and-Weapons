// client/views/targetPicker.js
// 目標選擇器（modal）。當選取攻擊卡時，選擇要攻擊的目標玩家。

import { el, openModal, closeModal, button } from "../layout.js";
import { gameStore } from "../gameStore.js";

export function openTargetPicker(attackerId, card, onSelect) {
  const state = gameStore.state;
  if (!state) return;

  const attacker = state.players.find((p) => p.id === attackerId);
  const candidates = state.players.filter(
    (p) => p.id !== attackerId && !p.isEliminated
  );

  const content = el("div", { class: "target-picker" }, [
    el("p", { class: "muted-text", text: `選擇 ${card.name_zh || card.id} 的目標：` }),
  ]);

  if (candidates.length === 0) {
    content.appendChild(el("p", { class: "muted-text", text: "沒有可攻擊的目標。" }));
  } else {
    const list = el("div", { class: "target-list" });
    for (const target of candidates) {
      const distance = attacker
        ? Math.abs(attacker.position.x - target.position.x) +
          Math.abs(attacker.position.y - target.position.y)
        : "?";
      list.appendChild(
        button(
          `${target.id}（${target.characterName}）距離 ${distance} HP ${target.hp}`,
          "target-option",
          () => {
            onSelect(target.id);
            closeModal();
          }
        )
      );
    }
    content.appendChild(list);
  }

  openModal("選擇目標", content, [
    button("取消", "secondary-button", () => closeModal()),
  ]);
}
