// tests/rules/eventStream.test.js
// P2：server 結構化回合事件流（state.events）

const { createInitialState } = require("../../server/game/state/createInitialState");
const { playOneTurn, takeEvents } = require("../../server/game/gameEngine");

function attackCard(subtype = "punch") {
  return {
    id: "attack_1",
    type: "attack",
    subtype,
    damage: 2,
    rangeMin: 1,
    rangeMax: 5,
    targeting: "single_enemy",
  };
}

function moveCard(tx, ty) {
  return {
    id: "move_1",
    type: "move",
    subtype: "step",
    moveMin: 1,
    moveMax: 3,
  };
}

function defenseCard() {
  return { id: "defense_1", type: "defense", subtype: "guard", blockValue: 3 };
}

function buyCard() {
  return { id: "basic_buy", type: "buy", subtype: "shop" };
}

function make2PState() {
  return createInitialState({
    players: [
      { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
      { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense" },
    ],
  });
}

describe("eventStream — 回合事件流", () => {
  test("createInitialState 初始化 events 為 array", () => {
    const state = make2PState();
    expect(Array.isArray(state.events)).toBe(true);
  });

  test("move → attack → defend → buy → combo 產生對應事件", () => {
    const state = make2PState();
    const p1 = state.players.find((p) => p.id === "P1");
    const p2 = state.players.find((p) => p.id === "P2");

    p1.selectedCards = [
      { card: moveCard(2, 2), extra: { targetX: 2, targetY: 2 } },
      { card: attackCard(), extra: {} },
      { card: attackCard(), extra: {} },
      { card: attackCard(), extra: {} },
    ];
    p2.selectedCards = [
      { card: defenseCard(), extra: {} },
      { card: buyCard(), extra: { shopCardId: "shop_punch_1" } },
    ];

    playOneTurn(state);

    const events = state.events;
    const types = events.map((e) => e.type);
    expect(types).toContain("round");
    expect(types).toContain("reveal");
    expect(types).toContain("move");
    expect(types).toContain("attack");
    expect(types).toContain("defend");
    expect(types).toContain("buy");
    expect(types).toContain("draw");
    expect(types).toContain("combo");

    // move 事件帶 from / to
    const moveEv = events.find((e) => e.type === "move");
    expect(moveEv).toMatchObject({
      playerId: "P1",
      from: { x: 1, y: 1 },
      to: { x: 2, y: 2 },
      cardId: "move_1",
    });

    // attack 事件帶攻擊者／目標
    const attackEv = events.find((e) => e.type === "attack");
    expect(attackEv.attackerId).toBe("P1");
    expect(attackEv.targetId).toBe("P2");
    expect(typeof attackEv.finalDamage).toBe("number");

    // defend 事件
    const defendEv = events.find((e) => e.type === "defend");
    expect(defendEv).toMatchObject({ playerId: "P2", cardId: "defense_1" });

    // reveal 事件帶 cardId / cardType
    const revealEv = events.find((e) => e.type === "reveal");
    expect(revealEv).toHaveProperty("cardId");
    expect(revealEv).toHaveProperty("cardType");

    // combo 事件
    const comboEv = events.find((e) => e.type === "combo");
    expect(comboEv).toMatchObject({ playerId: "P1", comboId: "combo_same_attack_3" });
  });

  test("takeEvents 回傳並清空 events", () => {
    const state = make2PState();
    const p1 = state.players.find((p) => p.id === "P1");
    p1.selectedCards = [{ card: moveCard(2, 2), extra: { targetX: 2, targetY: 2 } }];

    playOneTurn(state);
    expect(state.events.length).toBeGreaterThan(0);

    const taken = takeEvents(state);
    expect(Array.isArray(taken)).toBe(true);
    expect(taken.length).toBeGreaterThan(0);
    expect(state.events).toEqual([]);
  });
});
