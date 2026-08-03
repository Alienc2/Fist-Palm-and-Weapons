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
        { id: "P1", isEliminated: false, position: { x: 1, y: 1 }, hp: 3 },
        { id: "P2", isEliminated: false, position: { x: 1, y: 2 }, hp: 2 },
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

  test("stack 順序會改變最終結果：counter 先後入 stack 會影響 P2 是否被反制", () => {
    function makeResolvedState(order) {
      const state = createState();
      ensureStack(state);

      const attack = createStackItem(state, state.players[0], {
        id: "a_final",
        type: "attack",
        targeting: "single_enemy",
        damage: 2,
        rangeMin: 1,
        rangeMax: 1,
      });

      const counter = createStackItem(state, state.players[1], {
        id: "c_final",
        type: "counter",
      });

      if (order === "attack-then-counter") {
        pushStackItem(state, attack);
        pushStackItem(state, counter);
      } else {
        pushStackItem(state, counter);
        pushStackItem(state, attack);
      }

      resolveStack(state, {
        log,
        resolveAttack: (currentState, attacker, card) => {
          const target = currentState.players.find((p) => p.id === "P2");
          if (target && !target.isEliminated) {
            target.hp -= card.damage || 0;
            if (target.hp <= 0) {
              target.isEliminated = true;
            }
          }
          currentState.log.push(`${attacker.id} resolve ${card.id}`);
        },
      });

      return state;
    }

    const resolvedA = makeResolvedState("attack-then-counter");
    const resolvedB = makeResolvedState("counter-then-attack");

    expect(resolvedA.players[1].isEliminated).toBe(false);
    expect(resolvedB.players[1].isEliminated).toBe(true);
    expect(resolvedA.players[1].hp).not.toBe(resolvedB.players[1].hp);
  });
});
