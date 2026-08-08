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
import { playResolveAnimation } from "./views/resolveAnimation.js";
import { showResultOverlay } from "./views/resultOverlay.js";
import { handleCardSelection } from "./selectionFlow.js";
import { socketClient } from "./socketClient.js";
import { openLobby } from "./views/lobbyView.js";


// ---- 渲染 ----


function renderAll(state) {
  renderBoard(state);
  renderHand(state);
  renderSelectedCards(state);
  renderLog(state);
  renderPlayerStatus(state);
  renderMatchMeta(state);
  updateControls(state);
  updateActivePlayerSelect(state);
}

// 更新「目前操作玩家」下拉選單（只列人類玩家）
function updateActivePlayerSelect(state) {
  const select = qs("#activePlayerSelect");
  if (!select) return;

  if (!state) {
    select.disabled = true;
    select.innerHTML = "";
    const opt = el("option", { value: "P1", text: "P1" });
    select.appendChild(opt);
    return;
  }

  const humanPlayers = state.players.filter((p) => !p.isAi);
  if (humanPlayers.length <= 1) {
    select.disabled = true;
    select.innerHTML = "";
    const opt = el("option", { value: humanPlayers[0]?.id || "P1", text: humanPlayers[0]?.id || "P1" });
    select.appendChild(opt);
    return;
  }

  select.disabled = false;
  select.innerHTML = "";
  for (const p of humanPlayers) {
    const opt = el("option", { value: p.id, text: p.id });
    if (p.id === gameStore.activePlayerId) opt.selected = true;
    select.appendChild(opt);
  }
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

const CHARACTER_OPTIONS = [
  { value: "char_attack", label: "破軍（攻擊）" },
  { value: "char_defense", label: "玄武（防禦）" },
  { value: "char_move", label: "飛翎（移動）" },
  { value: "char_balanced", label: "無鋒（均衡）" },
];

// ---- 對戰設定：遊玩人數 / 電腦敵人 / 角色 ----

// 依遊玩人數動態產生角色下拉選單
function renderCharacterSelects() {
  const humanCount = Number(qs("#humanCount").value || 1);
  const container = qs("#characterSelects");
  clear(container);

  for (let i = 1; i <= humanCount; i++) {
    const row = el("div", { class: "field-row" }, [
      el("label", { class: "field-label", for: `p${i}Character`, text: `P${i} 角色` }),
    ]);
    const select = el("select", { id: `p${i}Character`, class: "field-control" });
    for (const opt of CHARACTER_OPTIONS) {
      const option = el("option", { value: opt.value, text: opt.label });
      if (i === 2 && opt.value === "char_defense") option.selected = true;
      select.appendChild(option);
    }
    row.appendChild(select);
    container.appendChild(row);
  }
}

// 依遊玩人數 / 電腦敵人建立對戰設定
function readMatchConfig() {
  const humanCount = Number(qs("#humanCount").value || 1);
  const aiCount = Number(qs("#aiCount").value || 0);

  const players = [];
  // 人類玩家
  for (let i = 1; i <= humanCount; i++) {
    const charSelect = qs(`#p${i}Character`);
    players.push({
      id: `P${i}`,
      position: { x: 1, y: 1 },
      characterId: charSelect ? charSelect.value : "char_attack",
      isHuman: true,
    });
  }
  // AI 玩家
  for (let i = 0; i < aiCount; i++) {
    const id = `P${humanCount + i + 1}`;
    players.push({
      id,
      position: { x: 3, y: 3 },
      characterId: "char_balanced",
      isHuman: false,
      aiProfileId: "ai_normal",
    });
  }

  return { players, humanCount, aiCount };
}


// ---- 事件 ----

function bindEvents() {
  // 遊玩人數改變時重新產生角色下拉選單
  qs("#humanCount").addEventListener("change", () => {
    renderCharacterSelects();
  });

  // 切換目前操作玩家
  qs("#activePlayerSelect").addEventListener("change", (event) => {
    gameStore.setActivePlayer(event.target.value);
  });

  qs("#startMatchButton").addEventListener("click", async () => {
    const config = readMatchConfig();
    try {
      await gameStore.createMatch(config);
    } catch (error) {
      alert(`開始對戰失敗：${error.message}`);
    }
  });


  qs("#newMatchButton").addEventListener("click", async () => {
    const config = readMatchConfig();
    try {
      await gameStore.createMatch(config);
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
          gameStore.createMatch(readMatchConfig());
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

  // 多人對戰大廳
  qs("#lobbyButton").addEventListener("click", () => {
    openLobby();
  });
}

// ---- 多人對戰：Socket.IO 事件 ----

// 監聽 server 廣播，更新 gameStore 狀態
function bindSocketEvents() {
  // 對戰開始：把 server 狀態載入 gameStore
  socketClient.on("match:start", (data) => {
    if (data && data.state) {
      gameStore.setState(data.state);
    }
  });

  // 對戰狀態更新（選牌 / 回合解析）
  socketClient.on("match:state", (state) => {
    if (state) {
      gameStore.setState(state);
    }
  });

  // 對戰結束
  socketClient.on("match:end", (data) => {
    const state = gameStore.state;
    if (state) {
      showResultOverlay(state, () => {
        gameStore.reset();
      });
    }
  });
}

// ---- 啟動 ----

function init() {
  renderCharacterSelects();
  bindEvents();
  gameStore.subscribe(renderAll);
  renderAll(null);

  // 建立 Socket.IO 連線（多人對戰）
  socketClient.connect();
  bindSocketEvents();
}


init();


