// client/views/resultOverlay.js
// 對戰結果 overlay。當有玩家被淘汰或對戰結束時顯示結果。

import { el, openModal, closeModal, button } from "../layout.js";

export function showResultOverlay(state, onNewMatch) {
  if (!state) return;

  const alive = state.players.filter((p) => !p.isEliminated);
  const eliminated = state.players.filter((p) => p.isEliminated);

  const content = el("div", { class: "result-overlay" }, [
    el("h3", { class: "result-title", text: "對戰結果" }),
  ]);

  if (alive.length === 1) {
    content.appendChild(
      el("p", { class: "result-winner", text: `勝利者：${alive[0].id}（${alive[0].characterName}）` })
    );
  } else if (alive.length === 0) {
    content.appendChild(el("p", { class: "result-winner", text: "雙方同歸於盡。" }));
  } else {
    content.appendChild(el("p", { class: "result-winner", text: "對戰仍在進行。" }));
  }

  const statusList = el("div", { class: "result-status" });
  for (const p of state.players) {
    statusList.appendChild(
      el("div", {
        class: `result-player${p.isEliminated ? " is-eliminated" : ""}`,
        text: `${p.id}（${p.characterName}）：HP ${p.hp}/${p.maxHp}${p.isEliminated ? " — 已淘汰" : ""}`,
      })
    );
  }
  content.appendChild(statusList);

  if (eliminated.length > 0) {
    content.appendChild(
      el("p", { class: "muted-text", text: `已淘汰：${eliminated.map((p) => p.id).join("、")}` })
    );
  }

  openModal("對戰結果", content, [
    button("新對戰", "primary-button", () => {
      closeModal();
      if (onNewMatch) onNewMatch();
    }),
    button("關閉", "secondary-button", () => closeModal()),
  ]);
}
