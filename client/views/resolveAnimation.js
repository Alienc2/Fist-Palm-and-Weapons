// client/views/resolveAnimation.js
// 回合結算動畫（P2）。由 server 結構化事件流（state.events）驅動：
//   - reveal：咭牌由手牌區飛向棋盤中央
//   - move：token 滑行到新格
//   - attack：咭牌由攻擊者飛向目標 + 傷害 popup + token 動作
//   - defend / combo / counter / miss：token 動作動畫
// 所有事件順序執行，全部播完先出最終 HP/MP 摘要 overlay。

import { el, qs, show, hide } from "../layout.js";
import { getTokenEl, playTokenMove, playTokenAction } from "./boardView.js";

let animationRoot = null;
let layer = null;

function ensureRoot() {
  if (animationRoot) return animationRoot;
  animationRoot = el("div", { class: "resolve-animation", hidden: true });
  document.body.appendChild(animationRoot);
  return animationRoot;
}

// 飛卡／傷害 popup 專用固定層（pointer-events none，唔遮操作）
function ensureLayer() {
  if (layer) return layer;
  layer = el("div", { class: "anim-layer" });
  document.body.appendChild(layer);
  return layer;
}

function clearLayer() {
  if (!layer) return;
  while (layer.firstChild) layer.removeChild(layer.firstChild);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 由 cardId 產生簡短顯示名（取最後一段，去掉 id 前綴）
function label(cardId) {
  if (!cardId) return "?";
  const parts = String(cardId).split("_");
  const last = parts[parts.length - 1];
  return last || cardId;
}

function tokenCenter(playerId) {
  const el = getTokenEl(playerId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function boardCenter() {
  const board = qs("#boardView");
  if (!board) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = board.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function handOrigin() {
  return { x: window.innerWidth / 2, y: window.innerHeight - 30 };
}

// 由 from 位置飛到 to 位置（CSS transition 兩段），完成後移除。
function flyCard(from, to, text) {
  const root = ensureLayer();
  const card = el("div", { class: "anim-card", text });
  card.style.left = `${from.x}px`;
  card.style.top = `${from.y}px`;
  card.style.setProperty("--tx", `${to.x - from.x}px`);
  card.style.setProperty("--ty", `${to.y - from.y}px`);
  root.appendChild(card);

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.classList.add("is-flying");
      });
    });
    const onEnd = () => {
      card.removeEventListener("transitionend", onEnd);
      card.remove();
      resolve();
    };
    card.addEventListener("transitionend", onEnd);
  });
}

// 喺 target token 上顯示傷害 popup
function popDamage(playerId, text) {
  const center = tokenCenter(playerId);
  if (!center) return;
  const root = ensureLayer();
  const node = el("div", { class: "anim-damage", text });
  node.style.left = `${center.x}px`;
  node.style.top = `${center.y}px`;
  root.appendChild(node);
  setTimeout(() => node.remove(), 900);
}

async function handleEvent(ev) {
  if (!ev) return;
  switch (ev.type) {
    case "move":
      playTokenMove(ev.playerId, ev.from, ev.to);
      await sleep(380);
      break;
    case "reveal":
      await flyCard(handOrigin(), boardCenter(), label(ev.cardId));
      break;
    case "attack": {
      playTokenAction(ev.attackerId, "attack");
      playTokenAction(ev.targetId, ev.miss ? "miss" : "hit");
      const from = tokenCenter(ev.attackerId);
      const to = tokenCenter(ev.targetId);
      if (from && to) {
        await flyCard(from, to, label(ev.cardId));
      } else {
        await sleep(250);
      }
      if (!ev.miss && ev.finalDamage > 0) {
        popDamage(ev.targetId, `-${ev.finalDamage}`);
      }
      break;
    }
    case "defend":
      playTokenAction(ev.playerId, "defend");
      await sleep(350);
      break;
    case "combo":
      playTokenAction(ev.playerId, "combo");
      await sleep(450);
      break;
    case "counter":
      playTokenAction(ev.defenderId, "counter");
      await sleep(400);
      break;
    case "eliminate":
      playTokenAction(ev.playerId, "miss");
      await sleep(350);
      break;
    default:
      // round / regen / draw / buy / recover / facing
      await sleep(60);
  }
}

