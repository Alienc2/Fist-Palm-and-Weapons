// server/game/rules/stackResolver.js

const {
  declareTargetSet,
} = require("./targetingResolver");
const { resolveCounterChain } = require("./counterChainResolver");


function ensureStack(state) {
  if (!state.stack) {
    state.stack = [];
  }
  if (state.nextStackItemId == null) {
    state.nextStackItemId = 1;
  }
}

function createStackItem(state, sourcePlayer, card, extra = {}) {
  ensureStack(state);

  const item = {
    id: `stack_${state.nextStackItemId++}`,
    kind: "card_play",
    sourcePlayerId: sourcePlayer.id,
    card,
    extra,
    declaredTargetSet:
      card.type === "attack"
        ? declareTargetSet(state, sourcePlayer, card, extra)
        : null,
    targetStackItemId: extra.targetStackItemId || null,
    isCountered: false,
  };

  return item;
}

function pushStackItem(state, item) {
  ensureStack(state);
  state.stack.push(item);
  return item;
}

function peekStack(state) {
  ensureStack(state);
  return state.stack[state.stack.length - 1] || null;
}

function findStackItemById(state, stackItemId) {
  ensureStack(state);
  return state.stack.find((item) => item.id === stackItemId) || null;
}

// 搵 stack 頂部可反擊嘅 attack（排除自己嘅 attack，counter 只可反擊其他玩家）
function findTopCounterableAttack(state, sourcePlayerId) {
  ensureStack(state);
  for (let i = state.stack.length - 1; i >= 0; i -= 1) {
    const item = state.stack[i];
    if (
      item.card?.type === "attack" &&
      !item.isCountered &&
      item.sourcePlayerId !== sourcePlayerId
    ) {
      return item;
    }
  }
  return null;
}

// 收集所有指向同一 attack 的 counter 卡（依 stack 由頂至底順序）
function collectCountersForAttack(state, targetItem) {
  ensureStack(state);
  const counters = [];
  for (let i = state.stack.length - 1; i >= 0; i -= 1) {
    const item = state.stack[i];
    if (item.card?.type !== "counter") continue;
    const itsTarget =
      (item.targetStackItemId && findStackItemById(state, item.targetStackItemId)) ||
      findTopCounterableAttack(state, item.sourcePlayerId);
    if (itsTarget && itsTarget.id === targetItem.id) {
      counters.push(item);
    }
  }
  return counters;
}


function resolveTopStackItem(state, { log, resolveAttack }) {
  ensureStack(state);
  const item = state.stack.pop();
  if (!item) return null;

  const sourcePlayer = state.players.find((p) => p.id === item.sourcePlayerId);
  if (!sourcePlayer) return item;

  if (item.card?.type === "counter") {
    const targetItem =
      (item.targetStackItemId && findStackItemById(state, item.targetStackItemId)) ||
      findTopCounterableAttack(state, item.sourcePlayerId);


    if (targetItem) {
      targetItem.isCountered = true;
      log(
        state,
        `${sourcePlayer.id} 使用 ${item.card.id} 反制 ${targetItem.card.id}`
      );

      // 收集所有指向同一 attack 的 counter，解析反擊連鎖
      const allCounters = [item, ...collectCountersForAttack(state, targetItem)];
      const targetSource = state.players.find((p) => p.id === targetItem.sourcePlayerId);

      if (targetSource) {
        const incomingAttack = {
          sourcePlayer: targetSource,
          damage: Number(targetItem.card.damage) || 0,
          subtype: targetItem.card.subtype || "unknown",
        };
        resolveCounterChain(state, incomingAttack, allCounters);
      }
    } else {
      log(state, `${sourcePlayer.id} 使用 ${item.card.id}，但沒有可反制目標`);
    }

    return item;
  }

  if (item.card?.type === "attack") {
    if (item.isCountered) {
      log(state, `${sourcePlayer.id} 使用 ${item.card.id} 被反制`);
      return item;
    }

    resolveAttack(state, sourcePlayer, item.card, item.extra, item.declaredTargetSet);
    return item;
  }

  return item;
}


function resolveStack(state, deps) {
  ensureStack(state);
  while (state.stack.length > 0) {
    resolveTopStackItem(state, deps);
  }
}

module.exports = {
  ensureStack,
  createStackItem,
  pushStackItem,
  peekStack,
  findStackItemById,
  findTopCounterableAttack,
  collectCountersForAttack,
  resolveTopStackItem,
  resolveStack,
};


