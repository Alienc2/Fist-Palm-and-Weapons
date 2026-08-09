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
  getLineEnemyTargets,
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

describe("getLineEnemyTargets（combo_line_attack 多目標直線）", () => {
  test("回傳同 attacker 成直線嘅全部敵人", () => {
    const attacker = makePlayer("P1", 1, 1);
    const enemyA = makePlayer("P2", 1, 3); // 同 x
    const enemyB = makePlayer("P3", 3, 1); // 同 y
    const enemyC = makePlayer("P4", 3, 3); // 斜線，唔係直線
    const state = makeState([attacker, enemyA, enemyB, enemyC]);

    const targets = getLineEnemyTargets(state, attacker);
    expect(targets).toHaveLength(2);
    expect(targets.map((t) => t.id).sort()).toEqual(["P2", "P3"]);
  });

  test("line_enemies targeting 透過 getTargets 回傳直線敵人", () => {
    const attacker = makePlayer("P1", 1, 1);
    const enemyA = makePlayer("P2", 1, 3);
    const enemyB = makePlayer("P3", 3, 3);
    const state = makeState([attacker, enemyA, enemyB]);

    const card = makeAttackCard({ targeting: "line_enemies" });
    const targets = getTargets(state, attacker, card);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe("P2");
  });

  test("line_enemies 目標宣告（declareTargetSet）回傳完整直線目標", () => {
    const attacker = makePlayer("P1", 1, 1);
    const enemyA = makePlayer("P2", 1, 3);
    const enemyB = makePlayer("P3", 3, 1);
    const state = makeState([attacker, enemyA, enemyB]);

    const card = makeAttackCard({ targeting: "line_enemies" });
    const declared = declareTargetSet(state, attacker, card);
    expect(declared.targets).toHaveLength(2);
    expect(declared.targets.map((t) => t.id).sort()).toEqual(["P2", "P3"]);
  });
});

describe("facingMod 影響防禦力", () => {
  test("正面受到攻擊時防禦力 +1（block 增加）", () => {
    const attacker = makePlayer("P1", 1, 1, { facing: "up" });
    const enemy = makePlayer("P2", 1, 0, {
      lastDefenseCard: { id: "def", blockValue: 3 },
    });
    const state = makeState([attacker, enemy]);

    const card = makeAttackCard({ rangeMin: 1, rangeMax: 1, damage: 5 });
    resolveAttack(state, attacker, card, { preferredTargetId: "P2" });

    // 正面：block = 3 + 1 = 4，傷害 5 - 4 = 1
    expect(enemy.hp).toBe(9);
    expect(state.log.some((msg) => msg.includes("防禦殘留生效，減少 4 傷害"))).toBe(true);
  });

  test("背面受到攻擊時防禦力 −1（block 減少）", () => {
    const attacker = makePlayer("P1", 1, 1, { facing: "up" });
    const enemy = makePlayer("P2", 1, 2, {
      lastDefenseCard: { id: "def", blockValue: 3 },
    });
    const state = makeState([attacker, enemy]);

    const card = makeAttackCard({ rangeMin: 1, rangeMax: 1, damage: 5 });
    resolveAttack(state, attacker, card, { preferredTargetId: "P2" });

    // 背面：block = 3 - 1 = 2，傷害 5 - 2 = 3
    expect(enemy.hp).toBe(7);
    expect(state.log.some((msg) => msg.includes("防禦殘留生效，減少 2 傷害"))).toBe(true);
  });
});



