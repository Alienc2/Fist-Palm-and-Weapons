const {
  validateAllData,
  loadCards,
  loadCharacters,
  loadKeywords,
  loadCombos,
  loadAiProfiles,
  getCardById,
  getCharacterById,
  getKeywordById,
  getComboById,
  getAiProfileById,
} = require("../../shared/cardLoader");

describe("cardLoader authoritative data contract", () => {
  test("validateAllData should pass for generated data", () => {
    expect(() => validateAllData()).not.toThrow();
  });

  test("loadCards should normalize enabled cards", () => {
    const cards = loadCards();
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]).toHaveProperty("id");
    expect(cards[0]).toHaveProperty("definitionId", undefined);
    expect(typeof cards[0].mpCost).toBe("number");
    expect(Array.isArray(cards[0].keywords)).toBe(true);
  });

  test("loadCharacters should normalize passiveParams", () => {
    const characters = loadCharacters();
    expect(characters.length).toBeGreaterThan(0);
    expect(characters[0]).toHaveProperty("initialHp");
    expect(typeof characters[0].initialHp).toBe("number");
  });

  test("loadKeywords should load keyword entries", () => {
    const keywords = loadKeywords();
    expect(keywords.length).toBeGreaterThan(0);
    expect(getKeywordById("basic")).not.toBeNull();
  });

  test("loadCombos should parse effectParams JSON", () => {
    const combos = loadCombos();
    expect(combos.length).toBeGreaterThan(0);
    expect(typeof combos[0].effectParams).toBe("object");
  });

  test("loadAiProfiles should normalize numeric weights", () => {
    const profiles = loadAiProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    expect(typeof profiles[0].attackWeight).toBe("number");
  });

  test("lookup helpers should return normalized objects", () => {
    expect(getCardById("basic_punch_1")).not.toBeNull();
    expect(getCharacterById("char_attack")).not.toBeNull();
    expect(getComboById("combo_same_attack_3")).not.toBeNull();
    expect(getAiProfileById("ai_normal")).not.toBeNull();
  });
});