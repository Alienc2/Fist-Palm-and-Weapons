const { createInitialState } = require("../../server/game/state/createInitialState");

describe("createInitialState authoritative contract", () => {
  test("should create players from character data", () => {
    const state = createInitialState();

    expect(state.players).toHaveLength(2);
    expect(state.players[0].characterId).toBe("char_attack");
    expect(state.players[0].hp).toBe(9);
    expect(state.players[0].maxHp).toBe(9);
    expect(state.players[1].characterId).toBe("char_defense");
    expect(state.players[1].hp).toBe(12);
    expect(state.players[1].maxHp).toBe(12);
  });

  test("should create starter deck from authoritative default copies", () => {
    const state = createInitialState();
    const player = state.players[0];

    const totalCards = player.hand.length + player.deck.length + player.discard.length;
    expect(totalCards).toBeGreaterThan(0);
    expect(player.hand.length).toBe(4);
  });

  test("should assign instanceId and definitionId to cards", () => {
    const state = createInitialState();
    const player = state.players[0];
    const firstCard = player.hand[0] || player.deck[0];

    expect(firstCard).toHaveProperty("instanceId");
    expect(firstCard).toHaveProperty("definitionId");
  });

  test("should create shop state with stockByCardId", () => {
    const state = createInitialState();

    expect(state.shop).toHaveProperty("cards");
    expect(state.shop).toHaveProperty("stockByCardId");
    expect(Object.keys(state.shop.stockByCardId).length).toBeGreaterThan(0);
  });

  test("should create base match structures", () => {
    const state = createInitialState();

    expect(state.turn).toBe(1);
    expect(Array.isArray(state.stack)).toBe(true);
    expect(Array.isArray(state.eliminatedPlayers)).toBe(true);
    expect(Array.isArray(state.log)).toBe(true);
  });
});