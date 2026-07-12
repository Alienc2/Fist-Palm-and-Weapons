// server/game/rules/turnEngine.js

const { resolveAttack, resolveDefense, resolveMove, resolveBuy } = require("./cardResolver");
const { resolveEliminations } = require("./eliminationResolver");

function startRound(state) {
  state.phase = "ROUND_START";
  state.round += 1;
  state.revealIndex = 0;
}

function drawPhase(state) {
  state.phase = "DRAW_PHASE";
  for (const p of state.players) {
    // 抽2張，簡化：如果 deck 不足就唔抽
    for (let i = 0; i < 2; i++) {
      if (p.deck.length === 0) break;
      const card = p.deck.shift();
      p.hand.push(card);
    }
  }
}

function discardToLimit(state) {
  state.phase = "DISCARD_TO_LIMIT";
  for (const p of state.players) {
    while (p.hand.length > 8) {
      // 簡化：自動棄最左邊（之後改 UI 讓玩家選）
      const card = p.hand.shift();
      p.discard.push(card);
    }
  }
}

function endTurn(state) {
  state.phase = "END_TURN";
  // 清防禦殘留（未觸發亦清）
  for (const p of state.players) {
    p.lastDefenseCard = null;
  }
}

function resolveTurn(state) {
  state.phase = "RESOLVE_TURN";
  const [p1, p2] = state.players;

  const maxLen = Math.max(p1.selectedCards.length, p2.selectedCards.length);
  for (let i = 0; i < maxLen; i++) {
    // 交錯揭牌
    const attackerFirst = state.startingPlayerIndex === 0 ? p1 : p2;
    const attackerSecond = attackerFirst === p1 ? p2 : p1;

    const firstCard = attackerFirst.selectedCards[i];
    if (firstCard) {
      resolveCardByType(state, attackerFirst, firstCard);
      resolveEliminations(state);
    }

    const secondCard = attackerSecond.selectedCards[i];
    if (secondCard) {
      resolveCardByType(state, attackerSecond, secondCard);
      resolveEliminations(state);
    }
  }

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

  if (card.type === "attack") {
    resolveAttack(state, player, card);
  } else if (card.type === "defense") {
    resolveDefense(state, player, card);
  } else if (card.type === "move") {
    resolveMove(state, player, card, extra.moveDecision || { dx: 0, dy: 0 });
  } else if (card.type === "buy") {
    resolveBuy(state, player, card, extra);
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