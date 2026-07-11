// server/game/rules/cardResolver.js

const { isWithinRange, isEdgePosition } = require("./distance");
const { getFacingModifiers } = require("./facing");
const { getAdvantageModifiers } = require("./advantage");

function log(state, msg) {
  state.log.push(msg);
}

function getOpponent(state, attackerId) {
  return state.players.find((p) => p.id !== attackerId);
}

function resolveAttack(state, attacker, card) {
  const opponent = getOpponent(state, attacker.id);
  if (!opponent || opponent.isEliminated) return;

  if (!isWithinRange(attacker.position, opponent.position, card.rangeMin, card.rangeMax)) {
    log(state, `${attacker.id} 攻擊 ${card.id} 距離不符，失敗`);
    return;
  }

  const facingMod = getFacingModifiers(attacker, opponent);
  const defenderSubtype = opponent.lastRevealedSubtype || "neutral";
  const advMod = getAdvantageModifiers(card.subtype, defenderSubtype);

  let damage = card.damage + facingMod.damage + advMod.damage;
  if (damage < 0) damage = 0;

  // 防禦殘留
  let block = 0;
  if (opponent.lastDefenseCard) {
    block = opponent.lastDefenseCard.blockValue || 0;
    log(state, `${opponent.id} 防禦殘留觸發，阻擋 ${block} 傷害`);
    opponent.lastDefenseCard = null; // 用一次就清
  }

  const finalDamage = Math.max(damage - block, 0);
  opponent.hp -= finalDamage;
  attacker.lastRevealedSubtype = card.subtype || "unknown";
  log(state, `${attacker.id} 使用 ${card.id} 對 ${opponent.id} 造成 ${finalDamage} 傷害`);

  // 邊緣 + 進階攻擊擊出場外（簡化：當前卡有 advanced keyword）
  if (finalDamage > 0 && isEdgePosition(opponent.position) && opponent.hp < 3 && card.keywords.includes("advanced")) {
    // 簡化：100% 觸發，你之後改機率
    opponent.isEliminated = true;
    log(state, `${opponent.id} 在邊緣被進階攻擊擊出場外！`);
  }
}

function resolveDefense(state, player, card) {
  // 將防禦殘留到回合結束或觸發一次
  player.lastDefenseCard = {
    id: card.id,
    blockValue: card.blockValue || 3,
  };
  player.lastRevealedSubtype = card.subtype || "any";
  log(state, `${player.id} 使用防禦 ${card.id}，效果殘留至觸發或回合結束`);
}

function resolveMove(state, player, card, moveDecision) {
  const { dx, dy } = moveDecision; // {dx, dy}
  const steps = Math.abs(dx) + Math.abs(dy);
  if (steps < card.moveMin || steps > card.moveMax) {
    log(state, `${player.id} 移動 ${card.id} 步數不合法`);
    return;
  }
  player.position.x += dx;
  player.position.y += dy;
  player.lastRevealedSubtype = card.subtype || "step";
  log(state, `${player.id} 移動到 (${player.position.x},${player.position.y})`);
}

function resolveBuy(state, player, card) {
  // 暫時只 log，同扣 MP；真實商店之後再接 shopResolver
  player.lastRevealedSubtype = card.subtype || "shop";
  log(state, `${player.id} 使用 ${card.id} 進入商店（暫未實作購買邏輯）`);
}

function resolveCounter(state, defender, card, incomingDamage, incomingSubtype) {
  // 根據剋制關係決定成功率
  const { strongAgainst, weakAgainst } = require("./advantage").ADV_TABLE[card.subtype] || {};
  let successRate = 0.8; // 勢回如潮功通用 80% 可用 keywords 判斷

  if (card.id === "shop_counter_1") {
    successRate = 0.8;
  } else if (strongAgainst === incomingSubtype) {
    successRate = 1.0;
  } else if (weakAgainst === incomingSubtype) {
    successRate = 0.6;
  } else {
    successRate = 0.8;
  }

  const roll = Math.random();
  if (roll > successRate) {
    log(state, `${defender.id} 反擊 ${card.id} 失敗（roll=${roll.toFixed(2)}>rate=${successRate}）`);
    return { reflected: false, damageToAttacker: 0 };
  }

  const reflectedDamage = incomingDamage * 2; // 簡化：直接 X2，真正連鎖由 stack 處理
  log(state, `${defender.id} 成功反擊 ${card.id}，反彈 ${reflectedDamage} 傷害`);
  return { reflected: true, damageToAttacker: reflectedDamage };
}

module.exports = {
  resolveAttack,
  resolveDefense,
  resolveMove,
  resolveBuy,
  resolveCounter,
};