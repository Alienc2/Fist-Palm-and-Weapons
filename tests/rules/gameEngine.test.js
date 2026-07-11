// tests/rules/gameEngine.test.js

const { createMatch, submitSelection, playOneTurn } = require("../../server/game/gameEngine");
const { manhattanDistance } = require("../../server/game/rules/distance");
const { getFacingModifiers } = require("../../server/game/rules/facing");

describe("distance (曼哈頓)", () => {
  test("直線距離1，斜線距離2", () => {
    const d1 = manhattanDistance({ x: 1, y: 1 }, { x: 2, y: 1 });
    const d2 = manhattanDistance({ x: 1, y: 1 }, { x: 2, y: 2 });
    expect(d1).toBe(1);
    expect(d2).toBe(2);
  });
});

describe("facing 修正", () => {
  test("正面／背面／側面修正", () => {
    const attacker = { position: { x: 1, y: 1 }, facing: "up" };
    const frontTarget = { position: { x: 1, y: 0 } };
    const backTarget = { position: { x: 1, y: 2 } };
    const sideTarget = { position: { x: 2, y: 1 } };

    const frontMod = getFacingModifiers(attacker, frontTarget);
    const backMod = getFacingModifiers(attacker, backTarget);
    const sideMod = getFacingModifiers(attacker, sideTarget);

    expect(frontMod.relation).toBe("front");
    expect(frontMod.damage).toBe(1);

    expect(backMod.relation).toBe("back");
    expect(backMod.damage).toBe(1);
    expect(backMod.defense).toBe(-1);

    expect(sideMod.relation).toBe("side");
    expect(sideMod.damage).toBe(0);
  });
});

describe("簡單一回合攻擊、防禦、Draw/Discard", () => {
  test("攻擊＋防禦殘留＋抽牌＋棄到上限", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    // P1: 防禦、P2: 攻擊
    const p1Defense = p1.hand.find((c) => c.type === "defense");
    const p2Attack = p2.hand.find((c) => c.type === "attack");

    submitSelection(state, "P1", [{ card: p1Defense }]);
    submitSelection(state, "P2", [{ card: p2Attack }]);

    playOneTurn(state);

    // 檢查防禦殘留被用掉（hp 減少但有 log）
    expect(state.log.some((msg) => msg.includes("防禦殘留觸發"))).toBe(true);
    // 回合後手牌不超過8
    state.players.forEach((p) => {
      expect(p.hand.length).toBeLessThanOrEqual(8);
    });
  });
});