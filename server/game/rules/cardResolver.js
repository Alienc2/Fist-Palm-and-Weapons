// server/game/rules/cardResolver.js

const { isWithinRange } = require("./distance");
const { getFacingModifiers } = require("./facing");
const { getAdvantageModifiers } = require("./advantage");
const {
  declareTargetSet,
  validateDeclaredTargets,
  applyRetargetInstruction,
} = require("./targetingResolver");
const { buyFromShop } = require("./shopResolver");

function log(state, msg) {
  state.log.push(msg);
}

function getOpponent(state, attackerId) {
  return state.players.find((p) => p.id !== attackerId);
}

function resolveAttack(state, attacker, card, extra = {}) {
  let declaredTargetSet = declareTargetSet(state, attacker, card, extra);

  if (!declaredTargetSet.targets.length) {
    log(state, `${attacker.id} 使用 ${card.id}，但沒有合法目標`);
    return;
  }

  declaredTargetSet = applyRetargetInstruction(
    state,
    attacker,
    card,
    declaredTargetSet,
    extra
  );

  const validation = validateDeclaredTargets(
    state,
    attacker,
    card,
    declaredTargetSet
  );

  if (!validation.isValid) {
    log(state, `${attacker.id} 使用 ${card.id}，但目標已失效`);
    return;
  }

  attacker.lastRevealedSubtype = card.subtype || "unknown";

  for (const opponent of validation.legalTargets) {
    if (!isWithinRange(attacker.position, opponent.position, card.rangeMin, card.rangeMax)) {
      log(state, `${attacker.id} 使用 ${card.id} 指向 ${opponent.id}，但距離不符`);
      continue;
    }

    const facingMod = getFacingModifiers(attacker, opponent);
    const defenderSubtype = opponent.lastRevealedSubtype || "neutral";
    const advMod = getAdvantageModifiers(card.subtype, defenderSubtype);

    let damage = card.damage + facingMod.damage + advMod.damage;
    if (damage < 0) damage = 0;

    let block = 0;
    if (opponent.lastDefenseCard) {
      block = opponent.lastDefenseCard.blockValue || 0;
      log(state, `${opponent.id} 的防禦殘留生效，減少 ${block} 傷害`);
      opponent.lastDefenseCard = null;
    }

    const finalDamage = Math.max(damage - block, 0);

    opponent.hp -= finalDamage;
    opponent.lastDamageContext = {
      sourceCardId: card.id,
      sourceGroup: card.group || null,
      sourceType: card.type || null,
    };

    log(
      state,
      `${attacker.id} 使用 ${card.id} 命中 ${opponent.id}，造成 ${finalDamage} 傷害（${opponent.hp} HP）`
    );
  }
}

function resolveDefense(state, player, card) {
  // 將防禦殘留到回合結束或觸發一次
  player.lastDefenseCard = {
    id: card.id,
    blockValue: card.blockValue || 3,
  };
  player.lastRevealedSubtype = card.subtype || "any";
  player.guardSubtype = card.subtype || "any";
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

function resolveBuy(state, player, card, extra = {}) {
  player.lastRevealedSubtype = card.subtype || "shop";
  log(state, `${player.id} 使用 ${card.id} 進入商店`);

  if (!extra.shopCardId) {
    log(state, `${player.id} 未指定要購買的商店卡`);
    return;
  }

  buyFromShop(state, player, extra.shopCardId);
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