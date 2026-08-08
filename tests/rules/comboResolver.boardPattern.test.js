// tests/rules/comboResolver.boardPattern.test.js
// I-02-E：board_pattern combo 修正（方案 A）
// 驗證揭牌時針對實際 target 偵測 board_pattern combo

const { createMatch, submitSelection, playOneTurn } = require("../../server/game/gameEngine");
const {
  detectBoardPattern,
  resolveCombos,
} = require("../../server/game/rules/comboResolver");

describe("detectBoardPattern", () => {
  test("line：同列或同行（dx=0 或 dy=0）為 true", () => {
    const source = { position: { x: 2, y: 2 } };
    const sameRow = { position: { x: 4, y: 2 } };
    const sameCol = { position: { x: 2, y: 4 } };
    const diagonal = { position: { x: 3, y: 3 } };

    expect(detectBoardPattern({}, source, sameRow, "line")).toBe(true);
    expect(detectBoardPattern({}, source, sameCol, "line")).toBe(true);
    expect(detectBoardPattern({}, source, diagonal, "line")).toBe(false);
  });

  test("diagonal：dx === dy 且 dx > 0 為 true", () => {
    const source = { position: { x: 2, y: 2 } };
    const diagonal = { position: { x: 3, y: 3 } };
    const sameRow = { position: { x: 4, y: 2 } };

    expect(detectBoardPattern({}, source, diagonal, "diagonal")).toBe(true);
    expect(detectBoardPattern({}, source, sameRow, "diagonal")).toBe(false);
  });

  test("surround：目標被至少 2 個敵方相鄰為 true", () => {
    const target = { id: "P2", position: { x: 2, y: 2 } };
    const state = {
      players: [
        { id: "P1", position: { x: 1, y: 2 } },
        { id: "P3", position: { x: 2, y: 1 } },
        target,
      ],
    };

    expect(detectBoardPattern(state, state.players[0], target, "surround")).toBe(true);
  });

  test("surround：目標只被 1 個敵方相鄰為 false", () => {
    const target = { id: "P2", position: { x: 2, y: 2 } };
    const state = {
      players: [
        { id: "P1", position: { x: 1, y: 2 } },
        target,
      ],
    };

    expect(detectBoardPattern(state, state.players[0], target, "surround")).toBe(false);
  });

  test("none 或空 pattern 一律為 true", () => {
    const source = { position: { x: 2, y: 2 } };
    const target = { position: { x: 3, y: 3 } };
    expect(detectBoardPattern({}, source, target, "none")).toBe(true);
    expect(detectBoardPattern({}, source, target, "")).toBe(true);
  });
});

describe("resolveCombos board_pattern（方案 A：揭牌時針對實際 target）", () => {
  test("攻擊與目標成直線時，觸發 combo_line_attack 傷害 +1", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    // P1 喺 (1,1)，P2 喺 (1,2)：同列（dx=0），成直線
    p1.position = { x: 1, y: 1 };
    p2.position = { x: 1, y: 2 };
    p1.facing = "up";

    const hpBefore = p2.hp;

    const attackCard = {
      id: "test_line_attack",
      type: "attack",
      subtype: "punch",
      group: "advanced",
      targeting: "single_enemy",
      rangeMin: 1,
      rangeMax: 1,
      damage: 1,
      mpCost: 0,
    };

    submitSelection(state, "P1", [{ card: attackCard }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    // 觸發 combo_line_attack：傷害 +1
    expect(state.log.some((msg) => msg.includes("combo_line_attack"))).toBe(true);
    // 基礎傷害 1 + front damage 1 + combo bonus 1 = 3
    expect(p2.hp).toBe(hpBefore - 3);
  });

  test("攻擊與目標成斜線時，唔會觸發 combo_line_attack", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    // P1 喺 (1,1)，P2 喺 (2,2)：斜線（dx=1, dy=1），唔成直線
    p1.position = { x: 1, y: 1 };
    p2.position = { x: 2, y: 2 };
    p1.facing = "up";

    const hpBefore = p2.hp;

    const attackCard = {
      id: "test_diag_attack",
      type: "attack",
      subtype: "punch",
      group: "advanced",
      targeting: "single_enemy",
      rangeMin: 1,
      rangeMax: 2,
      damage: 1,
      mpCost: 0,
    };

    submitSelection(state, "P1", [{ card: attackCard }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(state.log.some((msg) => msg.includes("combo_line_attack"))).toBe(false);
    // 唔觸發 combo，基礎傷害 1 + front damage 1 = 2
    expect(p2.hp).toBe(hpBefore - 2);
  });
});
