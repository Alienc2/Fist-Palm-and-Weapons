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
  test("攻擊命中時，會觸發防禦殘留，並完成抽牌與手牌上限檢查", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    // 將玩家位置拉近，確保攻擊會命中，先能測到防禦殘留
    p1.position = { x: 1, y: 1 };
    p2.position = { x: 1, y: 2 };

    const p1Defense = p1.hand.find((c) => c.type === "defense");
    const p2Attack = p2.hand.find((c) => c.type === "attack");

    submitSelection(state, "P1", [{ card: p1Defense }]);
    submitSelection(state, "P2", [{ card: p2Attack }]);

    playOneTurn(state);

    expect(state.log.some((msg) => msg.includes("防禦殘留觸發"))).toBe(true);
    state.players.forEach((p) => {
      expect(p.hand.length).toBeLessThanOrEqual(8);
    });
  });

  test("距離不符時，不會觸發防禦殘留", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    const p1Defense = p1.hand.find((c) => c.type === "defense");
    const p2Attack = p2.hand.find((c) => c.type === "attack");

    submitSelection(state, "P1", [{ card: p1Defense }]);
    submitSelection(state, "P2", [{ card: p2Attack }]);

    playOneTurn(state);

    expect(state.log.some((msg) => msg.includes("距離不符"))).toBe(true);
    expect(state.log.some((msg) => msg.includes("防禦殘留觸發"))).toBe(false);
  });
});

describe("move 規則", () => {
  test("合法移動會更新位置", () => {
    const state = createMatch();
    const [p1] = state.players;

    const moveCard = {
      id: "basic_move",
      type: "move",
      subtype: "step",
      mpCost: 1,
      moveMin: 1,
      moveMax: 1,
    };

    submitSelection(state, "P1", [
      { card: moveCard, extra: { moveDecision: { dx: 1, dy: 0 } } },
    ]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(p1.position).toEqual({ x: 2, y: 1 });
    expect(state.log.some((msg) => msg.includes("移動到 (2,1)"))).toBe(true);
  });

  test("非法移動不會更新位置", () => {
    const state = createMatch();
    const [p1] = state.players;

    const moveCard = {
      id: "basic_move",
      type: "move",
      subtype: "step",
      mpCost: 1,
      moveMin: 1,
      moveMax: 1,
    };

    submitSelection(state, "P1", [
      { card: moveCard, extra: { moveDecision: { dx: 2, dy: 0 } } },
    ]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(p1.position).toEqual({ x: 1, y: 1 });
    expect(state.log.some((msg) => msg.includes("步數不合法"))).toBe(true);
  });
});

describe("buy 規則", () => {
  test("使用 basic_buy 會寫入商店 log", () => {
    const state = createMatch();

    const buyCard = {
      id: "basic_buy",
      type: "buy",
      subtype: "shop",
      mpCost: 0,
    };

    submitSelection(state, "P1", [{ card: buyCard }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(state.log.some((msg) => msg.includes("進入商店"))).toBe(true);
  });
});

describe("advanced edge KO 規則", () => {
  test("邊緣 + HP 低於 3 + advanced 攻擊命中時會出場", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    p1.position = { x: 1, y: 1 };
    p2.position = { x: 0, y: 1 }; // 邊緣
    p2.hp = 2;

    const advancedAttack = {
      id: "shop_adv_punch_1",
      type: "attack",
      subtype: "punch",
      mpCost: 2,
      rangeMin: 1,
      rangeMax: 1,
      damage: 3,
      keywords: ["advanced"],
    };

    submitSelection(state, "P1", [{ card: advancedAttack }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(p2.isEliminated).toBe(true);
    expect(state.log.some((msg) => msg.includes("擊出場外"))).toBe(true);
  });
});

describe("counter 規則（deterministic）", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("100% 成功率的反擊會成功", () => {
    const { resolveCounter } = require("../../server/game/rules/cardResolver");
    const state = { log: [] };
    const defender = { id: "P2" };

    jest.spyOn(Math, "random").mockReturnValue(0.99);

    const result = resolveCounter(
      state,
      { ...defender },
      { id: "counter_palm", subtype: "palm" },
      2,
      "punch"
    );

    expect(result.reflected).toBe(true);
    expect(result.damageToAttacker).toBe(4);
  });

  test("80% 成功率的反擊在 roll 0.81 時會失敗", () => {
    const { resolveCounter } = require("../../server/game/rules/cardResolver");
    const state = { log: [] };
    const defender = { id: "P2" };

    jest.spyOn(Math, "random").mockReturnValue(0.81);

    const result = resolveCounter(
      state,
      { ...defender },
      { id: "shop_counter_1", subtype: "any" },
      2,
      "punch"
    );

    expect(result.reflected).toBe(false);
    expect(result.damageToAttacker).toBe(0);
  });

  test("60% 成功率的反擊在 roll 0.61 時會失敗", () => {
    const { resolveCounter } = require("../../server/game/rules/cardResolver");
    const state = { log: [] };
    const defender = { id: "P2" };

    jest.spyOn(Math, "random").mockReturnValue(0.61);

    const result = resolveCounter(
      state,
      { ...defender },
      { id: "counter_punch", subtype: "punch" },
      2,
      "palm"
    );

    expect(result.reflected).toBe(false);
    expect(result.damageToAttacker).toBe(0);
  });
});