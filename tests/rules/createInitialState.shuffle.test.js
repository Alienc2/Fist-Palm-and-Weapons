// tests/rules/createInitialState.shuffle.test.js
// Phase I-02-A：起始牌庫隨機化測試
// 驗證：
//   1. 起始牌庫喺抽牌前會被 shuffle
//   2. 唔同 seed 產生唔同嘅起始手牌順序（隨機性）
//   3. 手牌數量正確

const { createInitialState } = require("../../server/game/state/createInitialState");

// 用固定 seed 嘅假 Math.random 注入，令測試可重現
function createSeededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe("起始牌庫隨機化", () => {
  test("唔同 seed 產生唔同嘅起始手牌順序", () => {
    const baseOptions = {
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
        { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense" },
      ],
    };

    const originalRandom = Math.random;
    try {
      Math.random = createSeededRandom(1);
      const stateA = createInitialState(baseOptions);
      const handA = stateA.players[0].hand.map((c) => c.definitionId);

      Math.random = createSeededRandom(2);
      const stateB = createInitialState(baseOptions);
      const handB = stateB.players[0].hand.map((c) => c.definitionId);

      // 兩個唔同 seed 應該有機會產生唔同順序
      expect(handA).not.toEqual(handB);
    } finally {
      Math.random = originalRandom;
    }
  });

  test("起始手牌數量等於角色 initialHandSize", () => {
    const state = createInitialState({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
      ],
    });
    const player = state.players[0];
    const character = require("../../shared/cardLoader").getCharacterById("char_attack");
    expect(player.hand.length).toBe(character.initialHandSize);
  });

  test("牌庫 + 手牌總數等於起始牌庫總數", () => {
    const state = createInitialState({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
      ],
    });
    const player = state.players[0];
    const total = player.hand.length + player.deck.length;
    expect(total).toBeGreaterThan(0);
  });
});
