// tests/rules/targetPriorityResolver.test.js

const {
  sortTargetsByPriority,
  getAutoTargets,
} = require("../../server/game/rules/targetPriorityResolver");

function makePlayer(id, position, hp = 10, facing = "up") {
  return {
    id,
    position,
    hp,
    facing,
    isEliminated: false,
  };
}

function makeState(players, turnOrder) {
  return {
    players,
    turnOrder: turnOrder || players.map((p) => p.id),
  };
}

describe("sortTargetsByPriority", () => {
  test("距離越近越優先", () => {
    const source = makePlayer("P1", { x: 1, y: 1 });
    const far = makePlayer("P2", { x: 4, y: 4 }, 10);
    const near = makePlayer("P3", { x: 1, y: 2 }, 10);
    const state = makeState([source, far, near]);

    const sorted = sortTargetsByPriority(state, source, [far, near]);
    expect(sorted[0].id).toBe("P3");
    expect(sorted[1].id).toBe("P2");
  });

  test("距離相同時 HP 越低越優先", () => {
    const source = makePlayer("P1", { x: 1, y: 1 });
    const highHp = makePlayer("P2", { x: 1, y: 2 }, 10);
    const lowHp = makePlayer("P3", { x: 2, y: 1 }, 3);
    const state = makeState([source, highHp, lowHp]);

    const sorted = sortTargetsByPriority(state, source, [highHp, lowHp]);
    expect(sorted[0].id).toBe("P3");
    expect(sorted[1].id).toBe("P2");
  });

  test("距離與 HP 相同時背面越優先", () => {
    const source = makePlayer("P1", { x: 1, y: 1 }, 10, "down");
    // source facing down：位於 source 上方 (dy<0) 者為背面，下方 (dy>0) 者為正面
    const front = makePlayer("P2", { x: 1, y: 2 }, 10, "up");
    const back = makePlayer("P3", { x: 1, y: 0 }, 10, "up");
    const state = makeState([source, front, back]);

    const sorted = sortTargetsByPriority(state, source, [front, back]);
    expect(sorted[0].id).toBe("P3");
    expect(sorted[1].id).toBe("P2");
  });


  test("全部相同時座位 tie-breaker 越小越優先", () => {
    const source = makePlayer("P1", { x: 1, y: 1 });
    const p2 = makePlayer("P2", { x: 1, y: 2 }, 10);
    const p3 = makePlayer("P3", { x: 2, y: 1 }, 10);
    const p4 = makePlayer("P4", { x: 2, y: 2 }, 10);
    const state = makeState([source, p2, p3, p4], ["P1", "P2", "P3", "P4"]);

    const sorted = sortTargetsByPriority(state, source, [p4, p3, p2]);
    expect(sorted.map((p) => p.id)).toEqual(["P2", "P3", "P4"]);
  });
});

describe("getAutoTargets", () => {
  test("排除自己與淘汰者", () => {
    const source = makePlayer("P1", { x: 1, y: 1 });
    const eliminated = makePlayer("P2", { x: 1, y: 2 }, 10);
    eliminated.isEliminated = true;
    const alive = makePlayer("P3", { x: 2, y: 1 }, 10);
    const state = makeState([source, eliminated, alive]);

    const targets = getAutoTargets(state, source, state.players);
    expect(targets.map((p) => p.id)).toEqual(["P3"]);
  });

  test("無敵方時回傳空陣列", () => {
    const source = makePlayer("P1", { x: 1, y: 1 });
    const state = makeState([source]);

    const targets = getAutoTargets(state, source, state.players);
    expect(targets).toEqual([]);
  });

  test("回傳依優先規則排序的目標", () => {
    const source = makePlayer("P1", { x: 1, y: 1 });
    const far = makePlayer("P2", { x: 4, y: 4 }, 10);
    const near = makePlayer("P3", { x: 1, y: 2 }, 5);
    const state = makeState([source, far, near]);

    const targets = getAutoTargets(state, source, state.players);
    expect(targets[0].id).toBe("P3");
    expect(targets[1].id).toBe("P2");
  });
});
