const {
  ensureStack,
  createStackItem,
  pushStackItem,
  peekStack,
  findTopCounterableAttack,
  resolveTopStackItem,
  resolveStack,
} = require("../../server/game/rules/stackResolver");

describe("stackResolver", () => {
  function createState() {
    return {
      players: [
        { id: "P1", isEliminated: false, position: { x: 1, y: 1 } },
        { id: "P2", isEliminated: false, position: { x: 1, y: 2 } },
      ],
      log: [],
    };
  }

  function log(state, message) {
    state.log.push(message);
  }

  test("pushStackItem 會把 item 放到 stack 頂", () => {
    const state = createState();
    ensureStack(state);

    const item = createStackItem(state, state.players[0], { id: "a1", type: "attack", targeting: "single_enemy" });
    pushStackItem(state, item);

    expect(state.stack.length).toBe(1);
    expect(peekStack(state).id).toBe(item.id);
  });

  test("findTopCounterableAttack 會找到最上層 attack", () => {
    const state = createState();
    ensureStack(state);

    const attack1 = createStackItem(state, state.players[0], { id: "a1", type: "attack", targeting: "single_enemy" });
    const attack2 = createStackItem(state, state.players[0], { id: "a2", type: "attack", targeting: "single_enemy" });

    pushStackItem(state, attack1);
    pushStackItem(state, attack2);

    expect(findTopCounterableAttack(state).card.id).toBe("a2");
  });

  test("counter resolve 時會標記目標 attack 為 isCountered", () => {
    const state = createState();
    ensureStack(state);

    const attack = createStackItem(state, state.players[0], {
      id: "a1",
      type: "attack",
      targeting: "single_enemy",
    });
    pushStackItem(state, attack);

    const counter = createStackItem(state, state.players[1], {
      id: "c1",
      type: "counter",
    });
    pushStackItem(state, counter);

    resolveTopStackItem(state, {
      log,
      resolveAttack: jest.fn(),
    });

    expect(attack.isCountered).toBe(true);
  });

  test("resolveStack 會以 LIFO 順序結算", () => {
    const state = createState();
    ensureStack(state);
    const calls = [];

    const attack = createStackItem(state, state.players[0], {
      id: "a1",
      type: "attack",
      targeting: "single_enemy",
    });
    pushStackItem(state, attack);

    const counter = createStackItem(state, state.players[1], {
      id: "c1",
      type: "counter",
    });
    pushStackItem(state, counter);

    resolveStack(state, {
      log: (s, msg) => {
        s.log.push(msg);
        calls.push(msg);
      },
      resolveAttack: jest.fn(),
    });

    expect(calls[0]).toContain("反制");
    expect(calls[1]).toContain("被反制");
  });
});