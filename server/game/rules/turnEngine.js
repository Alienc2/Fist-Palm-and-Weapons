// server/game/rules/turnEngine.js

const {
  resolveAttack,
  resolveDefense,
  resolveMove,
  resolveBuy,
  resolveRecover,
} = require("./cardResolver");

const { resolveEliminations } = require("./eliminationResolver");
const { applyFacingChange } = require("./facingChangeResolver");
const { resolveCombos, clearRoundEffects } = require("./comboResolver");
const {
  createStackItem,
  pushStackItem,
  resolveStack,
  findTopCounterableAttack,
} = require("./stackResolver");



function startRound(state) {
  state.phase = "ROUND_START";
  state.round += 1;
  state.revealIndex = 0;
}

// 洗牌（Fisher-Yates）
function shuffleArray(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 從牌庫抽牌；若牌庫不足，將棄牌堆洗回牌庫再抽
function drawCards(player, count, rng = Math.random, log = null) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      // 牌庫耗盡：將棄牌堆洗回牌庫
      if (player.discard.length === 0) break;
      player.deck = shuffleArray(player.discard, rng);
      player.discard = [];
      if (log) log(`${player.id} 牌庫耗盡，重洗棄牌堆（${player.deck.length} 張）`);
    }
    const card = player.deck.shift();
    card.zone = "hand";
    drawn.push(card);
  }
  return drawn;
}

function drawPhase(state) {
  state.phase = "DRAW_PHASE";
  for (const p of state.players) {
    // 抽2張；牌庫不足時自動重洗棄牌堆
    const drawn = drawCards(p, 2, state.rng || Math.random, (msg) => state.log.push(msg));
    p.hand.push(...drawn);
  }
}


// 手牌上限（預設 8）
const DEFAULT_HAND_LIMIT = 8;

// 棄牌至手牌上限。
// 若玩家有 pendingDiscards（UI 選擇要棄的牌），優先棄那些；
// 否則自動棄最左邊。
function discardToLimit(state) {
  state.phase = "DISCARD_TO_LIMIT";
  for (const p of state.players) {
    const limit = p.handLimit || DEFAULT_HAND_LIMIT;
    if (p.hand.length <= limit) {
      p.pendingDiscards = [];
      continue;
    }

    const excess = p.hand.length - limit;
    const pending = p.pendingDiscards || [];

    // 依 pendingDiscards 的 instanceId 找出要棄的牌
    const pendingIds = new Set(pending.map((c) => c.instanceId || c.id));
    const toDiscard = [];
    const remaining = [];

    for (const card of p.hand) {
      if (toDiscard.length < excess && pendingIds.has(card.instanceId || card.id)) {
        toDiscard.push(card);
      } else {
        remaining.push(card);
      }
    }

    // 若 pending 不足，自動補棄最左邊
    while (toDiscard.length < excess && remaining.length > 0) {
      toDiscard.push(remaining.shift());
    }

    p.hand = remaining;
    p.discard.push(...toDiscard);
    p.pendingDiscards = [];
  }
}


function endTurn(state) {
  state.phase = "END_TURN";
  // 清防禦殘留（未觸發亦清）
  for (const p of state.players) {
    p.lastDefenseCard = null;
    clearRoundEffects(p);
  }
}

function resolveTurn(state) {
  state.phase = "RESOLVE_TURN";

  // 依 turnOrder 取得本回合玩家順序（由 startingPlayerIndex 輪轉）
  const turnOrder = state.turnOrder || state.players.map((p) => p.id);
  const startIndex = state.startingPlayerIndex || 0;
  const orderedPlayers = [
    ...turnOrder.slice(startIndex),
    ...turnOrder.slice(0, startIndex),
  ]
    .map((id) => state.players.find((p) => p.id === id))
    .filter(Boolean);

  // 回合開始時套用每位玩家的免費轉向（若已設定）
  for (const p of state.players) {
    applyFacingChange(state, p);
  }

  // 偵測並套用每位玩家的 combo 效果
  for (const p of state.players) {
    resolveCombos(state, p, null);
  }

  const maxLen = Math.max(
    ...state.players.map((p) => p.selectedCards.length)
  );

  // 交錯揭牌：依玩家順序逐張揭示（跳過已淘汰玩家）
  for (let i = 0; i < maxLen; i++) {
    for (const player of orderedPlayers) {
      if (player.isEliminated) continue;
      const cardEntry = player.selectedCards[i];
      if (cardEntry) {
        resolveCardByType(state, player, cardEntry);
      }
    }
  }


  resolveStack(state, {
    log: (currentState, message) => currentState.log.push(message),
    resolveAttack,
  });

  resolveEliminations(state);
  endTurn(state);
  drawPhase(state);
  discardToLimit(state);
  startRound(state);
  }


function resolveCardByType(state, player, cardEntry) {
  if (!cardEntry || !cardEntry.card) {
    state.log.push(`${player.id} 選牌資料無效，跳過`);
    return;
  }

  const card = cardEntry.card;
  const extra = cardEntry.extra || {};

  if (!card.type) {
    state.log.push(`${player.id} 使用 ${card.id || "unknown_card"} 失敗：缺少 card.type`);
    return;
  }

  if (card.type === "attack") {
    const item = createStackItem(state, player, card, extra);
    pushStackItem(state, item);
  } else if (card.type === "counter") {
    const counterTarget = extra?.targetStackItemId
      ? { id: extra.targetStackItemId }
      : findTopCounterableAttack(state);

    const item = createStackItem(state, player, card, {
      ...extra,
      targetStackItemId: counterTarget?.id || null,
    });
    pushStackItem(state, item);
  } else if (card.type === "defense") {
    resolveDefense(state, player, card, extra);
  } else if (card.type === "move") {
    resolveMove(state, player, card, extra);
  } else if (card.type === "buy") {
    resolveBuy(state, player, card, extra);
  } else if (card.type === "recover") {
    resolveRecover(state, player, card, extra);
  } else {
    state.log.push(`${player.id} 使用 ${card.id || "unknown_card"} 失敗：未知 card.type = ${card.type}`);
  }
}


module.exports = {
  resolveTurn,
  startRound,
  drawPhase,
  discardToLimit,
  endTurn,
  resolveCardByType,
};