// 將事件流轉為逐行中文行動摘要（供結算 overlay 顯示）
function buildActionSummary(events, players) {
  if (!events || !events.length) return [];
  const name = (id) => {
    const p = (players || []).find((pl) => pl.id === id);
    return p && p.characterName ? p.characterName : id;
  };
  const lines = [];
  for (const ev of events) {
    if (!ev) continue;
    switch (ev.type) {
      case "attack":
        if (ev.miss) {
          lines.push(`${name(ev.attackerId)} 出【${label(ev.cardId)}】攻擊 ${name(ev.targetId)}，但落空`);
        } else {
          const block = ev.block > 0 ? `（格擋 ${ev.block}）` : "";
          lines.push(`${name(ev.attackerId)} 出【${label(ev.cardId)}】命中 ${name(ev.targetId)}，造成 ${ev.finalDamage} 傷害${block}`);
        }
        break;
      case "move":
        lines.push(`${name(ev.playerId)} 移動到 (${ev.to.x},${ev.to.y})`);
        break;
      case "defend":
        lines.push(`${name(ev.playerId)} 使用防禦【${label(ev.cardId)}】`);
        break;
      case "buy":
        lines.push(`${name(ev.playerId)} 解封武功【${label(ev.shopCardId)}】`);
        break;
      case "recover":
        lines.push(`${name(ev.playerId)} 回復`);
        break;
      case "combo":
        lines.push(`${name(ev.playerId)} 觸發 combo【${label(ev.comboId)}】`);
        break;
      case "counter":
        lines.push(`${name(ev.defenderId)} 反擊`);
        break;
      case "regen":
        lines.push(`${name(ev.playerId)} 回復 ${ev.amount} MP`);
        break;
      case "draw":
        lines.push(`${name(ev.playerId)} 抽 ${ev.count} 張`);
        break;
      case "eliminate":
        lines.push(`${name(ev.playerId)} 被淘汰`);
        break;
      default:
        // reveal / round / facing：噪音，唔列出
        break;
    }
  }
  return lines;
}

// 最終 HP/MP 摘要 overlay（保留原有結尾）
function showSummary(round, players, events = []) {
  const root = ensureRoot();
  show(root);
  clear(root);

  const title = el("div", { class: "resolve-title", text: `第 ${round} 回合結算` });
  const summary = el("div", { class: "resolve-summary" });

  const actionLines = buildActionSummary(events, players);
  if (actionLines.length) {
    const actions = el("div", { class: "resolve-actions" });
    actions.appendChild(el("div", { class: "resolve-actions-title", text: "本回合行動摘要" }));
    for (const line of actionLines) {
      actions.appendChild(el("div", { class: "resolve-action", text: line }));
    }
    summary.appendChild(actions);
  }

  for (const p of players) {
    summary.appendChild(
      el("div", { class: "resolve-player", text: `${p.id}：HP ${p.hp}/${p.maxHp}  MP ${p.mp}/${p.maxMp}` })
    );
  }

  root.append(title, summary);

  return new Promise((resolve) => {
    setTimeout(() => {
      hide(root);
      clear(root);
      resolve();
    }, 1200);
  });
}

// 播放完整結算動畫（Promise，完成後自動清理）
export async function playResolveAnimation({ round, players, events }) {
  const layerRoot = ensureLayer();
  clearLayer();

  if (events && events.length) {
    for (const ev of events) {
      await handleEvent(ev);
    }
  }

  clearLayer();
  await showSummary(round, players || [], events || []);
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
