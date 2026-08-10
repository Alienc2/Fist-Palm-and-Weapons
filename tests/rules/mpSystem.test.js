// tests/rules/mpSystem.test.js
// Phase I-02：MP 系統測試
// 驗證：
//   1. maxMp 統一為 8
//   2. 第 1 回合開始時保持預設 MP（唔補）
//   3. 第 2 回合開始起每回合補 3 MP，上限為 maxMp（8）

const { createMatch, submitSelection, playOneTurn } = require("../../server/game/gameEngine");

describe("MP 系統", () => {
  test("maxMp 統一為 8", () => {
    const state = createMatch();
    for (const p of state.players) {
      expect(p.maxMp).toBe(8);
    }
  });

  test("第 1 回合開始時保持預設 MP（唔補）", () => {
    const state = createMatch();
    const [p1] = state.players;
    const initialMp = p1.mp;

    // 第 1 回合開始（createMatch 後）唔補 MP，保持角色預設 MP
    expect(p1.mp).toBe(initialMp);
    expect(state.log.some((msg) => msg.includes("回合開始回復"))).toBe(false);
  });

  test("第 2 回合開始補 3 MP", () => {
    const state = createMatch();
    const [p1] = state.players;
    const initialMp = p1.mp;

    // 第 1 回合（唔選卡，直接結算）
    submitSelection(state, "P1", []);
    submitSelection(state, "P2", []);
    playOneTurn(state);

    // 第 1 回合結束後 round 變 2，代表第 2 回合開始，補 3 MP
    expect(p1.mp).toBe(Math.min(8, initialMp + 3));
    expect(state.log.some((msg) => msg.includes("回合開始回復"))).toBe(true);
  });

  test("補 MP 唔會超過 maxMp（8）", () => {
    const state = createMatch();
    const [p1] = state.players;

    // 將 p1.mp 設為接近上限
    p1.mp = 7;

    // 第 1 回合
    submitSelection(state, "P1", []);
    submitSelection(state, "P2", []);
    playOneTurn(state);

    // 第 2 回合開始補 3 MP，但上限 8
    expect(p1.mp).toBe(8);
  });
});
