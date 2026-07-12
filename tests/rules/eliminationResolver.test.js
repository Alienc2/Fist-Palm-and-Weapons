// tests/rules/eliminationResolver.test.js

const {
  getEliminationReason,
  eliminatePlayer,
  resolveEliminations,
} = require("../../server/game/rules/eliminationResolver");

describe("eliminationResolver", () => {
  test("HP <= 0 時應判定為 HP_ZERO", () => {
    const player = {
      id: "P1",
      hp: 0,
      position: { x: 2, y: 2 },
      isEliminated: false,
    };

    expect(getEliminationReason(player)).toBe("HP_ZERO");
  });

  test("邊緣 + HP < 3 + advanced 傷害來源時應判定為 EDGE_KO", () => {
    const player = {
        id: "P1",
        hp: 2,
        position: { x: 0, y: 2 },
        isEliminated: false,
        lastDamageContext: {
        sourceCardId: "advanced_strike",
        sourceGroup: "advanced",
        sourceType: "attack",
        },
    };

    expect(getEliminationReason(player)).toBe("EDGE_KO");
    });

  test("非邊緣且 HP > 0 時不應淘汰", () => {
    const player = {
      id: "P1",
      hp: 2,
      position: { x: 2, y: 2 },
      isEliminated: false,
    };

    expect(getEliminationReason(player)).toBe(null);
  });

  test("resolveEliminations 會將符合條件的玩家標記為淘汰", () => {
    const state = {
      players: [
        {
          id: "P1",
          hp: 0,
          position: { x: 2, y: 2 },
          isEliminated: false,
        },
        {
          id: "P2",
          hp: 5,
          position: { x: 2, y: 2 },
          isEliminated: false,
        },
      ],
      log: [],
    };

    const result = resolveEliminations(state);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      playerId: "P1",
      reason: "HP_ZERO",
    });
    expect(state.players[0].isEliminated).toBe(true);
    expect(state.players[1].isEliminated).toBe(false);
  });

  test("已淘汰玩家不應重複寫 log", () => {
    const state = {
      players: [],
      log: [],
    };

    const player = {
      id: "P1",
      hp: 0,
      position: { x: 2, y: 2 },
      isEliminated: true,
    };

    const result = eliminatePlayer(state, player, "HP_ZERO");

    expect(result).toBe(false);
    expect(state.log).toHaveLength(0);
  });
});