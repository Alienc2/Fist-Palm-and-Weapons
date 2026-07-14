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

    const p1Defense = {
      id: "test_basic_guard",
      type: "defense",
      subtype: "any",
      mpCost: 1,
      blockValue: 3,
    };

    const p2Attack = {
      id: "test_basic_punch",
      type: "attack",
      subtype: "punch",
      mpCost: 1,
      rangeMin: 1,
      rangeMax: 1,
      damage: 2,
      keywords: ["basic"],
    };

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

    const p1Defense = {
      id: "test_basic_guard",
      type: "defense",
      subtype: "any",
      mpCost: 1,
      blockValue: 3,
    };

    const p2Attack = {
      id: "test_basic_punch",
      type: "attack",
      subtype: "punch",
      mpCost: 1,
      rangeMin: 1,
      rangeMax: 1,
      damage: 2,
      keywords: ["basic"],
    };

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

describe("shopResolver / buy 流程", () => {
  test("使用 buy 卡並指定 shopCardId 時，會成功購買並加入 discard", () => {
    const state = createMatch();
    const [p1] = state.players;

    p1.mp = 99;

    const buyCard = {
      id: "basic_buy",
      type: "buy",
      subtype: "shop",
      mpCost: 0,
    };

    state.shop.cards = [
      {
        id: "test_shop_card_1",
        type: "recover",
        subtype: "shop",
        name_zh: "測試商店卡 1",
        group: "shop",
        buyCost: 2,
        stock: 3,
      },
    ];

    const targetShopCard = state.shop.cards[0];
    const beforeStock = targetShopCard.stock;
    const beforeDiscard = p1.discard.length;
    const beforeMp = p1.mp;

    submitSelection(state, "P1", [{ card: buyCard, extra: { shopCardId: targetShopCard.id } }]);    
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(p1.discard.length).toBe(beforeDiscard + 1);
    expect(p1.mp).toBe(beforeMp - targetShopCard.buyCost);

    const updatedShopCard = state.shop.cards.find((card) => card.id === targetShopCard.id);
    expect(updatedShopCard.stock).toBe(beforeStock - 1);
    expect(state.log.some((msg) => msg.includes("購買"))).toBe(true);
  });

  test("MP 不足時不會成功購買", () => {
    const state = createMatch();
    const [p1] = state.players;

    p1.mp = 0;

    const buyCard = {
      id: "basic_buy",
      type: "buy",
      subtype: "shop",
      mpCost: 0,
    };

    state.shop.cards = [
      {
        id: "test_shop_card_2",
        type: "recover",
        subtype: "shop",
        name_zh: "測試商店卡 2",
        group: "shop",
        buyCost: 3,
        stock: 2,
      },
    ];

    const expensiveShopCard = state.shop.cards[0];
    const beforeStock = expensiveShopCard.stock;
    const beforeDiscard = p1.discard.length;
    submitSelection(state, "P1", [{ card: buyCard, extra: { shopCardId: expensiveShopCard.id } }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(p1.discard.length).toBe(beforeDiscard);
    const updatedShopCard = state.shop.cards.find((card) => card.id === expensiveShopCard.id);
    expect(updatedShopCard.stock).toBe(beforeStock);
    expect(state.log.some((msg) => msg.includes("MP 不足"))).toBe(true);
  });

  test("庫存為 0 時不會成功購買", () => {
    const state = createMatch();
    const [p1] = state.players;

    p1.mp = 99;

    const buyCard = {
      id: "basic_buy",
      type: "buy",
      subtype: "shop",
      mpCost: 0,
    };

    state.shop.cards = [
      {
        id: "test_shop_card_3",
        type: "recover",
        subtype: "shop",
        name_zh: "測試商店卡 3",
        group: "shop",
        buyCost: 1,
        stock: 0,
      },
    ];

    const targetShopCard = state.shop.cards[0];
    const beforeDiscard = p1.discard.length;

    submitSelection(state, "P1", [{ card: buyCard, extra: { shopCardId: targetShopCard.id } }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(p1.discard.length).toBe(beforeDiscard);
    expect(state.log.some((msg) => msg.includes("已無庫存"))).toBe(true);
  });
});

describe("advanced edge KO 規則", () => {
  test("邊緣 + HP 低於 3 + advanced 攻擊命中時會出場", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    p1.position = { x: 1, y: 2 };
    p2.position = { x: 0, y: 2 }; // 邊緣
    p2.hp = 2;

    const attackCard = {
      id: "test_advanced_edge_ko",
      type: "attack",
      subtype: "punch",
      group: "advanced",
      rangeMin: 1,
      rangeMax: 1,
      damage: 1,
      mpCost: 0,
    };

    submitSelection(state, "P1", [{ card: attackCard }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(p2.isEliminated).toBe(true);
    expect(
      state.log.some((msg) => msg.includes("邊緣") && msg.includes("擊出"))
    ).toBe(true);
  });
  test("一般攻擊令目標 HP 歸零時會出場", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    p2.hp = 1;
    p1.position = { x: 1, y: 1 };
    p2.position = { x: 1, y: 2 };

    const attackCard = {
      id: "test_advanced_edge_ko",
      type: "attack",
      subtype: "punch",
      group: "advanced",
      rangeMin: 1,
      rangeMax: 1,
      damage: 1,
      mpCost: 0,
    };

    submitSelection(state, "P1", [{ card: attackCard }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    expect(p2.isEliminated).toBe(true);
    expect(state.log.some((msg) => msg.includes("HP 歸零"))).toBe(true);
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

describe("advantage 規則", () => {
  test("拳打武器時有 advantage，傷害會增加", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    p1.position = { x: 1, y: 1 };
    p2.position = { x: 1, y: 2 };

    // 令 defender 暫時暴露為 weapon 類型
    p2.lastRevealedSubtype = "weapon";

    const punchAttack = {
      id: "basic_punch",
      type: "attack",
      subtype: "punch",
      mpCost: 1,
      rangeMin: 1,
      rangeMax: 1,
      damage: 2,
      keywords: ["basic"],
    };

    submitSelection(state, "P1", [{ card: punchAttack }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    // front damage +1，再加 advantage damage +1，總傷害應為 4
    expect(state.log.some((msg) => msg.includes("造成 4 傷害"))).toBe(true);
  });

  test("拳打掌時有 disadvantage，傷害會減少", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    p1.position = { x: 1, y: 1 };
    p2.position = { x: 1, y: 2 };

    // 令 defender 暫時暴露為 palm 類型
    p2.lastRevealedSubtype = "palm";

    const punchAttack = {
      id: "basic_punch",
      type: "attack",
      subtype: "punch",
      mpCost: 1,
      rangeMin: 1,
      rangeMax: 1,
      damage: 2,
      keywords: ["basic"],
    };

    submitSelection(state, "P1", [{ card: punchAttack }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    // front damage +1，再加 disadvantage damage -1，總傷害應為 2
    expect(state.log.some((msg) => msg.includes("造成 2 傷害"))).toBe(true);
  });

  test("無 defender subtype 時，advantage 視為 neutral", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    p1.position = { x: 1, y: 1 };
    p2.position = { x: 1, y: 2 };

    const punchAttack = {
      id: "basic_punch",
      type: "attack",
      subtype: "punch",
      mpCost: 1,
      rangeMin: 1,
      rangeMax: 1,
      damage: 2,
      keywords: ["basic"],
    };

    submitSelection(state, "P1", [{ card: punchAttack }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    // 只有 front damage +1，總傷害應為 3
    expect(state.log.some((msg) => msg.includes("造成 3 傷害"))).toBe(true);
  });
});

describe("resolveTurn 交錯揭牌順序", () => {
  test("起手玩家與另一玩家會按 reveal index 交錯結算多張牌", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    // 維持 startingPlayerIndex = 0，令 P1 先手
    state.startingPlayerIndex = 0;

    const p1Move = {
      id: "basic_move",
      type: "move",
      subtype: "step",
      mpCost: 1,
      moveMin: 1,
      moveMax: 1,
    };

    const p1Buy = {
      id: "basic_buy",
      type: "buy",
      subtype: "shop",
      mpCost: 0,
    };

    const p2Defense = {
      id: "basic_guard",
      type: "defense",
      subtype: "any",
      mpCost: 1,
      blockValue: 3,
    };

    const p2Move = {
      id: "basic_move",
      type: "move",
      subtype: "step",
      mpCost: 1,
      moveMin: 1,
      moveMax: 1,
    };

    submitSelection(state, "P1", [
      { card: p1Move, extra: { moveDecision: { dx: 1, dy: 0 } } },
      { card: p1Buy },
    ]);

    submitSelection(state, "P2", [
      { card: p2Defense },
      { card: p2Move, extra: { moveDecision: { dx: -1, dy: 0 } } },
    ]);

    playOneTurn(state);

    const p1MoveIndex = state.log.findIndex((msg) => msg.includes("P1 移動到 (2,1)"));
    const p2DefenseIndex = state.log.findIndex((msg) => msg.includes("P2 使用防禦 basic_guard"));
    const p1BuyIndex = state.log.findIndex((msg) => msg.includes("P1 使用 basic_buy 進入商店"));
    const p2MoveIndex = state.log.findIndex((msg) => msg.includes("P2 移動到 (2,3)"));

    expect(p1MoveIndex).toBeGreaterThanOrEqual(0);
    expect(p2DefenseIndex).toBeGreaterThanOrEqual(0);
    expect(p1BuyIndex).toBeGreaterThanOrEqual(0);
    expect(p2MoveIndex).toBeGreaterThanOrEqual(0);

    expect(p1MoveIndex).toBeLessThan(p2DefenseIndex);
    expect(p2DefenseIndex).toBeLessThan(p1BuyIndex);
    expect(p1BuyIndex).toBeLessThan(p2MoveIndex);
  });

  test("當 startingPlayerIndex = 1 時，P2 會先於 P1 結算第 1 張牌", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    state.startingPlayerIndex = 1;

    const p1Buy = {
      id: "basic_buy",
      type: "buy",
      subtype: "shop",
      mpCost: 0,
    };

    const p2Defense = {
      id: "basic_guard",
      type: "defense",
      subtype: "any",
      mpCost: 1,
      blockValue: 3,
    };

    submitSelection(state, "P1", [{ card: p1Buy }]);
    submitSelection(state, "P2", [{ card: p2Defense }]);

    playOneTurn(state);

    const p2DefenseIndex = state.log.findIndex((msg) => msg.includes("P2 使用防禦 basic_guard"));
    const p1BuyIndex = state.log.findIndex((msg) => msg.includes("P1 使用 basic_buy 進入商店"));

    expect(p2DefenseIndex).toBeGreaterThanOrEqual(0);
    expect(p1BuyIndex).toBeGreaterThanOrEqual(0);
    expect(p2DefenseIndex).toBeLessThan(p1BuyIndex);
  });  

});

describe("data-driven initialization", () => {
  test("createMatch 會從角色資料初始化 HP / MP / 手牌數", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    expect(p1.characterId).toBeTruthy();
    expect(p2.characterId).toBeTruthy();
    expect(typeof p1.characterId).toBe("string");
    expect(typeof p2.characterId).toBe("string");

    expect(p1.hp).toBeGreaterThan(0);
    expect(p1.mp).toBeGreaterThanOrEqual(0);
    expect(p1.hand.length).toBeGreaterThan(0);

    expect(p2.hp).toBeGreaterThan(0);
    expect(p2.mp).toBeGreaterThanOrEqual(0);
    expect(p2.hand.length).toBeGreaterThan(0);
  });

  test("basic deck 應由 generated/cards.json 載入", () => {
    const state = createMatch();
    const [p1] = state.players;

    const allCards = [...p1.hand, ...p1.deck];
    const allCardIds = allCards.map((card) => card.id);

    expect(allCardIds.length).toBeGreaterThan(0);
    expect(allCards.every((card) => card.id)).toBe(true);
    expect(allCards.every((card) => card.type)).toBe(true);
    expect(allCardIds.some((id) => id.startsWith("basic_"))).toBe(true);
  });
});