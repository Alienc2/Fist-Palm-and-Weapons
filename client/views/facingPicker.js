// client/views/facingPicker.js
// DEPRECATED：朝向選擇已改為「本回合選牌」面板內 5 個按鍵（見 selectedCardsView.js），
// 此 modal 不再由主流程引用，保留作 legacy reference（按專案慣例唔刪檔）。
// 選擇 up / down / left / right / none。

import { el, openModal, closeModal, button } from "../layout.js";

const FACING_OPTIONS = [
  { value: "up", label: "上 ▲" },
  { value: "down", label: "下 ▼" },
  { value: "left", label: "左 ◀" },
  { value: "right", label: "右 ▶" },
  { value: "none", label: "不轉向" },
];

export function openFacingPicker(playerId, onSelect) {
  const content = el("div", { class: "facing-picker" }, [
    el("p", { class: "muted-text", text: `為 ${playerId} 選擇本回合朝向：` }),
  ]);

  const grid = el("div", { class: "facing-grid" });
  for (const opt of FACING_OPTIONS) {
    grid.appendChild(
      button(opt.label, "facing-option", () => {
        onSelect(opt.value);
        closeModal();
      })
    );
  }
  content.appendChild(grid);

  openModal("設定朝向", content, [
    button("取消", "secondary-button", () => closeModal()),
  ]);
}
