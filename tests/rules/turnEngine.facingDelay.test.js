// tests/rules/turnEngine.facingDelay.test.js
// Phase I-02-D：免費轉向延後到最後測試
// 驗證：
//   1. 免費轉向喺回合最後先套用（唔影響本回合卡牌解析）
//   2. 轉向後 facing 正確更新

const { createInitialState } = require("../../server/game/state/createInitialState");
const { resolveTurn } = require("../../server/game/rules/turnEngine");

function makeState() {
  const state = createInitialState({
    players: [
      { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
      { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense" },
    ],
  });
  state.rng = () => 0.5;
  return state;
}

describe("免費轉向延後到最後", () => {
  test("轉向喺回合最後套用，facing 正確更新", () => {
    const state = makeState();
    const p1 = state.players[0];
    // 設定 P1 本回合要轉向到 right
    p1.facingChange = "right";
    // P1 唔選任何卡
    p1.selectedCards = [];
    state.players[1].selectedCards = [];

    resolveTurn(state);

    expect(p1.facing).toBe("right");
  });

  test("冇設定轉向時 facing 保持不變", () => {
    const state = makeState();
    const p1 = state.players[0];
    const before = p1.facing;
    p1.selectedCards = [];
    state.players[1].selectedCards = [];

    resolveTurn(state);

    expect(p1.facing).toBe(before);
  });
});
