// server/game/rules/stackResolver.js

const {
  declareTargetSet,
} = require("./targetingResolver");

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

function findTopCounterableAttack(state) {
  ensureStack(state);
  for (let i = state.stack.length - 1; i >= 0; i -= 1) {
    const item = state.stack[i];
    if (item.card?.type === "attack" && !item.isCountered) {
      return item;
    }
  }
  return null;
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
      findTopCounterableAttack(state);

    if (targetItem) {
      targetItem.isCountered = true;
      log(
        state,
        `${sourcePlayer.id} 使用 ${item.card.id} 反制 ${targetItem.card.id}`
      );
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
  resolveTopStackItem,
  resolveStack,
};