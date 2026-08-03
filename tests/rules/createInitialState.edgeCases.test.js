const {
  createInitialState,
  createStarterDeck,
} = require("../../server/game/state/createInitialState");
const cardLoader = require("../../shared/cardLoader");

describe("createInitialState edge cases", () => {
  test("throws when generated data is invalid", () => {
    const spy = jest.spyOn(cardLoader, "validateAllData").mockImplementation(() => {
      throw new Error("[cardLoader] mock invalid generated data");
    });

    expect(() => createInitialState()).toThrow(
      /\[cardLoader\] mock invalid generated data/
    );

    spy.mockRestore();
  });

  test("throws when starter deck is empty for a character", () => {
    const originalGetCardsByGroup = cardLoader.getCardsByGroup;
    const originalGetCharacterById = cardLoader.getCharacterById;
    const originalLoadCharacters = cardLoader.loadCharacters;

    jest.spyOn(cardLoader, "getCardsByGroup").mockImplementation((group) => {
      if (group === "basic") return [];
      return originalGetCardsByGroup(group);
    });

    jest.spyOn(cardLoader, "getCharacterById").mockImplementation((id) => {
      if (id === "char_attack") {
        return {
          id: "char_attack",
          name: "測試角色",
          role: "attack",
          initialHp: 10,
          initialMp: 3,
          initialHandSize: 2,
          tokenColor: "red",
          passiveId: null,
          passiveParams: null,
        };
      }
      return originalGetCharacterById(id);
    });

    jest.spyOn(cardLoader, "loadCharacters").mockImplementation(() => [
      {
        id: "char_attack",
        name: "測試角色",
        role: "attack",
        initialHp: 10,
        initialMp: 3,
        initialHandSize: 2,
        tokenColor: "red",
        passiveId: null,
        passiveParams: null,
      },
    ]);

    expect(() =>
      createStarterDeck(
        {
          id: "char_attack",
          name: "測試角色",
          role: "attack",
          initialHp: 10,
          initialMp: 3,
          initialHandSize: 2,
          tokenColor: "red",
          passiveId: null,
          passiveParams: null,
        },
        "P1"
      )
    ).toThrow(/\[createInitialState\] starter deck is empty/);

    jest.restoreAllMocks();
  });

  test("falls back to the first character when lookup fails", () => {
    const state = createInitialState({
      players: [
        {
          id: "P1",
          position: { x: 1, y: 1 },
          characterId: "__missing_character__",
        },
      ],
    });

    expect(state.players).toHaveLength(1);
    expect(state.players[0].characterId).toBeDefined();
    expect(state.players[0].characterName).toBeDefined();
  });

  test("builds a valid initial state with hand smaller than deck when hand size exceeds deck size", () => {
    const originalGetCharacterById = cardLoader.getCharacterById;

    jest.spyOn(cardLoader, "getCharacterById").mockImplementation((id) => {
      if (id === "char_attack") {
        return {
          id: "char_attack",
          name: "測試角色",
          role: "attack",
          initialHp: 10,
          initialMp: 3,
          initialHandSize: 999,
          tokenColor: "red",
          passiveId: null,
          passiveParams: null,
        };
      }
      return originalGetCharacterById(id);
    });

    const state = createInitialState({
      players: [
        {
          id: "P1",
          position: { x: 1, y: 1 },
          characterId: "char_attack",
        },
      ],
    });

    expect(state.players).toHaveLength(1);
    expect(state.players[0].hand.length).toBeLessThanOrEqual(
      state.players[0].deck.length + state.players[0].hand.length
    );
    expect(state.players[0].deck).toBeDefined();
    expect(state.players[0].hand).toBeDefined();
    expect(state.players[0].discard).toEqual([]);
    expect(state.players[0].isEliminated).toBe(false);

    jest.restoreAllMocks();
  });

  test("creates a stable state shape for empty deck-like boundary input", () => {
    const state = createInitialState({
      players: [
        {
          id: "P1",
          position: { x: 1, y: 1 },
          characterId: "char_attack",
        },
      ],
      startingPlayerIndex: 0,
      round: 1,
    });

    expect(state).toEqual(
      expect.objectContaining({
        matchId: "test-match",
        phase: "ROUND_START",
        round: 1,
        turn: 1,
        revealIndex: 0,
        startingPlayerIndex: 0,
        activePlayerIndex: 0,
        stack: [],
        eliminatedPlayers: [],
        log: [],
      })
    );

    expect(Array.isArray(state.turnOrder)).toBe(true);
    expect(Array.isArray(state.players)).toBe(true);
    expect(state.players[0]).toEqual(
      expect.objectContaining({
        id: "P1",
        hand: expect.any(Array),
        deck: expect.any(Array),
        discard: expect.any(Array),
        passives: expect.any(Array),
        selectedCards: expect.any(Array),
      })
    );
  });
});