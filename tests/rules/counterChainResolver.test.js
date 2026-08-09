// tests/rules/counterChainResolver.test.js

const {
  getCounterSuccessRate,
  isCounterRangeValid,
  resolveCounter,
  resolveCounterChain,
} = require("../../server/game/rules/counterChainResolver");

function makePlayer(id, position, hp = 10, facing = "down") {
  return {
    id,
    position,
    hp,
    facing,
    lastDamageContext: null,
  };
}


function makeState(players) {
  return { players, log: [] };
}

describe("getCounterSuccessRate", () => {
  // 正面（defender 面向 attacker）：其他組合 100%
  const frontDefender = makePlayer("P2", { x: 1, y: 2 }, 10, "up");
  const attacker = makePlayer("P1", { x: 1, y: 1 }, 10, "down");

  test("shop_counter_1 固定 80%", () => {
    expect(getCounterSuccessRate({ id: "shop_counter_1", subtype: "any" }, "punch", frontDefender, attacker)).toBe(0.8);
  });

  test("正面反擊類型剋制攻擊類型時 100%", () => {
    // punch 剋 weapon
    expect(getCounterSuccessRate({ id: "c", subtype: "punch" }, "weapon", frontDefender, attacker)).toBe(1.0);
  });

  test("正面反擊類型被攻擊類型剋制時 100%（非側向）", () => {
    // punch 被 palm 剋，但正面非側向 → 100%
    expect(getCounterSuccessRate({ id: "c", subtype: "punch" }, "palm", frontDefender, attacker)).toBe(1.0);
  });

  test("正面同類時 100%", () => {
    expect(getCounterSuccessRate({ id: "c", subtype: "punch" }, "punch", frontDefender, attacker)).toBe(1.0);
  });

  test("正面無 subtype 時 100%", () => {
    expect(getCounterSuccessRate({ id: "c", subtype: "any" }, "punch", frontDefender, attacker)).toBe(1.0);
  });

  test("背向敵人正面任何攻擊：0%", () => {
    // defender 背向 attacker（facing down，attacker 喺上方）
    const backDefender = makePlayer("P2", { x: 1, y: 2 }, 10, "down");
    expect(getCounterSuccessRate({ id: "c", subtype: "punch" }, "weapon", backDefender, attacker)).toBe(0);
  });

  test("側向敵人被剋武功：0%", () => {
    // defender 側向 attacker（facing left，attacker 喺上方）
    const sideDefender = makePlayer("P2", { x: 1, y: 2 }, 10, "left");
    // punch 被 palm 剋
    expect(getCounterSuccessRate({ id: "c", subtype: "punch" }, "palm", sideDefender, attacker)).toBe(0);
  });

  test("側向敵人但非被剋武功：100%", () => {
    const sideDefender = makePlayer("P2", { x: 1, y: 2 }, 10, "left");
    // punch 剋 weapon，非被剋 → 100%
    expect(getCounterSuccessRate({ id: "c", subtype: "punch" }, "weapon", sideDefender, attacker)).toBe(1.0);
  });
});


describe("isCounterRangeValid", () => {
  test("距離在範圍內為合法", () => {
    const counterCard = { id: "c", rangeMin: 1, rangeMax: 2 };
    const counterPlayer = makePlayer("P2", { x: 1, y: 2 });
    const sourcePlayer = makePlayer("P1", { x: 1, y: 1 });
    expect(isCounterRangeValid(counterCard, counterPlayer, sourcePlayer)).toBe(true);
  });

  test("距離超出範圍為不合法", () => {
    const counterCard = { id: "c", rangeMin: 1, rangeMax: 2 };
    const counterPlayer = makePlayer("P2", { x: 3, y: 3 });
    const sourcePlayer = makePlayer("P1", { x: 1, y: 1 });
    expect(isCounterRangeValid(counterCard, counterPlayer, sourcePlayer)).toBe(false);
  });
});

describe("resolveCounter", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("距離不符時反擊失敗", () => {
    const state = makeState([]);
    const defender = makePlayer("P2", { x: 3, y: 3 });
    const attacker = makePlayer("P1", { x: 1, y: 1 });
    const card = { id: "c", subtype: "any", rangeMin: 1, rangeMax: 2 };

    const result = resolveCounter(state, defender, card, 2, "punch", attacker);

    expect(result.reflected).toBe(false);
    expect(result.rangeValid).toBe(false);
    expect(state.log.some((msg) => msg.includes("距離不符"))).toBe(true);
  });

  test("100% 成功率時必定反彈並 +1", () => {
    const state = makeState([]);
    // defender 面向 attacker（facing up，attacker 喺上方）→ 100%
    const defender = makePlayer("P2", { x: 1, y: 2 }, 10, "up");
    const attacker = makePlayer("P1", { x: 1, y: 1 });
    const card = { id: "c", subtype: "punch", rangeMin: 1, rangeMax: 2 };

    jest.spyOn(Math, "random").mockReturnValue(0.99);

    const result = resolveCounter(state, defender, card, 2, "weapon", attacker);

    expect(result.reflected).toBe(true);
    expect(result.damageToAttacker).toBe(3);
  });

  test("背向敵人時反擊失敗（0% 成功率）", () => {
    const state = makeState([]);
    // defender 背向 attacker（facing down，attacker 喺上方）→ 0%
    const defender = makePlayer("P2", { x: 1, y: 2 }, 10, "down");
    const attacker = makePlayer("P1", { x: 1, y: 1 });
    const card = { id: "c", subtype: "any", rangeMin: 1, rangeMax: 2 };

    jest.spyOn(Math, "random").mockReturnValue(0.99);

    const result = resolveCounter(state, defender, card, 2, "punch", attacker);

    expect(result.reflected).toBe(false);
    expect(result.damageToAttacker).toBe(0);
  });
});


