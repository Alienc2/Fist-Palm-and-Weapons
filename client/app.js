// client/app.js
// Phase E 正式 UI 主程式。
// 負責：
//   1. 初始化 UI 事件
//   2. 訂閱 gameStore 狀態更新並重新渲染各 view
//   3. 處理選牌流程（攻擊選目標 / 移動選方向 / 購買開商店）
//   4. 結算回合（含動畫）

import { gameStore } from "./gameStore.js";
import { qs, el, clear, setText, button } from "./layout.js";
import { renderBoard } from "./views/boardView.js";
import { renderHand } from "./views/handView.js";
import { renderSelectedCards } from "./views/selectedCardsView.js";
import { renderLog } from "./views/logView.js";
import { openShopModal } from "./views/shopModal.js";
import { openTargetPicker } from "./views/targetPicker.js";
import { openFacingPicker } from "./views/facingPicker.js";
import { playResolveAnimation } from "./views/resolveAnimation.js";
import { showResultOverlay } from "./views/resultOverlay.js";

// ---- 選牌流程：依卡牌類型決定 extra ----

function handleCardSelection(playerId, card) {
  if (card.type === "attack") {
    openTargetPicker(playerId, card, (targetId) => {
      gameStore.addSelection(playerId, card, { preferredTargetId: targetId });
    });
    return;
  }

  if (card.type === "move") {
    openFacingPicker(playerId, (facing) => {
      const dxdy = facingToDxDy(facing);
      gameStore.addSelection(playerId, card, dxdy);
    });
    return;
  }

  if (card.type === "buy") {
    openShopModal(playerId, (shopCardId) => {
      gameStore.addSelection(playerId, card, { shopCardId });
    });
    return;
  }

  // defense / recover / counter：無需額外 extra
  gameStore.addSelection(playerId, card, {});
}

function facingToDxDy(facing) {
  switch (facing) {
    case "up":
      return { dx: 0, dy: -1 };
    case "down":
      return { dx: 0, dy: 1 };
    case "left":
      return { dx: -1, dy: 0 };
    case "right":
      return { dx: 1, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}

// ---- 渲染 ----

function renderAll(state) {
  renderBoard(state);
  renderHand(state);
  renderSelectedCards(state);
  renderLog(state);
  renderPlayerStatus(state);
  renderMatchMeta(state);
  updateControls(state);
}

function renderPlayerStatus(state) {
  const container = qs("#playerStatus");
  clear(container);

  if (!state) {
    container.appendChild(el("p", { class: "muted-text", text: "開始對戰後顯示玩家狀態。" }));
    return;
  }

  for (const p of state.players) {
    const row = el("div", { class: "player-status" }, [
      el("span", { class: "player-id", text: p.id }),
      el("span", { class: "player-char", text: p.characterName }),
      el("span", { class: "player-hp", text: `HP ${p.hp}/${p.maxHp}` }),
      el("span", { class: "player-mp", text: `MP ${p.mp}/${p.maxMp}` }),
      el("span", { class: "player-pos", text: `(${p.position.x},${p.position.y})` }),
      el("span", { class: "player-facing", text: `朝 ${p.facing}` }),
    ]);
    if (p.isEliminated) row.classList.add("is-eliminated");
    container.appendChild(row);
  }
}

function renderMatchMeta(state) {
  const meta = qs("#matchMeta");
  if (!state) {
    setText(meta, "尚未開始對戰");
    return;
  }
  setText(meta, `第 ${state.round} 回合 · 階段 ${state.phase}`);
}

function updateControls(state) {
  const playBtn = qs("#playTurnButton");
  const resetBtn = qs("#resetButton");
  const startBtn = qs("#startMatchButton");

  const hasMatch = !!state;
  playBtn.disabled = !hasMatch;
  resetBtn.disabled = !hasMatch;
  startBtn.disabled = hasMatch;
}

// ---- 事件 ----

function bindEvents() {
  qs("#startMatchButton").addEventListener("click", async () => {
    const p1 = qs("#p1Character").value;
    const p2 = qs("#p2Character").value;
    try {
      await gameStore.createMatch(p1, p2);
    } catch (error) {
      alert(`開始對戰失敗：${error.message}`);
    }
  });

  qs("#newMatchButton").addEventListener("click", async () => {
    const p1 = qs("#p1Character").value;
    const p2 = qs("#p2Character").value;
    try {
      await gameStore.createMatch(p1, p2);
    } catch (error) {
      alert(`新對戰失敗：${error.message}`);
    }
  });

  qs("#resetButton").addEventListener("click", async () => {
    await gameStore.reset();
  });

  qs("#playTurnButton").addEventListener("click", async () => {
    try {
      // 先送出所有暫存選牌與朝向
      await gameStore.commitAllSelections();
      // 播放結算動畫（用結算前狀態）
      const before = gameStore.state;
      await playResolveAnimation({
        round: before ? before.round : 1,
        players: before ? before.players : [],
      });
      // 執行結算
      const after = await gameStore.playTurn();
      // 檢查對戰是否結束
      const alive = after.players.filter((p) => !p.isEliminated);
      if (alive.length <= 1) {
        showResultOverlay(after, () => {
          const p1 = qs("#p1Character").value;
          const p2 = qs("#p2Character").value;
          gameStore.createMatch(p1, p2);
        });
      }
    } catch (error) {
      alert(`結算回合失敗：${error.message}`);
    }
  });

  qs("#themeToggle").addEventListener("click", () => {
    const html = document.documentElement;
    const next = html.dataset.theme === "dark" ? "light" : "dark";
    html.dataset.theme = next;
  });
}

// ---- 啟動 ----

function init() {
  bindEvents();
  gameStore.subscribe(renderAll);
  renderAll(null);
}

init();
