// client/views/boardView.js
// 5×5 地圖 + 角色 token + 朝向。
// 顯示每位玩家的位置、朝向、HP/MP、角色名。
// I-02-H2 / I-02-H3：移動/攻擊卡喺棋盤高亮可選格並點擊選擇。

import { el, clear, qs, normalizeClientCard } from "../layout.js";
import { gameStore } from "../gameStore.js";


const BOARD_SIZE = 5;

const FACING_ARROW = {
  up: "▲",
  down: "▼",
  left: "◀",
  right: "▶",
};

// 曼哈頓距離
function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// 計算某格是否被其他玩家佔據
function isOccupied(state, x, y, excludeId) {
  return state.players.some(
    (p) =>
      p.id !== excludeId &&
      !p.isEliminated &&
      p.position &&
      p.position.x === x &&
      p.position.y === y
  );
}

// 計算移動卡可移動格（曼哈頓距離喺 moveMin~moveMax、未被佔據）
function getMoveTargets(state, player, card) {
  const c = normalizeClientCard(card);
  const targets = [];
  const moveMax = c.moveMax + (player.comboMoveBonus || 0);

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const dist = manhattan(player.position, { x, y });
      if (dist < c.moveMin || dist > moveMax) continue;

      if (isOccupied(state, x, y, player.id)) continue;
      targets.push({ x, y });
    }
  }
  return targets;
}

// I-02-H4：計算玩家喺本回合已選移動卡後嘅預測位置
// 前面已選嘅移動卡會累計位移，令後續攻擊卡嘅距離預覽用移動後位置
function getPredictedPosition(state, playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;
  let x = player.position.x;
  let y = player.position.y;
  const pending = gameStore.getPendingSelections(playerId);
  for (const item of pending) {
    if (item.card && item.card.type === "move") {
      x += Number(item.extra.dx) || 0;
      y += Number(item.extra.dy) || 0;
    }
  }
  return { x, y };
}

// 計算攻擊卡可攻擊敵人（距離喺 rangeMin~rangeMax）
// I-02-H4：考慮前面已選移動卡嘅效果，用移動後位置計算距離
function getAttackTargets(state, player, card) {
  const c = normalizeClientCard(card);
  const comboRangeBonus = player.comboRangeBonus || 0;
  const predicted = getPredictedPosition(state, player.id) || player.position;
  return state.players.filter(
    (p) =>
      p.id !== player.id &&
      !p.isEliminated &&
      p.position &&
      manhattan(predicted, p.position) >= c.rangeMin &&
      manhattan(predicted, p.position) <= c.rangeMax + comboRangeBonus
  );
}



const SLOT_COLORS = ["red", "blue", "green", "yellow"];

// 將 facing 值正常化為 up/down/left/right（FACING_ARROW key）
function normalizeFacing(facing) {
  if (FACING_ARROW[facing]) return facing;
  const keys = ["up", "down", "left", "right"];
  return keys.includes(String(facing).toLowerCase()) ? String(facing).toLowerCase() : "up";
}

// 依玩家槽 index 取得定色（P1 red / P2 blue / P3 green / P4 yellow）
function slotColor(occupant, state) {
  const index = state.players.indexOf(occupant);
  return SLOT_COLORS[index % SLOT_COLORS.length] || "gray";
}

// P0：token 渲染（角色名 + HP，無 MP / 朝向文字）。
// 朝向改由圖片 / fallback 三角形方向視覺呈現。
// 圖片 404 → 三角形 fallback（clip-path，依 facing 旋轉）+ 角色名 + HP，外框用槽色。
function renderToken(occupant, state) {
  const color = slotColor(occupant, state);
  const facing = normalizeFacing(occupant.facing);
  const charName = occupant.characterName || occupant.characterId || occupant.id || "";

  const src = `assets/tokens/token_${charName}_${color}_${facing}.png`;
  const container = el("div", {
    class: `board-token token-${color}${occupant.isEliminated ? " is-eliminated" : ""}`,
  }, [
    el("div", { class: "token-name", text: occupant.id }),
  ]);

  const img = el("img", {
    class: "token-img",
    src,
    alt: charName,
    dataset: { facing },
    onerror: () => {
      img.remove();
      const tri = el("div", {
        class: `token-fallback-triangle token-facing-${facing}`,
      });
      container.appendChild(
        el("div", { class: "token-fallback-body" }, [
          tri,
          el("div", { class: "token-char", text: charName }),
          el("div", {
            class: "token-hp",
            text: `HP ${occupant.hp}/${occupant.maxHp}`,
          }),
        ])
      );
    },
  });
  container.appendChild(img);

  return container;
}

export function renderBoard(state) {
  const container = qs("#boardView");
  clear(container);

  // I-02-H2/H3：選擇模式提示移到右邊「解封武功」下方
  const hintPanel = qs("#boardSelectionHintPanel");
  const hintBox = qs("#boardSelectionHint");
  if (hintPanel) hintPanel.hidden = true;
  if (hintBox) clear(hintBox);

  if (!state) {
    container.appendChild(el("p", { class: "muted-text", text: "開始對戰後顯示 5×5 棋盤。" }));
    return;
  }


  const selection = gameStore.getBoardSelection();
  const activePlayer = selection
    ? state.players.find((p) => p.id === selection.playerId)
    : null;

  // 預先計算可選格 / 可攻擊敵人
  let moveTargets = [];
  let attackTargets = [];
  if (selection && activePlayer) {
    if (selection.type === "move") {
      moveTargets = getMoveTargets(state, activePlayer, selection.card);
    } else if (selection.type === "attack") {
      attackTargets = getAttackTargets(state, activePlayer, selection.card);
    }
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

      // I-02-H2：移動模式高亮可移動格
      const isMoveTarget = moveTargets.some((t) => t.x === x && t.y === y);
      if (isMoveTarget) {
        cell.classList.add("is-move-target");
        cell.addEventListener("click", () => {
          const dx = x - activePlayer.position.x;
          const dy = y - activePlayer.position.y;
          gameStore.addSelection(activePlayer.id, selection.card, { dx, dy });
          gameStore.clearBoardSelection();
        });
      }

      // I-02-H3：攻擊模式高亮可攻擊敵人
      const isAttackTarget =
        occupant && attackTargets.some((t) => t.id === occupant.id);
      if (isAttackTarget) {
        cell.classList.add("is-attack-target");
        cell.addEventListener("click", () => {
          gameStore.addSelection(activePlayer.id, selection.card, {
            preferredTargetId: occupant.id,
          });
          gameStore.clearBoardSelection();
        });
      }

      if (occupant) {
        cell.appendChild(renderToken(occupant, state));
      } else {
        cell.appendChild(el("div", { class: "board-cell-coord", text: `${x},${y}` }));
      }

      grid.appendChild(cell);
    }
  }

  container.appendChild(grid);

  // I-02-H2/H3：選擇模式提示移到右邊「解封武功」下方
  if (selection && activePlayer && hintPanel && hintBox) {
    hintBox.appendChild(
      el("div", {
        class: "board-selection-hint",
        text:
          selection.type === "move"
            ? `${activePlayer.id}：點擊綠色格選擇移動目標（取消：點擊「清空選牌」）`
            : `${activePlayer.id}：點擊紅色敵人選擇攻擊目標（取消：點擊「清空選牌」）`,

      })
    );
    hintPanel.hidden = false;
  }
}


