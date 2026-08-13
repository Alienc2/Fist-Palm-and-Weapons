// tests/rules/comboResolver.boardPattern.test.js
// I-02-E：board_pattern combo 修正（方案 A）
// 驗證揭牌時針對實際 target 偵測 board_pattern combo

const { createMatch, submitSelection, playOneTurn } = require("../../server/game/gameEngine");
const {
  detectBoardPattern,
  resolveCombos,
} = require("../../server/game/rules/comboResolver");

describe("detectBoardPattern", () => {
  test("line：同列/同行且有 ≥2 敵方直線為 true，只有 1 個直線敵方為 false", () => {
    const source = { id: "P1", position: { x: 2, y: 2 } };
    const sameRowTarget = { id: "P2", position: { x: 4, y: 2 } };
    const sameColAlly = { id: "P3", position: { x: 4, y: 4 } };
    const diagonal = { id: "P4", position: { x: 3, y: 3 } };

    const lineState = {
      players: [source, sameRowTarget, sameColAlly],
    };
    expect(detectBoardPattern(lineState, source, sameRowTarget, "line")).toBe(true);

    const singleState = {
      players: [source, sameRowTarget],
    };
    expect(detectBoardPattern(singleState, source, sameRowTarget, "line")).toBe(false);
    expect(detectBoardPattern(lineState, source, diagonal, "line")).toBe(false);
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
  test("攻擊目標與另一名敵方同一直線時，觸發 combo_line_attack", () => {
    const state = createMatch({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
        { id: "P2", position: { x: 1, y: 2 }, characterId: "char_defense" },
        { id: "P3", position: { x: 1, y: 3 }, characterId: "char_move" },
      ],
    });
    const [p1, p2, p3] = state.players;

    // P1 喺 (1,1)，P2 喺 (1,2)，P3 喺 (1,3)：全部同列（dx=0），≥2 敵方成直線
    p1.facing = "up";

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
    submitSelection(state, "P3", []);

    playOneTurn(state);

    // 揭牌時針對實際 target 偵測，觸發 combo_line_attack
    expect(state.log.some((msg) => msg.includes("combo_line_attack"))).toBe(true);
  });

  test("只有 1 名直線敵人時，唔會觸發 combo_line_attack", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    // P1 喺 (1,1)，P2 喺 (1,2)：同列（dx=0），但只得 1 名直線敵人
    p1.position = { x: 1, y: 1 };
    p2.position = { x: 1, y: 2 };
    p1.facing = "up";

    const attackCard = {
      id: "test_line_attack_single",
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

    // 只有 1 個直線敵人，唔觸發
    expect(state.log.some((msg) => msg.includes("combo_line_attack"))).toBe(false);
  });

  test("攻擊與目標成斜線時，唔會觸發 combo_line_attack", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    // P1 喺 (1,1)，P2 喺 (2,2)：斜線（dx=1, dy=1），唔成直線
    p1.position = { x: 1, y: 1 };
    p2.position = { x: 2, y: 2 };
    p1.facing = "up";

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
  });
});

describe("combo_line_attack 多目標直線範圍攻擊", () => {
  test("兩個直線敵人同時被攻擊", () => {
    const state = createMatch({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
        { id: "P2", position: { x: 1, y: 2 }, characterId: "char_defense" },
        { id: "P3", position: { x: 1, y: 3 }, characterId: "char_move" },
      ],
    });
    const [p1, p2, p3] = state.players;

    // P1 喺 (1,1)，P2 喺 (1,2)，P3 喺 (1,3)：全部同列（dx=0），成直線
    p1.facing = "up";

    const attackCard = {
      id: "test_line_multi",
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
    submitSelection(state, "P3", []);

    playOneTurn(state);

    // 觸發 combo_line_attack，同時攻擊兩個直線敵人
    expect(state.log.some((msg) => msg.includes("combo_line_attack"))).toBe(true);
    expect(state.log.some((msg) => msg.includes("同時攻擊"))).toBe(true);
  });


  test("只有一個直線敵人時，唔會觸發多目標直線攻擊", () => {
    const state = createMatch({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
        { id: "P2", position: { x: 1, y: 2 }, characterId: "char_defense" },
        { id: "P3", position: { x: 3, y: 3 }, characterId: "char_move" },
      ],
    });
    const [p1, p2, p3] = state.players;

    // P1 喺 (1,1)，P2 喺 (1,2) 同列，P3 喺 (3,3) 斜線
    p1.facing = "up";

    const attackCard = {
      id: "test_line_single",
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
    submitSelection(state, "P3", []);

    playOneTurn(state);

    // 只有 1 個直線敵人，唔會觸發多目標直線攻擊（同時攻擊 log 唔出現）
    expect(state.log.some((msg) => msg.includes("同時攻擊"))).toBe(false);
  });
});





