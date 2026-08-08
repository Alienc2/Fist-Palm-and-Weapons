// tests/rules/counterExclusion.test.js
// I-02-E2：counter 卡反擊排除自己嘅 attack
// 驗證 counter 卡只可以反擊其他玩家嘅 attack，唔會反擊自己嘅 attack

const { createMatch, submitSelection, playOneTurn } = require("../../server/game/gameEngine");
const {
  findTopCounterableAttack,
  collectCountersForAttack,
} = require("../../server/game/rules/stackResolver");

describe("findTopCounterableAttack（排除自己嘅 attack）", () => {
  test("counter 卡唔會搵到自己嘅 attack 作為反擊目標", () => {
    const state = {
      stack: [
        {
          id: "stack_1",
          sourcePlayerId: "P1",
          card: { type: "attack" },
          isCountered: false,
        },
      ],
    };

    // P1 用 counter，唔應該搵到 P1 自己嘅 attack
    const target = findTopCounterableAttack(state, "P1");
    expect(target).toBeNull();
  });

  test("counter 卡可以搵到其他玩家嘅 attack 作為反擊目標", () => {
    const state = {
      stack: [
        {
          id: "stack_1",
          sourcePlayerId: "P1",
          card: { type: "attack" },
          isCountered: false,
        },
      ],
    };

    // P2 用 counter，應該搵到 P1 嘅 attack
    const target = findTopCounterableAttack(state, "P2");
    expect(target).not.toBeNull();
    expect(target.sourcePlayerId).toBe("P1");
  });

  test("已被反制嘅 attack 唔會再被搵到", () => {
    const state = {
      stack: [
        {
          id: "stack_1",
          sourcePlayerId: "P1",
          card: { type: "attack" },
          isCountered: true,
        },
      ],
    };

    const target = findTopCounterableAttack(state, "P2");
    expect(target).toBeNull();
  });
});

describe("collectCountersForAttack（排除自己嘅 attack）", () => {
  test("counter 卡唔會收集指向自己 attack 嘅 counter", () => {
    const state = {
      stack: [
        {
          id: "stack_1",
          sourcePlayerId: "P1",
          card: { type: "attack" },
          isCountered: false,
        },
        {
          id: "stack_2",
          sourcePlayerId: "P1",
          card: { type: "counter" },
          targetStackItemId: null,
        },
      ],
    };

    // P1 嘅 counter 唔應該指向 P1 自己嘅 attack
    const counters = collectCountersForAttack(state, state.stack[0]);
    expect(counters).toHaveLength(0);
  });

  test("counter 卡會收集指向其他玩家 attack 嘅 counter", () => {
    const state = {
      stack: [
        {
          id: "stack_1",
          sourcePlayerId: "P1",
          card: { type: "attack" },
          isCountered: false,
        },
        {
          id: "stack_2",
          sourcePlayerId: "P2",
          card: { type: "counter" },
          targetStackItemId: null,
        },
      ],
    };

    // P2 嘅 counter 應該指向 P1 嘅 attack
    const counters = collectCountersForAttack(state, state.stack[0]);
    expect(counters).toHaveLength(1);
    expect(counters[0].sourcePlayerId).toBe("P2");
  });
});

describe("counter 反擊流程（透過 gameEngine）", () => {
  test("P1 用 attack，P2 用 counter 反擊，P2 唔會反擊自己", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    p1.position = { x: 1, y: 1 };
    p2.position = { x: 1, y: 2 };

    const attackCard = {
      id: "test_stack_attack",
      type: "attack",
      subtype: "punch",
      group: "advanced",
      targeting: "single_enemy",
      rangeMin: 1,
      rangeMax: 1,
      damage: 1,
      mpCost: 0,
    };

    const counterCard = {
      id: "test_counter_attack",
      type: "counter",
      counterType: "attack",
      mpCost: 0,
    };

    submitSelection(state, "P1", [{ card: attackCard }]);
    submitSelection(state, "P2", [{ card: counterCard }]);

    playOneTurn(state);

    // P2 反擊 P1 嘅 attack，唔會出現「P2 反擊 P2」
    expect(state.log.some((msg) => msg.includes("P2 反擊 P2"))).toBe(false);
    expect(state.log.some((msg) => msg.includes("反制"))).toBe(true);
  });
});
