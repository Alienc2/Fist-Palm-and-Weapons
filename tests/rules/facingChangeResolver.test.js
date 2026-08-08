// tests/rules/facingChangeResolver.test.js

const {
  isValidFacing,
  setFacingChange,
  applyFacingChange,
  VALID_FACINGS,
} = require("../../server/game/rules/facingChangeResolver");
const {
  createMatch,
  submitSelection,
  setFacing,
  playOneTurn,
} = require("../../server/game/gameEngine");

describe("facingChangeResolver", () => {
  test("VALID_FACINGS 包含 up/down/left/right", () => {
    expect(VALID_FACINGS).toEqual(["up", "down", "left", "right"]);
  });

  test("isValidFacing 判斷合法朝向", () => {
    expect(isValidFacing("up")).toBe(true);
    expect(isValidFacing("down")).toBe(true);
    expect(isValidFacing("left")).toBe(true);
    expect(isValidFacing("right")).toBe(true);
    expect(isValidFacing("diagonal")).toBe(false);
    expect(isValidFacing("")).toBe(false);
  });

  test("setFacingChange 設定合法朝向", () => {
    const player = { id: "P1", facing: "up" };
    const result = setFacingChange(player, "down");
    expect(result).toEqual({ ok: true, facing: "down" });
    expect(player.facingChange).toBe("down");
  });

  test("setFacingChange 接受 none 表示不轉向", () => {
    const player = { id: "P1", facing: "up" };
    const result = setFacingChange(player, "none");
    expect(result).toEqual({ ok: true, facing: "up" });
    expect(player.facingChange).toBe("none");
  });

  test("setFacingChange 拒絕非法朝向", () => {
    const player = { id: "P1", facing: "up" };
    const result = setFacingChange(player, "diagonal");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INVALID_FACING");
    expect(player.facingChange).toBeUndefined();
  });

  test("applyFacingChange 套用轉向並寫 log", () => {
    const player = { id: "P1", facing: "up", facingChange: "right" };
    const state = { log: [] };
    const result = applyFacingChange(state, player);
    expect(result).toEqual({ changed: true, facing: "right" });
    expect(player.facing).toBe("right");
    expect(player.facingChange).toBe("none");
    expect(state.log.some((msg) => msg.includes("轉向 up -> right"))).toBe(true);
  });

  test("applyFacingChange 對 none 不改變朝向", () => {
    const player = { id: "P1", facing: "up", facingChange: "none" };
    const state = { log: [] };
    const result = applyFacingChange(state, player);
    expect(result).toEqual({ changed: false, facing: "up" });
    expect(player.facing).toBe("up");
    expect(state.log).toHaveLength(0);
  });
});

describe("facing change 透過 turnEngine 整合", () => {
  test("setFacing 後 playOneTurn 會套用轉向", () => {
    const state = createMatch();
    const [p1] = state.players;

    p1.facing = "up";
    setFacing(state, "P1", "down");

    submitSelection(state, "P1", []);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(p1.facing).toBe("down");
    expect(state.log.some((msg) => msg.includes("轉向 up -> down"))).toBe(true);
  });

  test("未設定 facingChange 時朝向不變", () => {
    const state = createMatch();
    const [p1] = state.players;

    p1.facing = "left";

    submitSelection(state, "P1", []);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(p1.facing).toBe("left");
  });

  test("facing 會影響攻擊的 facing 修正", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    // P1 在 (1,1) 面向 down，P2 在 (1,2)（P1 正面）
    p1.position = { x: 1, y: 1 };
    p2.position = { x: 1, y: 2 };
    p1.facing = "down";

    const attackCard = {
      id: "basic_punch",
      type: "attack",
      subtype: "punch",
      mpCost: 1,
      rangeMin: 1,
      rangeMax: 1,
      damage: 2,
      keywords: ["basic"],
    };

    const hpBefore = p2.hp;

    submitSelection(state, "P1", [{ card: attackCard }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    // P2 為正面：damage 2 + front 1 + 破軍被動 front_damage_bonus 1 = 4
    expect(p2.hp).toBe(hpBefore - 4);
  });

});
