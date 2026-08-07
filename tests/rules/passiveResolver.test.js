// tests/rules/passiveResolver.test.js

const {
  isPassiveEnabled,
  getPassiveParams,
  getFrontDamageBonus,
  getFrontDefenseBonus,
  getFreeFacingChangeCount,
  getFirstShopDiscount,
  markFirstShopDiscountUsed,
} = require("../../server/game/rules/passiveResolver");

const { resolveAttack, resolveDefense } = require("../../server/game/rules/cardResolver");
const { buyFromShop } = require("../../server/game/rules/shopResolver");

function makePlayer(id, passives = []) {
  return {
    id,
    passives,
    hp: 10,
    maxHp: 10,
    mp: 5,
    maxMp: 5,
    position: { x: 1, y: 1 },
    facing: "down",
    selectedCards: [],
    lastRevealedSubtype: null,
    lastDefenseCard: null,
    discard: [],
    isEliminated: false,
  };
}


function makeState(players) {
  return {
    players,
    turnOrder: players.map((p) => p.id),
    log: [],
    shop: {
      cards: [
        { id: "shop_1", buyCost: 3, stock: 2 },
        { id: "shop_2", buyCost: 5, stock: 2 },
      ],
    },
  };
}

function attackCard() {
  return {
    id: "attack_1",
    type: "attack",
    subtype: "punch",
    damage: 2,
    rangeMin: 1,
    rangeMax: 3,
    targeting: "single_enemy",
  };
}

describe("passiveResolver helpers", () => {
  test("isPassiveEnabled 偵測啟用與停用", () => {
    const player = makePlayer("P1", [
      { id: "front_damage_bonus", enabled: true, params: { value: 1 } },
      { id: "disabled_passive", enabled: false, params: {} },
    ]);
    expect(isPassiveEnabled(player, "front_damage_bonus")).toBe(true);
    expect(isPassiveEnabled(player, "disabled_passive")).toBe(false);
    expect(isPassiveEnabled(player, "nonexistent")).toBe(false);
  });

  test("getFrontDamageBonus 回傳數值", () => {
    const player = makePlayer("P1", [
      { id: "front_damage_bonus", enabled: true, params: { value: 1 } },
    ]);
    expect(getFrontDamageBonus(player)).toBe(1);
  });

  test("getFrontDamageBonus 未啟用回傳 0", () => {
    const player = makePlayer("P1", []);
    expect(getFrontDamageBonus(player)).toBe(0);
  });

  test("getFrontDefenseBonus 回傳數值", () => {
    const player = makePlayer("P1", [
      { id: "front_defense_bonus", enabled: true, params: { value: 1 } },
    ]);
    expect(getFrontDefenseBonus(player)).toBe(1);
  });

  test("getFreeFacingChangeCount 回傳次數", () => {
    const player = makePlayer("P1", [
      { id: "free_facing_change", enabled: true, params: { per_round: 1 } },
    ]);
    expect(getFreeFacingChangeCount(player)).toBe(1);
  });

  test("getFirstShopDiscount 首次回傳折扣，使用後回傳 0", () => {
    const player = makePlayer("P1", [
      { id: "first_shop_discount", enabled: true, params: { mp_discount: 1 } },
    ]);
    expect(getFirstShopDiscount(player)).toBe(1);
    markFirstShopDiscountUsed(player);
    expect(getFirstShopDiscount(player)).toBe(0);
  });
});

describe("front_damage_bonus 整合", () => {
  test("正面攻擊時套用傷害加成", () => {
    const attacker = makePlayer("P1", [
      { id: "front_damage_bonus", enabled: true, params: { value: 1 } },
    ]);
    // attacker facing down，目標在下方 (dy>0) 為正面
    const target = makePlayer("P2", []);
    target.position = { x: 1, y: 2 };
    const state = makeState([attacker, target]);

    resolveAttack(state, attacker, attackCard(), {});

    // 傷害 = 2 (card) + 1 (front facing) + 1 (passive) = 4
    expect(target.hp).toBe(10 - 4);
  });

  test("非正面攻擊時不套用傷害加成", () => {
    const attacker = makePlayer("P1", [
      { id: "front_damage_bonus", enabled: true, params: { value: 1 } },
    ]);
    // attacker facing down，目標在側面 (dx>0, dy=0) 為側面
    const target = makePlayer("P2", []);
    target.position = { x: 2, y: 1 };
    const state = makeState([attacker, target]);

    resolveAttack(state, attacker, attackCard(), {});

    // 傷害 = 2 (card) + 0 (side) + 0 (passive) = 2
    expect(target.hp).toBe(10 - 2);
  });
});

describe("front_defense_bonus 整合", () => {
  test("正面防禦時套用防禦加成", () => {
    const attacker = makePlayer("P1", []);
    const defender = makePlayer("P2", [
      { id: "front_defense_bonus", enabled: true, params: { value: 1 } },
    ]);
    // attacker facing down，defender 在下方 (dy>0) 為正面
    defender.position = { x: 1, y: 2 };
    const state = makeState([attacker, defender]);

    // 先設定防禦殘留
    resolveDefense(state, defender, { id: "def_1", type: "defense", blockValue: 3 }, {});

    resolveAttack(state, attacker, attackCard(), {});

    // 傷害 = 2 + 1 (front) = 3，block = 3 + 1 (passive) = 4，最終 0
    expect(defender.hp).toBe(10);
  });
});

describe("first_shop_discount 整合", () => {
  test("首次購買套用折扣", () => {
    const player = makePlayer("P1", [
      { id: "first_shop_discount", enabled: true, params: { mp_discount: 1 } },
    ]);
    player.mp = 3;
    const state = makeState([player]);

    const result = buyFromShop(state, player, "shop_1");
    expect(result.ok).toBe(true);
    // 原價 3，折扣 1，實付 2
    expect(player.mp).toBe(1);
    expect(player.firstShopDiscountUsed).toBe(true);
  });

  test("第二次購買不再折扣", () => {
    const player = makePlayer("P1", [
      { id: "first_shop_discount", enabled: true, params: { mp_discount: 1 } },
    ]);
    player.mp = 10;
    const state = makeState([player]);

    buyFromShop(state, player, "shop_1");
    buyFromShop(state, player, "shop_2");
    // 第一次實付 2，第二次原價 5，共 7
    expect(player.mp).toBe(3);
  });
});
