// tests/rules/cardLoader.test.js

const {
  validateAllData,
  loadCards,
  loadCharacters,
  getCardsByGroup,
} = require("../../shared/cardLoader");

describe("cardLoader", () => {
  const rewire = require("rewire");

  describe("cardLoader invalid data", () => {
    test("缺少 card.id 時應拋錯", () => {
      const cardLoader = rewire("../../shared/cardLoader");
      const validateCard = cardLoader.__get__("validateCard");

      expect(() =>
        validateCard({
          type: "attack",
          subtype: "punch",
          name_zh: "測試卡",
          group: "basic",
          range_min: 1,
          range_max: 1,
          damage: 1,
        })
      ).toThrow("card.id 缺失");
    });

    test("attack 的 range_min 大於 range_max 時應拋錯", () => {
      const cardLoader = rewire("../../shared/cardLoader");
      const validateCard = cardLoader.__get__("validateCard");

      expect(() =>
        validateCard({
          id: "bad_attack",
          type: "attack",
          subtype: "punch",
          name_zh: "壞攻擊",
          group: "basic",
          range_min: 3,
          range_max: 1,
          damage: 1,
        })
      ).toThrow("range_min/range_max 非法");
    });

    test("缺少 character.initial_hp 時應拋錯", () => {
      const cardLoader = rewire("../../shared/cardLoader");
      const validateCharacter = cardLoader.__get__("validateCharacter");

      expect(() =>
        validateCharacter({
          id: "bad_char",
          name_zh: "壞角色",
          initial_mp: 3,
          initial_hand_size: 5,
        })
      ).toThrow("character.initial_hp 缺失");
    });
  });
    
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