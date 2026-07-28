const { createStarterDeck, createInitialState } = require("../../server/game/state/createInitialState");
const cardLoader = require("../../shared/cardLoader");

describe("starter deck assembly", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("builds starter deck from Default_Card_Set and ALL using copy counts", () => {
    const basicCards = [
      { id: "basic_punch_1", group: "basic", defaultCardSet: "1", defaultCopiesInHand: 2 },
      { id: "basic_guard_1", group: "basic", defaultCardSet: "1", defaultCopiesInHand: 1 },
      { id: "basic_buy", group: "basic", defaultCardSet: "ALL", defaultCopiesInHand: 1 },
      { id: "basic_move_2", group: "basic", defaultCardSet: "2", defaultCopiesInHand: 3 },
      { id: "shop_adv_punch_1", group: "basic", defaultCardSet: "", defaultCopiesInHand: 9 },
    ];

    const character = { id: "char_attack", role: "attack" };

    jest.spyOn(cardLoader, "getCardsByGroup").mockImplementation((group) => {
      if (group === "basic") return basicCards;
      if (group === "shop") return [];
      return [];
    });

    const deck = createStarterDeck(character, "P1");

    expect(deck.map((card) => card.id)).toEqual([
      "basic_punch_1",
      "basic_punch_1",
      "basic_guard_1",
      "basic_buy",
    ]);
    expect(deck.every((card) => card.ownerId === "P1")).toBe(true);
    expect(deck.every((card) => card.definitionId === card.id)).toBe(true);
  });

  test("ignores cards with empty set key or zero copies", () => {
    const basicCards = [
      { id: "basic_punch_1", group: "basic", defaultCardSet: "", defaultCopiesInHand: 2 },
      { id: "basic_guard_1", group: "basic", defaultCardSet: "1", defaultCopiesInHand: 0 },
      { id: "basic_buy", group: "basic", defaultCardSet: "ALL", defaultCopiesInHand: 1 },
    ];

    const character = { id: "char_attack", role: "attack" };

    jest.spyOn(cardLoader, "getCardsByGroup").mockImplementation((group) => {
      if (group === "basic") return basicCards;
      if (group === "shop") return [];
      return [];
    });

    const deck = createStarterDeck(character, "P1");

    expect(deck.map((card) => card.id)).toEqual(["basic_buy"]);
  });

  test("throws when starter deck would be empty", () => {
    const basicCards = [
      { id: "shop_only", group: "basic", defaultCardSet: "", defaultCopiesInHand: 0 },
    ];

    const character = { id: "char_attack", role: "attack" };

    jest.spyOn(cardLoader, "getCardsByGroup").mockImplementation((group) => {
      if (group === "basic") return basicCards;
      if (group === "shop") return [];
      return [];
    });

    expect(() => createStarterDeck(character, "P1")).toThrow(/starter deck/i);
  });

  test("createInitialState draws initial hand from assembled starter deck", () => {
    const basicCards = [
      { id: "basic_punch_1", group: "basic", defaultCardSet: "1", defaultCopiesInHand: 2 },
      { id: "basic_guard_1", group: "basic", defaultCardSet: "1", defaultCopiesInHand: 1 },
      { id: "basic_move_1", group: "basic", defaultCardSet: "1", defaultCopiesInHand: 1 },
      { id: "basic_buy", group: "basic", defaultCardSet: "ALL", defaultCopiesInHand: 1 },
      { id: "basic_punch_2", group: "basic", defaultCardSet: "2", defaultCopiesInHand: 3 },
    ];

    const characters = [
      {
        id: "char_attack",
        name: "Attack",
        role: "attack",
        initialHp: 10,
        initialMp: 3,
        initialHandSize: 4,
        tokenColor: "red",
        passiveId: null,
        passiveParams: null,
      },
      {
        id: "char_defense",
        name: "Defense",
        role: "defense",
        initialHp: 12,
        initialMp: 2,
        initialHandSize: 4,
        tokenColor: "blue",
        passiveId: null,
        passiveParams: null,
      },
    ];

    jest.spyOn(cardLoader, "validateAllData").mockImplementation(() => {});
    jest.spyOn(cardLoader, "getCardsByGroup").mockImplementation((group) => {
      if (group === "basic") return basicCards;
      if (group === "shop") return [];
      return [];
    });
    jest.spyOn(cardLoader, "loadCharacters").mockReturnValue(characters);
    jest.spyOn(cardLoader, "getCharacterById").mockImplementation((id) =>
      characters.find((character) => character.id === id)
    );

    const state = createInitialState();

    expect(state.players[0].hand).toHaveLength(4);
    expect(state.players[0].deck).toHaveLength(1);
    expect(state.players[0].hand.map((card) => card.id)).toEqual([
      "basic_punch_1",
      "basic_punch_1",
      "basic_guard_1",
      "basic_move_1",
    ]);
    expect(state.players[0].deck.map((card) => card.id)).toEqual(["basic_buy"]);
  });
});