describe("resolveCounterChain", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("單次成功反擊：傷害 +1 反彈給攻擊者", () => {
    const p1 = makePlayer("P1", { x: 1, y: 1 }, 10);
    // P2 面向 P1（facing up）→ 100% 成功率
    const p2 = makePlayer("P2", { x: 1, y: 2 }, 10, "up");
    const state = makeState([p1, p2]);

    jest.spyOn(Math, "random").mockReturnValue(0.1);

    const incomingAttack = { sourcePlayer: p1, damage: 2, subtype: "punch" };
    const counters = [
      { sourcePlayerId: "P2", card: { id: "c1", subtype: "any", rangeMin: 1, rangeMax: 2 } },
    ];

    const result = resolveCounterChain(state, incomingAttack, counters);

    expect(result.chainCount).toBe(1);
    expect(result.finalDamage).toBe(3);
    expect(result.finalReceiverId).toBe("P1");
    expect(p1.hp).toBe(7);
    expect(state.log.some((msg) => msg.includes("承受反擊連鎖 3 傷害"))).toBe(true);
  });

  test("雙重反擊連鎖：傷害 +1 再 +1", () => {
    const p1 = makePlayer("P1", { x: 1, y: 1 }, 20);
    // P2 面向 P1，P3 面向 P2 → 兩次都 100%
    const p2 = makePlayer("P2", { x: 1, y: 2 }, 20, "up");
    const p3 = makePlayer("P3", { x: 1, y: 3 }, 20, "up");
    const state = makeState([p1, p2, p3]);

    jest.spyOn(Math, "random").mockReturnValue(0.1);

    const incomingAttack = { sourcePlayer: p1, damage: 2, subtype: "punch" };
    const counters = [
      { sourcePlayerId: "P2", card: { id: "c1", subtype: "any", rangeMin: 1, rangeMax: 2 } },
      { sourcePlayerId: "P3", card: { id: "c2", subtype: "any", rangeMin: 1, rangeMax: 2 } },
    ];

    const result = resolveCounterChain(state, incomingAttack, counters);

    // P2 反擊 P1 (2→3)，P3 反擊 P2 (3→5)，最終 P2 承受 5
    expect(result.chainCount).toBe(2);
    expect(result.finalDamage).toBe(5);
    expect(result.finalReceiverId).toBe("P2");
    expect(p2.hp).toBe(15);
    expect(p1.hp).toBe(20);
  });

  test("反擊距離不符時鏈終止，由當前承受者吃下最後傷害", () => {
    const p1 = makePlayer("P1", { x: 1, y: 1 }, 10);
    // P2 面向 P1 → 第一次成功
    const p2 = makePlayer("P2", { x: 1, y: 2 }, 10, "up");
    // P3 距離外（(3,3) 距離 4 > 2）→ 第二次距離不符
    const p3 = makePlayer("P3", { x: 3, y: 3 }, 10, "up");
    const state = makeState([p1, p2, p3]);

    jest.spyOn(Math, "random").mockReturnValue(0.1);

    const incomingAttack = { sourcePlayer: p1, damage: 2, subtype: "punch" };
    const counters = [
      { sourcePlayerId: "P2", card: { id: "c1", subtype: "any", rangeMin: 1, rangeMax: 2 } },
      { sourcePlayerId: "P3", card: { id: "c2", subtype: "any", rangeMin: 1, rangeMax: 2 } },
    ];

    const result = resolveCounterChain(state, incomingAttack, counters);

    // 第一次成功：P1 承受 3。第二次距離不符：鏈終止，P1 仍承受 3
    expect(result.chainCount).toBe(1);
    expect(result.finalDamage).toBe(3);
    expect(result.finalReceiverId).toBe("P1");
    expect(p1.hp).toBe(7);
  });



  test("距離不符時反擊失敗，鏈終止", () => {
    const p1 = makePlayer("P1", { x: 1, y: 1 }, 10);
    const p2 = makePlayer("P2", { x: 3, y: 3 }, 10);
    const state = makeState([p1, p2]);

    const incomingAttack = { sourcePlayer: p1, damage: 2, subtype: "punch" };
    const counters = [
      { sourcePlayerId: "P2", card: { id: "c1", subtype: "any", rangeMin: 1, rangeMax: 2 } },
    ];

    const result = resolveCounterChain(state, incomingAttack, counters);

    expect(result.chainCount).toBe(0);
    expect(result.finalDamage).toBe(2);
    expect(result.finalReceiverId).toBe("P1");
    expect(p1.hp).toBe(8);
    expect(state.log.some((msg) => msg.includes("距離不符"))).toBe(true);
  });
});
