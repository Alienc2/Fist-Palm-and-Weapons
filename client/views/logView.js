// client/views/logView.js
// 對戰紀錄顯示。
// I-02：顯示回合數、每位玩家手牌數，並將 log 中嘅卡牌 id 轉換為 name_zh。

import { el, clear, qs } from "../layout.js";

// T4：載入 combos.json，建立 combo id -> combo_name 對照表
let comboNameMap = null;
fetch("/generated/combos.json")
  .then((res) => (res.ok ? res.json() : []))
  .then((combos) => {
    comboNameMap = {};
    for (const c of combos || []) {
      if (c && c.id && c.combo_name) comboNameMap[c.id] = c.combo_name;
    }
  })
  .catch(() => {
    comboNameMap = {};
  });

// 將 log 訊息中出現嘅 combo id 替換為 combo_name（先替換最長 id，避開前綴碰撞）
function localizeComboNames(msg) {
  if (!comboNameMap) return msg;
  let result = msg;
  const ids = Object.keys(comboNameMap).sort((a, b) => b.length - a.length);
  for (const id of ids) {
    if (result.includes(id)) {
      result = result.split(id).join(comboNameMap[id]);
    }
  }
  return result;
}

// 從 state.players 收集所有卡牌，建立 id -> name_zh 對照表
function buildCardNameMap(state) {
  const map = {};
  for (const p of state.players || []) {
    const allCards = [
      ...(p.hand || []),
      ...(p.deck || []),
      ...(p.discard || []),
      ...(p.selectedCards || []),
    ];
    for (const card of allCards) {
      if (card && card.id && card.name_zh) {
        map[card.id] = card.name_zh;
      }
    }
  }
  return map;
}

// 將 log 訊息中出現嘅卡牌 id 替換為 name_zh
function localizeCardNames(msg, nameMap) {
  let result = msg;
  for (const [id, nameZh] of Object.entries(nameMap)) {
    if (id && nameZh && result.includes(id)) {
      result = result.split(id).join(nameZh);
    }
  }
  return result;
}

export function renderLog(state) {
  const container = qs("#logView");
  clear(container);

  if (!state || !state.log || state.log.length === 0) {
    container.appendChild(el("p", { class: "muted-text", text: "尚無紀錄。" }));
    return;
  }

  // 回合數 + 每位玩家手牌數 header
  const header = el("div", { class: "log-header" });
  const round = state.round || 1;
  header.appendChild(el("span", { class: "log-round", text: `回合 ${round}` }));
  for (const p of state.players || []) {
    const handCount = (p.hand || []).length;
    header.appendChild(
      el("span", { class: "log-player-count", text: `${p.id} 手牌 ${handCount}` })
    );
  }
  container.appendChild(header);

  const nameMap = buildCardNameMap(state);
  const list = el("div", { class: "log-list-inner" });
  for (const msg of state.log) {
    list.appendChild(el("div", { class: "log-entry", text: localizeComboNames(localizeCardNames(msg, nameMap)) }));
  }
  container.appendChild(list);

  // 自動捲到底部
  container.scrollTop = container.scrollHeight;
}


