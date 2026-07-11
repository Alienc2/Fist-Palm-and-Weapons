// tests/rules/cardLoader.test.js

const {
  validateAllData,
  loadCards,
  loadCharacters,
  getCardsByGroup,
} = require("../../shared/cardLoader");

describe("cardLoader", () => {
  test("generated JSON 可成功通過驗證", () => {
    expect(() => validateAllData()).not.toThrow();
  });

  test("loadCards 會回傳 enabled cards", () => {
    const cards = loadCards();
    expect(Array.isArray(cards)).toBe(true);
    expect(cards.length).toBeGreaterThan(0);
  });

  test("getCardsByGroup('basic') 應回傳 basic 卡牌", () => {
    const basicCards = getCardsByGroup("basic");
    expect(basicCards.length).toBeGreaterThan(0);
    expect(basicCards.every((card) => card.group === "basic")).toBe(true);
  });

  test("loadCharacters 會回傳角色資料", () => {
    const characters = loadCharacters();
    expect(Array.isArray(characters)).toBe(true);
    expect(characters.length).toBeGreaterThan(0);
  });
});