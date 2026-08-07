// tests/ai/aiDecision.test.js
// Phase F：AI decision making 單元測試

const {
  getProfile,
  findNearestEnemy,
  pickCardTypeByWeight,
  pickCardOfType,
  buildAttackExtra,
  buildMoveExtra,
  buildBuyExtra,
  decideSelection,
  DEFAULT_PROFILE_ID,
} = require("../../server/game/ai/aiDecision");

describe("getProfile", () => {
  test("回傳 ai_normal profile 並有權重欄位", () => {
    const profile = getProfile("ai_normal");
    expect(profile).toBeTruthy();
    expect(profile.id).toBe("ai_normal");
    expect(typeof profile.attackWeight).toBe("number");
    expect(typeof profile.defenseWeight).toBe("number");
    expect(typeof profile.moveWeight).toBe("number");
    expect(typeof profile.buyWeight).toBe("number");
    expect(typeof profile.recoverWeight).toBe("number");
    expect(typeof profile.comboWeight).toBe("number");
  });

  test("找不到指定 profile 時 fallback 到預設 profile", () => {
    const profile = getProfile("ai_does_not_exist");
    expect(profile.id).toBe(DEFAULT_PROFILE_ID);
  });

  test("未指定 profile 時使用預設 profile", () => {
    const profile = getProfile();
    expect(profile.id).toBe(DEFAULT_PROFILE_ID);
  });
});

describe("findNearestEnemy", () => {
  test("找出距離最近的合法敵人", () => {
    const player = { id: "P1", position: { x: 1, y: 1 } };
    const players = [
      { id: "P1", position: { x: 1, y: 1 } },
      { id: "P2", position: { x: 3, y: 3 } },
      { id: "P3", position: { x: 1, y: 2 } },
    ];
    const { enemy, distance } = findNearestEnemy(player, players);
    expect(enemy.id).toBe("P3");
    expect(distance).toBe(1);
  });

  test("跳過已淘汰的敵人", () => {
    const player = { id: "P1", position: { x: 1, y: 1 } };
    const players = [
      { id: "P1", position: { x: 1, y: 1 } },
      { id: "P2", position: { x: 1, y: 2 }, isEliminated: true },
      { id: "P3", position: { x: 3, y: 3 } },
    ];
    const { enemy } = findNearestEnemy(player, players);
    expect(enemy.id).toBe("P3");
  });

  test("沒有合法敵人時回傳 null", () => {
    const player = { id: "P1", position: { x: 1, y: 1 } };
    const players = [{ id: "P1", position: { x: 1, y: 1 } }];
    const { enemy } = findNearestEnemy(player, players);
    expect(enemy).toBeNull();
  });
});

describe("pickCardTypeByWeight", () => {
  const profile = {
    attackWeight: 1,
    defenseWeight: 1,
    moveWeight: 1,
    buyWeight: 0.8,
    recoverWeight: 0.8,
  };

  test("roll 很小時選 attack", () => {
    const type = pickCardTypeByWeight(profile, () => 0.01);
    expect(type).toBe("attack");
  });

  test("roll 落在 defense 區間時選 defense", () => {
    // attack 佔 1，defense 佔 1，總和 4.6
    // roll 1.2 落在 defense（1 ~ 2）
    const type = pickCardTypeByWeight(profile, () => 1.2 / 4.6);
    expect(type).toBe("defense");
  });

  test("所有權重為 0 時 fallback 到 attack", () => {
    const zeroProfile = {
      attackWeight: 0,
      defenseWeight: 0,
      moveWeight: 0,
      buyWeight: 0,
      recoverWeight: 0,
    };
    const type = pickCardTypeByWeight(zeroProfile, () => 0.5);
    expect(type).toBe("attack");
  });
});

describe("pickCardOfType", () => {
  test("從手牌中挑選指定 type 的卡", () => {
    const player = {
      hand: [
        { id: "c1", type: "attack" },
        { id: "c2", type: "defense" },
        { id: "c3", type: "attack" },
      ],
    };
    const card = pickCardOfType(player, "attack", () => 0);
    expect(card.type).toBe("attack");
  });

  test("手牌沒有該 type 時回傳 null", () => {
    const player = { hand: [{ id: "c1", type: "attack" }] };
    const card = pickCardOfType(player, "move", () => 0);
    expect(card).toBeNull();
  });
});

