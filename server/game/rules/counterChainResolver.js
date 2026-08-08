// server/game/rules/counterChainResolver.js
// 反擊連鎖完整規則（GAME_SPEC §16）：
// 1. 驗證反擊卡對來源距離是否有效。
// 2. 驗證是否可反彈該類攻擊。
// 3. 成功反擊後，攻擊方向反轉。
// 4. 每多 1 次有效反擊，當前傷害值 ×2。
// 5. 鏈終止時，由最終承受者吃下最後傷害。

const { isWithinRange } = require("./distance");
const { ADV_TABLE } = require("./advantage");

function log(state, msg) {
  state.log.push(msg);
}

// 計算反擊成功率（GAME_SPEC §16 / §23.3）
function getCounterSuccessRate(counterCard, incomingSubtype) {
  // 通用反擊（勢回如潮功）固定 80%
  if (counterCard.id === "shop_counter_1") {
    return 0.8;
  }

  const { strongAgainst, weakAgainst } = ADV_TABLE[counterCard.subtype] || {};

  // 反擊類型剋制攻擊類型：100%
  if (strongAgainst === incomingSubtype) {
    return 1.0;
  }
  // 反擊類型被攻擊類型剋制：60%
  if (weakAgainst === incomingSubtype) {
    return 0.6;
  }
  // 同類：80%
  return 0.8;
}


// 驗證反擊卡對來源距離是否有效
function isCounterRangeValid(counterCard, counterPlayer, sourcePlayer) {
  const rangeMin = Number(counterCard.rangeMin) || 1;
  const rangeMax = Number(counterCard.rangeMax) || 2;
  return isWithinRange(
    counterPlayer.position,
    sourcePlayer.position,
    rangeMin,
    rangeMax
  );
}

// 解析單次反擊。回傳 { reflected, damageToAttacker, successRate }。
function resolveCounter(state, defender, card, incomingDamage, incomingSubtype, attacker) {
  const successRate = getCounterSuccessRate(card, incomingSubtype);

  // 距離驗證：反擊卡必須在來源距離內
  if (attacker && !isCounterRangeValid(card, defender, attacker)) {
    const rangeMin = Number(card.rangeMin) || 1;
    const rangeMax = Number(card.rangeMax) || 2;
    log(
      state,
      `${defender.id} 使用 ${card.id} 反擊 ${attacker.id}，但距離不符（${rangeMin}-${rangeMax}）`
    );
    return { reflected: false, damageToAttacker: 0, successRate, rangeValid: false };
  }


  const roll = Math.random();
  if (roll > successRate) {
    log(
      state,
      `${defender.id} 反擊 ${card.id} 失敗（roll=${roll.toFixed(2)}>rate=${successRate}）`
    );
    return { reflected: false, damageToAttacker: 0, successRate, rangeValid: true };
  }

  const reflectedDamage = incomingDamage * 2;
  log(
    state,
    `${defender.id} 成功反擊 ${card.id}，反彈 ${reflectedDamage} 傷害`
  );
  return { reflected: true, damageToAttacker: reflectedDamage, successRate, rangeValid: true };
}

// 解析完整反擊連鎖。
// incomingAttack: { sourcePlayer, damage, subtype }
// counterCards: 依序要參與反擊的卡（由 stack 中 counter 卡依 LIFO 順序提供）
// 回傳最終承受者與最終傷害。
function resolveCounterChain(state, incomingAttack, counterCards) {
  let currentDamage = incomingAttack.damage;
  let currentReceiver = incomingAttack.sourcePlayer;
  let currentAttacker = incomingAttack.sourcePlayer;
  let chainCount = 0;

  for (const counter of counterCards) {
    const counterPlayer = state.players.find((p) => p.id === counter.sourcePlayerId);
    if (!counterPlayer) continue;

    const result = resolveCounter(
      state,
      counterPlayer,
      counter.card,
      currentDamage,
      incomingAttack.subtype,
      currentAttacker
    );

    if (!result.reflected) {
      // 反擊失敗或距離不符，鏈終止，由當前承受者吃下最後傷害
      break;
    }

    // 成功反擊：方向反轉，傷害 ×2
    chainCount += 1;
    currentDamage = result.damageToAttacker;
    currentReceiver = currentAttacker;
    currentAttacker = counterPlayer;
  }

  // 鏈終止，最終承受者吃下最後傷害
  if (currentDamage > 0 && currentReceiver) {
    currentReceiver.hp -= currentDamage;
    currentReceiver.lastDamageContext = {
      sourceCardId: "counter_chain",
      sourceGroup: "counter",
      sourceType: "counter",
    };
    log(
      state,
      `${currentReceiver.id} 承受反擊連鎖 ${currentDamage} 傷害（${currentReceiver.hp} HP）`
    );
  }

  return {
    chainCount,
    finalDamage: currentDamage,
    finalReceiverId: currentReceiver ? currentReceiver.id : null,
  };
}

module.exports = {
  getCounterSuccessRate,
  isCounterRangeValid,
  resolveCounter,
  resolveCounterChain,
};
