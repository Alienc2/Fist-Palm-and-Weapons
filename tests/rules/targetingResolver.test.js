// tests/rules/targetingResolver.test.js
// Phase I-02-E2：攻擊目標 bug 修正測試
// 驗證：
//   1. target_rule 正確映射到 targeting（single → single_enemy 等）
//   2. getDefaultEnemyTarget 尊重 extra.preferredTargetId（人類玩家選嘅目標）
//   3. 距離內攻擊可命中（resolveAttack 唔會誤報「距離不符」）

const {
  declareTargetSet,
  getTargets,
  getDefaultEnemyTarget,
} = require("../../server/game/rules/targetingResolver");
const { resolveAttack } = require("../../server/game/rules/cardResolver");
const cardLoader = require("../../shared/cardLoader");


function makePlayer(id, x, y, overrides = {}) {
  return {
    id,
    position: { x, y },
    hp: 10,
    maxHp: 10,
    mp: 5,
    maxMp: 5,
    isEliminated: false,
    lastRevealedSubtype: null,
    lastDefenseCard: null,
    comboDamageBonus: 0,
    comboRangeBonus: 0,
    ...overrides,
  };
}

function makeState(players) {
  return {
    players,
    turnOrder: players.map((p) => p.id),
    log: [],
  };
}

function makeAttackCard(overrides = {}) {
  return {
    id: "basic_punch_1",
    type: "attack",
    subtype: "punch",
    rangeMin: 1,
    rangeMax: 1,
    damage: 2,
    targetRule: "single",
    ...overrides,
  };
}

describe("target_rule → targeting 映射（cardLoader）", () => {
  test("basic 攻擊卡 targetRule=single → targeting=single_enemy", () => {
    const cards = cardLoader.loadCards();
    const punch = cards.find((c) => c.id === "basic_punch_1");
    expect(punch.targetRule).toBe("single");
    expect(punch.targeting).toBe("single_enemy");
  });

  test("所有 attack 卡都有 targeting 欄位", () => {
    const cards = cardLoader.loadCards().filter((c) => c.type === "attack");
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.targeting).toBeTruthy();
    }
  });

});


describe("getDefaultEnemyTarget 尊重 preferredTargetId", () => {
  test("有 preferredTargetId 時選指定目標", () => {
    const attacker = makePlayer("P1", 1, 1);
    const enemyA = makePlayer("P2", 3, 3);
    const enemyB = makePlayer("P3", 1, 3);
    const state = makeState([attacker, enemyA, enemyB]);

    const targets = getDefaultEnemyTarget(state, attacker, {
      preferredTargetId: "P3",
    });
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe("P3");
  });

  test("preferredTargetId 唔存在時用自動目標", () => {
    const attacker = makePlayer("P1", 1, 1);
    const enemyA = makePlayer("P2", 3, 3);
    const state = makeState([attacker, enemyA]);

    const targets = getDefaultEnemyTarget(state, attacker, {
      preferredTargetId: "P9",
    });
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe("P2");
  });
});

describe("resolveAttack 距離內命中", () => {
  test("距離 1 內拳卡命中，唔報距離不符", () => {
    const attacker = makePlayer("P1", 1, 1);
    const enemy = makePlayer("P2", 1, 2);
    const state = makeState([attacker, enemy]);

    const card = makeAttackCard({ rangeMin: 1, rangeMax: 1, damage: 2 });
    resolveAttack(state, attacker, card, { preferredTargetId: "P2" });

    expect(enemy.hp).toBe(8);
    expect(state.log.some((msg) => msg.includes("距離不符"))).toBe(false);
    expect(state.log.some((msg) => msg.includes("命中"))).toBe(true);
  });

  test("距離 2 內武器卡命中", () => {
    const attacker = makePlayer("P1", 1, 1);
    const enemy = makePlayer("P2", 1, 3);
    const state = makeState([attacker, enemy]);

    const card = makeAttackCard({
      rangeMin: 2,
      rangeMax: 2,
      damage: 1,
      targetRule: "single",
    });
    resolveAttack(state, attacker, card, { preferredTargetId: "P2" });

    expect(enemy.hp).toBe(9);
    expect(state.log.some((msg) => msg.includes("距離不符"))).toBe(false);
  });


  test("距離超出射程時報距離不符", () => {
    const attacker = makePlayer("P1", 1, 1);
    const enemy = makePlayer("P2", 3, 3);
    const state = makeState([attacker, enemy]);

    const card = makeAttackCard({ rangeMin: 1, rangeMax: 1, damage: 2 });
    resolveAttack(state, attacker, card, { preferredTargetId: "P2" });

    expect(enemy.hp).toBe(10);
    expect(state.log.some((msg) => msg.includes("距離不符"))).toBe(true);
  });
});
