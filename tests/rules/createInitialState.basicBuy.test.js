// tests/rules/createInitialState.basicBuy.test.js
// Phase I-02-C：basic_buy 永久固定 + 起始手牌必定有 basic_buy 測試
// 驗證：
//   1. 起始手牌必定包含 basic_buy（學習武功）
//   2. basic_buy 唔會被棄牌至手牌上限流程棄掉（永久固定）

const { createInitialState } = require("../../server/game/state/createInitialState");
const { discardToLimit } = require("../../server/game/rules/turnEngine");

function makeStateWithHand(handCards) {
  const state = createInitialState({
    players: [{ id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" }],
  });
  const player = state.players[0];
  player.hand = handCards;
  player.handLimit = 8;
  player.pendingDiscards = [];
  return state;
}

describe("起始手牌必定有 basic_buy", () => {
  test("起始手牌包含 basic_buy", () => {
    const state = createInitialState({
      players: [{ id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" }],
    });
    const handIds = state.players[0].hand.map((c) => c.definitionId);
    expect(handIds).toContain("basic_buy");
  });

  test("起始手牌數量等於 initialHandSize", () => {
    const state = createInitialState({
      players: [{ id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" }],
    });
    const character = require("../../shared/cardLoader").getCharacterById("char_attack");
    expect(state.players[0].hand.length).toBe(character.initialHandSize);
  });
});

describe("basic_buy 永久固定（唔會被棄）", () => {
  test("手牌超上限時 basic_buy 唔會被棄", () => {
    const basicBuy = {
      instanceId: "P1:hand:basic_buy:1",
      definitionId: "basic_buy",
      id: "basic_buy",
      type: "buy",
      zone: "hand",
    };
    const otherCards = Array.from({ length: 9 }, (_, i) => ({
      instanceId: `P1:hand:other:${i}`,
      definitionId: `other_${i}`,
      id: `other_${i}`,
      type: "attack",
      zone: "hand",
    }));

    const state = makeStateWithHand([basicBuy, ...otherCards]);
    discardToLimit(state);

    const player = state.players[0];
    const handIds = player.hand.map((c) => c.definitionId);
    expect(handIds).toContain("basic_buy");
    expect(player.hand.length).toBeLessThanOrEqual(player.handLimit);
  });
});
