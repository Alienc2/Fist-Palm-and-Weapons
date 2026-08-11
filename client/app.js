// client/app.js
// Phase E 正式 UI 主程式。
// 負責：
//   1. 初始化 UI 事件
//   2. 訂閱 gameStore 狀態更新並重新渲染各 view
//   3. 處理選牌流程（攻擊選目標 / 移動選方向 / 購買開解封武功）

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
import { openDiscardPicker } from "./views/discardPicker.js";
import { maybeShowTutorial } from "./views/tutorialOverlay.js";


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
  const setupPanel = qs("#matchSetupPanel");
  const logPanel = qs("#logPanel");

  const hasMatch = !!state;
  playBtn.disabled = !hasMatch;
  resetBtn.disabled = !hasMatch;
  startBtn.disabled = hasMatch;

  // 開始對戰後：隱藏「對戰設定」，顯示「對戰紀錄」（佔據原本位置，唔會浮空）
  if (setupPanel) {
    setupPanel.hidden = hasMatch;
  }
  if (logPanel) {
    logPanel.hidden = !hasMatch;
  }
}



const CHARACTER_OPTIONS = [
  { value: "char_attack", label: "破軍（攻擊）" },
  { value: "char_defense", label: "玄武（防禦）" },
  { value: "char_move", label: "飛翎（移動）" },
  { value: "char_balanced", label: "無鋒（均衡）" },
];

// 固定起始位置（依玩家 index 0-based 分配）
const FIXED_START_POSITIONS = [
  { x: 1, y: 1 }, // P1
  { x: 3, y: 3 }, // P2
  { x: 3, y: 1 }, // P3
  { x: 1, y: 3 }, // P4
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

// 同步「遊玩人數」與「電腦敵人」選項上限，令總對戰人數永遠 ≤ 4
// 例如 humanCount=4 時 aiCount 只能 0；aiCount=3 時 humanCount 只能 1
function syncPlayerCountLimits() {
  const humanSelect = qs("#humanCount");
  const aiSelect = qs("#aiCount");
  if (!humanSelect || !aiSelect) return;

  const humanCount = Number(humanSelect.value || 1);
  const aiCount = Number(aiSelect.value || 0);

  // 依目前 humanCount 調整 aiCount 上限
  const maxAi = 4 - humanCount;
  for (const opt of aiSelect.options) {
    opt.disabled = Number(opt.value) > maxAi;
  }
  if (aiCount > maxAi) {
    aiSelect.value = String(maxAi);
  }

  // 依目前 aiCount 調整 humanCount 上限
  const maxHuman = 4 - Number(aiSelect.value || 0);
  for (const opt of humanSelect.options) {
    opt.disabled = Number(opt.value) > maxHuman;
  }
  if (Number(humanSelect.value) > maxHuman) {
    humanSelect.value = String(maxHuman);
  }

  renderCharacterSelects();
}


// 依遊玩人數 / 電腦敵人建立對戰設定
function readMatchConfig() {
  const humanCount = Number(qs("#humanCount").value || 1);
  const aiCount = Number(qs("#aiCount").value || 0);

  // 總對戰人數限制：人類 + 電腦敵人唔可以超過 4 人
  if (humanCount + aiCount > 4) {
    throw new Error("總對戰人數不可超過 4 人（遊玩人數 + 電腦敵人）");
  }

  const players = [];

  // 人類玩家
  for (let i = 1; i <= humanCount; i++) {
    const charSelect = qs(`#p${i}Character`);
    players.push({
      id: `P${i}`,
      position: FIXED_START_POSITIONS[i - 1] || { x: 1, y: 1 },
      characterId: charSelect ? charSelect.value : "char_attack",
      isHuman: true,
    });
  }
  // AI 玩家
  for (let i = 0; i < aiCount; i++) {
    const id = `P${humanCount + i + 1}`;
    players.push({
      id,
      position: FIXED_START_POSITIONS[humanCount + i] || { x: 3, y: 3 },
      characterId: "char_balanced",
      isHuman: false,
      aiProfileId: "ai_normal",
    });
  }

  return { players, humanCount, aiCount };

}


// ---- 手牌上限棄牌流程（Phase I-02）----

// 依序處理每個人類玩家的手牌上限棄牌。
// AI 玩家不需 UI，server 會自動補棄。
async function handleDiscardPhase() {
  const state = gameStore.state;
  if (!state) return;

  const humanPlayers = state.players.filter((p) => !p.isAi);
  for (const player of humanPlayers) {
    const excess = gameStore.getDiscardExcess(player.id);
    if (excess <= 0) continue;
    // 等待玩家確認棄牌後才繼續下一位
    await new Promise((resolve) => {
      openDiscardPicker(player.id, () => resolve());
    });
  }
}

// ---- 事件 ----

function bindEvents() {
  // 遊玩人數 / 電腦敵人改變時同步選項上限（總人數 ≤ 4）並重新產生角色下拉選單
  qs("#humanCount").addEventListener("change", () => {
    syncPlayerCountLimits();
  });
  qs("#aiCount").addEventListener("change", () => {
    syncPlayerCountLimits();
  });


  // 切換目前操作玩家
  qs("#activePlayerSelect").addEventListener("change", (event) => {
    gameStore.setActivePlayer(event.target.value);
  });

  qs("#startMatchButton").addEventListener("click", async () => {
    try {
      const config = readMatchConfig();
      await gameStore.createMatch(config);
      maybeShowTutorial();
    } catch (error) {
      alert(`開始對戰失敗：${error.message}`);
    }
  });


  qs("#newMatchButton").addEventListener("click", async () => {
    try {
      const config = readMatchConfig();
      await gameStore.createMatch(config);
      maybeShowTutorial();
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
      // 依序處理每個人類玩家的手牌上限棄牌
      await handleDiscardPhase();
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
  syncPlayerCountLimits();
  bindEvents();
  gameStore.subscribe(renderAll);
  renderAll(null);


  // 建立 Socket.IO 連線（多人對戰）
  socketClient.connect();
  bindSocketEvents();
}


init();