describe("buildAttackExtra", () => {
  test("回傳最近敵人的 preferredTargetId", () => {
    const player = { id: "P1", position: { x: 1, y: 1 } };
    const players = [
      { id: "P1", position: { x: 1, y: 1 } },
      { id: "P2", position: { x: 1, y: 2 } },
    ];
    const extra = buildAttackExtra(player, players, { id: "attack" });
    expect(extra.preferredTargetId).toBe("P2");
  });
});

describe("buildMoveExtra", () => {
  test("向最近敵人靠近（單軸）", () => {
    const player = { id: "P1", position: { x: 1, y: 1 } };
    const players = [
      { id: "P1", position: { x: 1, y: 1 } },
      { id: "P2", position: { x: 3, y: 1 } },
    ];
    const extra = buildMoveExtra(player, players, { id: "move" });
    expect(extra.dx).toBe(1);
    expect(extra.dy).toBe(0);
  });

  test("雙軸距離時只取其中一軸", () => {
    const player = { id: "P1", position: { x: 1, y: 1 } };
    const players = [
      { id: "P1", position: { x: 1, y: 1 } },
      { id: "P2", position: { x: 3, y: 3 } },
    ];
    const extra = buildMoveExtra(player, players, { id: "move" }, () => 0);
    // rng < 0.5 時取 dx
    expect(extra.dx).toBe(1);
    expect(extra.dy).toBe(0);
  });
});

describe("buildBuyExtra", () => {
  test("挑最貴且買得起的商店卡", () => {
    const player = { id: "P1", mp: 5 };
    const shop = {
      cards: [
        { id: "s1", buyCost: 2, stock: 1 },
        { id: "s2", buyCost: 4, stock: 1 },
        { id: "s3", buyCost: 6, stock: 1 },
      ],
    };
    const extra = buildBuyExtra(player, { id: "buy" }, shop);
    expect(extra.shopCardId).toBe("s2");
  });

  test("沒有買得起的卡時回傳空物件", () => {
    const player = { id: "P1", mp: 1 };
    const shop = {
      cards: [{ id: "s1", buyCost: 5, stock: 1 }],
    };
    const extra = buildBuyExtra(player, { id: "buy" }, shop);
    expect(extra).toEqual({});
  });
});

describe("decideSelection", () => {
  test("回傳 selection 陣列，每項有 card 與 extra", () => {
    const player = {
      id: "P1",
      position: { x: 1, y: 1 },
      mp: 10,
      hand: [
        { id: "c1", type: "attack" },
        { id: "c2", type: "move" },
        { id: "c3", type: "defense" },
      ],
    };
    const players = [
      { id: "P1", position: { x: 1, y: 1 } },
      { id: "P2", position: { x: 3, y: 3 } },
    ];
    const selections = decideSelection(player, players, {
      profileId: "ai_normal",
      rng: () => 0.01,
      maxCards: 1,
    });

    expect(Array.isArray(selections)).toBe(true);
    expect(selections.length).toBeGreaterThanOrEqual(1);
    for (const item of selections) {
      expect(item.card).toBeTruthy();
      expect(item.extra).toBeDefined();
    }
  });

  test("maxCards 限制出牌數量", () => {
    const player = {
      id: "P1",
      position: { x: 1, y: 1 },
      mp: 10,
      hand: [
        { id: "c1", type: "attack" },
        { id: "c2", type: "move" },
        { id: "c3", type: "defense" },
        { id: "c4", type: "buy" },
      ],
    };
    const players = [
      { id: "P1", position: { x: 1, y: 1 } },
      { id: "P2", position: { x: 3, y: 3 } },
    ];
    const selections = decideSelection(player, players, {
      profileId: "ai_normal",
      rng: () => 0.01,
      maxCards: 2,
    });

    expect(selections.length).toBeLessThanOrEqual(2);
  });
});
