// tests/rules/targetingResolver.test.js

const {
  getEnemies,
  getDefaultEnemyTarget,
  getSelfChosenEnemyTargets,
  getTargets,
} = require("../../server/game/rules/targetingResolver");

describe("targetingResolver", () => {
  function createState() {
    return {
      players: [
        { id: "P1", isEliminated: false },
        { id: "P2", isEliminated: false },
        { id: "P3", isEliminated: false },
      ],
    };
  }

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