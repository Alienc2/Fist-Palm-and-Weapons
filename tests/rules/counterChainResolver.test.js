// tests/rules/counterChainResolver.test.js

const {
  getCounterSuccessRate,
  isCounterRangeValid,
  resolveCounter,
  resolveCounterChain,
} = require("../../server/game/rules/counterChainResolver");

function makePlayer(id, position, hp = 10) {
  return {
    id,
    position,
    hp,
    lastDamageContext: null,
  };
}

function makeState(players) {
  return { players, log: [] };
}

describe("getCounterSuccessRate", () => {
  test("shop_counter_1 固定 80%", () => {
    expect(getCounterSuccessRate({ id: "shop_counter_1", subtype: "any" }, "punch")).toBe(0.8);
  });

  test("反擊類型剋制攻擊類型時 100%", () => {
    // punch 剋 weapon
    expect(getCounterSuccessRate({ id: "c", subtype: "punch" }, "weapon")).toBe(1.0);
  });

  test("反擊類型被攻擊類型剋制時 60%", () => {
    // punch 被 palm 剋
    expect(getCounterSuccessRate({ id: "c", subtype: "punch" }, "palm")).toBe(0.6);
  });

  test("同類時 80%", () => {
    expect(getCounterSuccessRate({ id: "c", subtype: "punch" }, "punch")).toBe(0.8);
  });

  test("無 subtype 時 80%", () => {
    expect(getCounterSuccessRate({ id: "c", subtype: "any" }, "punch")).toBe(0.8);
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

  test("100% 成功率時必定反彈並 ×2", () => {
    const state = makeState([]);
    const defender = makePlayer("P2", { x: 1, y: 2 });
    const attacker = makePlayer("P1", { x: 1, y: 1 });
    const card = { id: "c", subtype: "punch", rangeMin: 1, rangeMax: 2 };

    jest.spyOn(Math, "random").mockReturnValue(0.99);

    const result = resolveCounter(state, defender, card, 2, "weapon", attacker);

    expect(result.reflected).toBe(true);
    expect(result.damageToAttacker).toBe(4);
  });

  test("失敗時不反彈", () => {
    const state = makeState([]);
    const defender = makePlayer("P2", { x: 1, y: 2 });
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

  test("單次成功反擊：傷害 ×2 反彈給攻擊者", () => {
    const p1 = makePlayer("P1", { x: 1, y: 1 }, 10);
    const p2 = makePlayer("P2", { x: 1, y: 2 }, 10);
    const state = makeState([p1, p2]);

    // roll=0.1 < 0.8，必定成功
    jest.spyOn(Math, "random").mockReturnValue(0.1);

    const incomingAttack = { sourcePlayer: p1, damage: 2, subtype: "punch" };
    const counters = [
      { sourcePlayerId: "P2", card: { id: "c1", subtype: "any", rangeMin: 1, rangeMax: 2 } },
    ];

    const result = resolveCounterChain(state, incomingAttack, counters);

    expect(result.chainCount).toBe(1);
    expect(result.finalDamage).toBe(4);
    expect(result.finalReceiverId).toBe("P1");
    expect(p1.hp).toBe(6);
    expect(state.log.some((msg) => msg.includes("承受反擊連鎖 4 傷害"))).toBe(true);
  });

  test("雙重反擊連鎖：傷害 ×2 ×2 = ×4", () => {
    const p1 = makePlayer("P1", { x: 1, y: 1 }, 20);
    const p2 = makePlayer("P2", { x: 1, y: 2 }, 20);
    const p3 = makePlayer("P3", { x: 1, y: 3 }, 20);
    const state = makeState([p1, p2, p3]);

    // 兩次都成功
    jest.spyOn(Math, "random").mockReturnValue(0.1);

    const incomingAttack = { sourcePlayer: p1, damage: 2, subtype: "punch" };
    const counters = [
      { sourcePlayerId: "P2", card: { id: "c1", subtype: "any", rangeMin: 1, rangeMax: 2 } },
      { sourcePlayerId: "P3", card: { id: "c2", subtype: "any", rangeMin: 1, rangeMax: 2 } },
    ];

    const result = resolveCounterChain(state, incomingAttack, counters);

    // P2 反擊 P1 (2→4)，P3 反擊 P2 (4→8)，最終 P2 承受 8
    expect(result.chainCount).toBe(2);
    expect(result.finalDamage).toBe(8);
    expect(result.finalReceiverId).toBe("P2");
    expect(p2.hp).toBe(12);
    expect(p1.hp).toBe(20);
  });

  test("反擊失敗時鏈終止，由當前承受者吃下最後傷害", () => {
    const p1 = makePlayer("P1", { x: 1, y: 1 }, 10);
    const p2 = makePlayer("P2", { x: 1, y: 2 }, 10);
    const state = makeState([p1, p2]);

    // 第一次成功（roll=0.1），第二次失敗（roll=0.99 > 0.8）
    jest
      .spyOn(Math, "random")
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.99);

    const incomingAttack = { sourcePlayer: p1, damage: 2, subtype: "punch" };
    const counters = [
      { sourcePlayerId: "P2", card: { id: "c1", subtype: "any", rangeMin: 1, rangeMax: 2 } },
      { sourcePlayerId: "P2", card: { id: "c2", subtype: "any", rangeMin: 1, rangeMax: 2 } },
    ];

    const result = resolveCounterChain(state, incomingAttack, counters);

    // 第一次成功：P1 承受 4。第二次失敗：鏈終止，P1 仍承受 4
    expect(result.chainCount).toBe(1);
    expect(result.finalDamage).toBe(4);
    expect(result.finalReceiverId).toBe("P1");
    expect(p1.hp).toBe(6);
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
