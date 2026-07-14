// tests/rules/targetingResolver.test.js

const {
  getEnemies,
  getDefaultEnemyTarget,
  getSelfChosenEnemyTargets,
  getTargets,
  isTargetStillLegal,
  retargetDeclaredTargets,
  declareTargetSet,
  hydrateDeclaredTargets,
  validateDeclaredTargets,
  applyRetargetInstruction,
} = require("../../server/game/rules/targetingResolver");

function createState() {
  return {
    players: [
      { id: "P1", isEliminated: false, position: { x: 1, y: 1 } },
      { id: "P2", isEliminated: false, position: { x: 1, y: 2 } },
      { id: "P3", isEliminated: false, position: { x: 2, y: 1 } },
    ],
  };
}

describe("targetingResolver", () => {
  test("getEnemies 會回傳所有未淘汰敵人", () => {
    const state = createState();
    const player = state.players[0];

    const enemies = getEnemies(state, player);

    expect(enemies.map((p) => p.id)).toEqual(["P2", "P3"]);
  });

  test("single_enemy 會回傳預設第一個敵人", () => {
    const state = createState();
    const player = state.players[0];

    const targets = getDefaultEnemyTarget(state, player);

    expect(targets.map((p) => p.id)).toEqual(["P2"]);
  });

  test("self_chosen_enemies 會優先回傳 preferredTargetId 指定的敵人", () => {
    const state = createState();
    const player = state.players[0];

    const targets = getSelfChosenEnemyTargets(state, player, {
      preferredTargetId: "P3",
    });

    expect(targets.map((p) => p.id)).toEqual(["P3"]);
  });

  test("self_chosen_enemies 指定無效目標時，會回退到預設第一個敵人", () => {
    const state = createState();
    const player = state.players[0];

    const targets = getSelfChosenEnemyTargets(state, player, {
      preferredTargetId: "P999",
    });

    expect(targets.map((p) => p.id)).toEqual(["P2"]);
  });

  test("getTargets 會根據 card.targeting 選目標", () => {
    const state = createState();
    const player = state.players[0];

    const targets = getTargets(
      state,
      player,
      { targeting: "self_chosen_enemies" },
      { preferredTargetId: "P3" }
    );

    expect(targets.map((p) => p.id)).toEqual(["P3"]);
  });
});

test("all_enemies 會回傳所有未淘汰敵人", () => {
  const state = createState();
  const player = state.players[0];

  const targets = getTargets(state, player, { targeting: "all_enemies" });

  expect(targets.map((p) => p.id)).toEqual(["P2", "P3"]);
});

test("adjacent_enemies 只會回傳相鄰敵人", () => {
  const state = {
    players: [
      { id: "P1", isEliminated: false, position: { x: 1, y: 1 } },
      { id: "P2", isEliminated: false, position: { x: 1, y: 2 } },
      { id: "P3", isEliminated: false, position: { x: 3, y: 3 } },
    ],
  };

  const targets = getTargets(state, state.players[0], { targeting: "adjacent_enemies" });

  expect(targets.map((p) => p.id)).toEqual(["P2"]);
});

test("cross_enemies 只會回傳同 x 或同 y 的敵人", () => {
  const state = {
    players: [
      { id: "P1", isEliminated: false, position: { x: 1, y: 1 } },
      { id: "P2", isEliminated: false, position: { x: 1, y: 3 } },
      { id: "P3", isEliminated: false, position: { x: 3, y: 2 } },
      { id: "P4", isEliminated: false, position: { x: 2, y: 1 } },
    ],
  };

  const targets = getTargets(state, state.players[0], { targeting: "cross_enemies" });

  expect(targets.map((p) => p.id)).toEqual(["P2", "P4"]);
});

test("isTargetStillLegal 會拒絕已淘汰目標", () => {
  const state = {
    players: [
      { id: "P1", isEliminated: false, position: { x: 1, y: 1 } },
      { id: "P2", isEliminated: true, position: { x: 1, y: 2 } },
    ],
  };

  const result = isTargetStillLegal(
    state,
    state.players[0],
    { targeting: "single_enemy" },
    state.players[1]
  );

  expect(result).toBe(false);
});

test("retargetDeclaredTargets 會在新目標合法時改變目標", () => {
  const state = {
    players: [
      { id: "P1", isEliminated: false, position: { x: 1, y: 1 } },
      { id: "P2", isEliminated: false, position: { x: 1, y: 2 } },
      { id: "P3", isEliminated: false, position: { x: 1, y: 3 } },
    ],
  };

  const result = retargetDeclaredTargets(
    state,
    state.players[0],
    { targeting: "single_enemy" },
    [state.players[1]],
    { retargetToId: "P3" }
  );

  expect(result.map((p) => p.id)).toEqual(["P3"]);
});

test("declareTargetSet 會把 target 存成 id contract", () => {
  const state = createState();
  const player = state.players[0];

  const declared = declareTargetSet(
    state,
    player,
    { targeting: "single_enemy" }
  );

  expect(declared.targeting).toBe("single_enemy");
  expect(declared.targets).toEqual([{ id: "P2" }]);
});

test("hydrateDeclaredTargets 會把 id contract 轉回 live targets", () => {
  const state = createState();

  const hydrated = hydrateDeclaredTargets(state, {
    targets: [{ id: "P2" }, { id: "P3" }],
  });

  expect(hydrated.map((p) => p.id)).toEqual(["P2", "P3"]);
});

test("validateDeclaredTargets 在 allowPartialResolution 時會保留合法 targets", () => {
  const state = createState();
  state.players[1].isEliminated = true;

  const result = validateDeclaredTargets(
    state,
    state.players[0],
    { targeting: "all_enemies" },
    {
      targeting: "all_enemies",
      requiredTargets: 1,
      allowPartialResolution: true,
      targets: [{ id: "P2" }, { id: "P3" }],
    }
  );

  expect(result.isValid).toBe(true);
  expect(result.legalTargets.map((p) => p.id)).toEqual(["P3"]);
  expect(result.invalidTargetIds).toEqual(["P2"]);
});

test("applyRetargetInstruction 會把 declared target 改成新目標", () => {
  const state = createState();

  const result = applyRetargetInstruction(
    state,
    state.players[0],
    { targeting: "single_enemy" },
    {
      targeting: "single_enemy",
      requiredTargets: 1,
      allowPartialResolution: true,
      targets: [{ id: "P2" }],
    },
    {
      retargetInstruction: { toTargetId: "P3" },
    }
  );

  expect(result.targets).toEqual([{ id: "P3" }]);
});