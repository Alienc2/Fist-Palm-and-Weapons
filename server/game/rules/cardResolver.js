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
const { getFrontDamageBonus, getFrontDefenseBonus } = require("./passiveResolver");
const { resolveCombos } = require("./comboResolver");


function log(state, msg) {
  state.log.push(msg);
}


function resolveAttack(state, attacker, card, extra = {}, incomingDeclaredTargetSet = null) {
  let declaredTargetSet =
    incomingDeclaredTargetSet || declareTargetSet(state, attacker, card, extra);

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

  // 揭牌時針對實際 target 偵測 board_pattern combo（方案 A）
  resolveCombos(state, attacker, validation.legalTargets[0]);

  // combo_line_attack：多目標直線攻擊，目標宣告層統一處理（targetingResolver line_enemies）
  let targets = validation.legalTargets;
  if (attacker.lineAttackActive) {
    const lineCard = { ...card, targeting: "line_enemies" };
    const lineDeclared = declareTargetSet(state, attacker, lineCard, extra);
    const lineValidation = validateDeclaredTargets(state, attacker, lineCard, lineDeclared);
    if (lineValidation.isValid && lineValidation.legalTargets.length >= 2) {
      targets = lineValidation.legalTargets;
      log(state, `${attacker.id} 觸發直線範圍攻擊，同時攻擊 ${targets.map((t) => t.id).join("、")}`);
    }
  }

  for (const opponent of targets) {

    const comboRangeBonus = attacker.comboRangeBonus || 0;
    if (
      !isWithinRange(
        attacker.position,
        opponent.position,
        card.rangeMin,
        card.rangeMax + comboRangeBonus
      )
    ) {
      log(state, `${attacker.id} 使用 ${card.id} 指向 ${opponent.id}，但距離不符`);
      continue;
    }

    const facingMod = getFacingModifiers(attacker, opponent);
    const defenderSubtype = opponent.lastRevealedSubtype || "neutral";
    const advMod = getAdvantageModifiers(card.subtype, defenderSubtype);

    const comboDamageBonus = attacker.comboDamageBonus || 0;

    const frontDamageBonus =
      facingMod.relation === "front" ? getFrontDamageBonus(attacker) : 0;
    // facingMod.damage 已移除：朝向改為影響防禦力計算，唔再影響傷害
    let damage =
      card.damage +
      advMod.damage +
      comboDamageBonus +
      frontDamageBonus;
    if (damage < 0) damage = 0;

    let block = 0;
    if (opponent.lastDefenseCard) {
      const frontDefenseBonus =
        facingMod.relation === "front" ? getFrontDefenseBonus(opponent) : 0;
      const guardUp = opponent.guardUp || 0;
      const defenseDown = opponent.defenseDown || 0;
      // facingMod.defense：正面受到攻擊防禦力 +1、背面受到攻擊防禦力 −1
      block =
        (opponent.lastDefenseCard.blockValue || 0) +
        frontDefenseBonus +
        facingMod.defense +
        guardUp -
        defenseDown;
      if (block < 0) block = 0;
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


function resolveDefense(state, player, card, extra = {}) {
  player.lastDefenseCard = {
    id: card.id,
    blockValue: card.blockValue || 3,
  };
  player.lastRevealedSubtype = card.subtype || "any";
  player.guardSubtype = card.subtype || "any";
  log(state, `${player.id} 使用防禦 ${card.id}，效果殘留至觸發或回合結束`);
}

function resolveMove(state, player, card, extra = {}) {
  const dx = Number(extra.dx);
  const dy = Number(extra.dy);

  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    log(state, `${player.id} 移動 ${card.id} 失敗：缺少 extra.dx / extra.dy`);
    return;
  }

  const steps = Math.abs(dx) + Math.abs(dy);
  // combo_move_3：移動距離 +1
  const moveMax = card.moveMax + (player.comboMoveBonus || 0);
  if (steps < card.moveMin || steps > moveMax) {
    log(state, `${player.id} 移動 ${card.id} 步數不合法`);
    return;
  }


  const targetX = player.position.x + dx;
  const targetY = player.position.y + dy;

  // 禁止移動到有玩家佔據嘅格（避免疊格，令距離 0 嘅攻擊失效）
  const occupied = state.players.some(
    (p) =>
      p.id !== player.id &&
      !p.isEliminated &&
      p.position.x === targetX &&
      p.position.y === targetY
  );
  if (occupied) {
    log(state, `${player.id} 移動 ${card.id} 失敗：目標格 (${targetX},${targetY}) 已被佔據`);
    return;
  }

  player.position.x = targetX;
  player.position.y = targetY;
  player.lastRevealedSubtype = card.subtype || "step";
  log(state, `${player.id} 移動到 (${player.position.x},${player.position.y})`);
}


function resolveBuy(state, player, card, extra = {}) {
  player.lastRevealedSubtype = card.subtype || "shop";
  log(state, `${player.id} 使用 ${card.id} 進入商店`);

  if (!extra || !extra.shopCardId) {
    log(state, `${player.id} 未指定要購買的商店卡`);
    return;
  }

  buyFromShop(state, player, extra.shopCardId);
}

function resolveRecover(state, player, card, extra = {}) {
  player.lastRevealedSubtype = card.subtype || "recover";

  const hpGain = Number(card.hpGain) || 0;
  const mpGain = Number(card.mpGain) || 0;
  const drawCount = Number(card.drawCount) || 0;

  if (hpGain > 0) {
    const before = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + hpGain);
    const actual = player.hp - before;
    log(state, `${player.id} 使用 ${card.id} 回復 ${actual} HP（${player.hp}/${player.maxHp} HP）`);
  }

  if (mpGain > 0) {
    const before = player.mp;
    player.mp = Math.min(player.maxMp, player.mp + mpGain);
    const actual = player.mp - before;
    log(state, `${player.id} 使用 ${card.id} 回復 ${actual} MP（${player.mp}/${player.maxMp} MP）`);
  }

  if (drawCount > 0) {
    let drawn = 0;
    for (let i = 0; i < drawCount; i++) {
      if (player.deck.length === 0) break;
      const cardDrawn = player.deck.shift();
      player.hand.push(cardDrawn);
      drawn += 1;
    }
    log(state, `${player.id} 使用 ${card.id} 抽 ${drawn} 張手牌`);
  }

  if (hpGain <= 0 && mpGain <= 0 && drawCount <= 0) {
    log(state, `${player.id} 使用 ${card.id}，但沒有可回復的效果`);
  }
}


function resolveCounter(state, defender, card, incomingDamage, incomingSubtype) {
  const { strongAgainst, weakAgainst } =
    require("./advantage").ADV_TABLE[card.subtype] || {};
  let successRate = 0.8;

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

  const reflectedDamage = incomingDamage * 2;
  log(state, `${defender.id} 成功反擊 ${card.id}，反彈 ${reflectedDamage} 傷害`);
  return { reflected: true, damageToAttacker: reflectedDamage };
}

module.exports = {
  resolveAttack,
  resolveDefense,
  resolveMove,
  resolveBuy,
  resolveRecover,
  resolveCounter,
};


