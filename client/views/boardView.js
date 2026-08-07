// client/views/boardView.js
// 5×5 地圖 + 角色 token + 朝向。
// 顯示每位玩家的位置、朝向、HP/MP、角色名。

import { el, clear, qs } from "../layout.js";

const BOARD_SIZE = 5;

const FACING_ARROW = {
  up: "▲",
  down: "▼",
  left: "◀",
  right: "▶",
};

export function renderBoard(state) {
  const container = qs("#boardView");
  clear(container);

  if (!state) {
    container.appendChild(el("p", { class: "muted-text", text: "開始對戰後顯示 5×5 棋盤。" }));
    return;
  }

  const grid = el("div", { class: "board-grid" });

  // 建立座標標籤（列 / 欄）
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = el("div", {
        class: "board-cell",
        dataset: { x, y },
      });

      // 找出此格上的玩家
      const occupant = state.players.find(
        (p) => p.position && p.position.x === x && p.position.y === y
      );

      if (occupant) {
        const token = el("div", {
          class: `board-token token-${occupant.tokenColor || "gray"}${
            occupant.isEliminated ? " is-eliminated" : ""
          }`,
        }, [
          el("div", { class: "token-name", text: occupant.id }),
          el("div", { class: "token-char", text: occupant.characterName || "" }),
          el("div", {
            class: "token-facing",
            text: FACING_ARROW[occupant.facing] || "?",
          }),
          el("div", { class: "token-hp", text: `HP ${occupant.hp}/${occupant.maxHp}` }),
          el("div", { class: "token-mp", text: `MP ${occupant.mp}/${occupant.maxMp}` }),
        ]);
        cell.appendChild(token);
      } else {
        cell.appendChild(el("div", { class: "board-cell-coord", text: `${x},${y}` }));
      }

      grid.appendChild(cell);
    }
  }

  container.appendChild(grid);
}
