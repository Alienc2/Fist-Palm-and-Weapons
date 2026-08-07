// client/views/logView.js
// 對戰紀錄顯示。

import { el, clear, qs } from "../layout.js";

export function renderLog(state) {
  const container = qs("#logView");
  clear(container);

  if (!state || !state.log || state.log.length === 0) {
    container.appendChild(el("p", { class: "muted-text", text: "尚無紀錄。" }));
    return;
  }

  const list = el("div", { class: "log-list-inner" });
  for (const msg of state.log) {
    list.appendChild(el("div", { class: "log-entry", text: msg }));
  }
  container.appendChild(list);

  // 自動捲到底部
  container.scrollTop = container.scrollHeight;
}
