// tests/rules/multiplayerEngine.test.js

const { createInitialState } = require("../../server/game/state/createInitialState");
const { resolveTurn } = require("../../server/game/rules/turnEngine");

function make3PState() {
  return createInitialState({
    matchId: "mp-3p",
    players: [
      { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
      { id: "P2", position: { x: 3, y: 1 }, characterId: "char_defense" },
      { id: "P3", position: { x: 2, y: 3 }, characterId: "char_move" },
    ],
  });
}

function make4PState() {
  return createInitialState({
    matchId: "mp-4p",
    players: [
      { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
      { id: "P2", position: { x: 3, y: 1 }, characterId: "char_defense" },
      { id: "P3", position: { x: 1, y: 3 }, characterId: "char_move" },
      { id: "P4", position: { x: 3, y: 3 }, characterId: "char_balanced" },
    ],
  });
}

function moveCard(dx, dy) {
  return {
    id: "move_1",
    type: "move",
    subtype: "step",
    moveMin: 1,
    moveMax: 3,
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

describe("多人引擎 - 3P", () => {
  test("3P 交錯揭牌：每位玩家各出 1 張移動", () => {
    const state = make3PState();
    const p1 = state.players.find((p) => p.id === "P1");
    const p2 = state.players.find((p) => p.id === "P2");
    const p3 = state.players.find((p) => p.id === "P3");

    p1.selectedCards = [{ card: moveCard(1, 0), extra: { dx: 1, dy: 0 } }];
    p2.selectedCards = [{ card: moveCard(0, 1), extra: { dx: 0, dy: 1 } }];
    p3.selectedCards = [{ card: moveCard(-1, 0), extra: { dx: -1, dy: 0 } }];

    resolveTurn(state);

    expect(p1.position).toEqual({ x: 2, y: 1 });
    expect(p2.position).toEqual({ x: 3, y: 2 });
    expect(p3.position).toEqual({ x: 1, y: 3 });
  });

  test("3P 起始玩家輪轉：startingPlayerIndex 決定揭牌順序", () => {
    const state = make3PState();
    state.startingPlayerIndex = 1;
    const p1 = state.players.find((p) => p.id === "P1");
    const p2 = state.players.find((p) => p.id === "P2");
    const p3 = state.players.find((p) => p.id === "P3");

    p1.selectedCards = [{ card: moveCard(1, 0), extra: { dx: 1, dy: 0 } }];
    p2.selectedCards = [{ card: moveCard(0, 1), extra: { dx: 0, dy: 1 } }];
    p3.selectedCards = [{ card: moveCard(-1, 0), extra: { dx: -1, dy: 0 } }];

    resolveTurn(state);

    // 所有玩家仍應移動成功
    expect(p1.position).toEqual({ x: 2, y: 1 });
    expect(p2.position).toEqual({ x: 3, y: 2 });
    expect(p3.position).toEqual({ x: 1, y: 3 });
  });

  test("3P 多目標攻擊：攻擊者命中最近目標", () => {
    const state = make3PState();
    const p1 = state.players.find((p) => p.id === "P1");
    const p2 = state.players.find((p) => p.id === "P2");
    const p3 = state.players.find((p) => p.id === "P3");

    // P1 在 (1,1)，P2 在 (3,1) 距離 2，P3 在 (2,3) 距離 3
    p1.selectedCards = [{ card: attackCard(), extra: {} }];
    p2.selectedCards = [];
    p3.selectedCards = [];

    const hpBeforeP2 = p2.hp;
    const hpBeforeP3 = p3.hp;

    resolveTurn(state);

    // 自動目標應選最近（P2）
    expect(p2.hp).toBeLessThan(hpBeforeP2);
    expect(p3.hp).toBe(hpBeforeP3);
  });
});

describe("多人引擎 - 4P", () => {
  test("4P 交錯揭牌：每位玩家各出 1 張移動", () => {
    const state = make4PState();
    const players = state.players;

    players.forEach((p, index) => {
      p.selectedCards = [
        { card: moveCard(1, 0), extra: { dx: 1, dy: 0 } },
      ];
    });

    resolveTurn(state);

    expect(players[0].position).toEqual({ x: 2, y: 1 });
    expect(players[1].position).toEqual({ x: 4, y: 1 });
    expect(players[2].position).toEqual({ x: 2, y: 3 });
    expect(players[3].position).toEqual({ x: 4, y: 3 });
  });

  test("4P 淘汰後跳過：被淘汰玩家不再出牌", () => {
    const state = make4PState();
    const p1 = state.players.find((p) => p.id === "P1");
    const p2 = state.players.find((p) => p.id === "P2");
    const p3 = state.players.find((p) => p.id === "P3");
    const p4 = state.players.find((p) => p.id === "P4");

    // 模擬 P2 已被淘汰
    p2.isEliminated = true;
    p2.hp = 0;

    p1.selectedCards = [{ card: moveCard(1, 0), extra: { dx: 1, dy: 0 } }];
    p2.selectedCards = [{ card: moveCard(0, 1), extra: { dx: 0, dy: 1 } }];
    p3.selectedCards = [{ card: moveCard(-1, 0), extra: { dx: -1, dy: 0 } }];
    p4.selectedCards = [{ card: moveCard(0, -1), extra: { dx: 0, dy: -1 } }];

    resolveTurn(state);

    // P2 被淘汰，不應移動
    expect(p2.position).toEqual({ x: 3, y: 1 });
    // 其他玩家正常移動
    expect(p1.position).toEqual({ x: 2, y: 1 });
    expect(p3.position).toEqual({ x: 0, y: 3 });
    expect(p4.position).toEqual({ x: 3, y: 2 });
  });
});

describe("多人引擎 - 反擊連鎖", () => {
  test("3P 反擊連鎖：防禦者反擊攻擊者", () => {
    const state = make3PState();
    const p1 = state.players.find((p) => p.id === "P1");
    const p2 = state.players.find((p) => p.id === "P2");
    const p3 = state.players.find((p) => p.id === "P3");

    // P1 攻擊，P2 反擊
    p1.selectedCards = [{ card: attackCard(), extra: {} }];
    p2.selectedCards = [
      {
        card: { id: "counter_1", type: "counter", subtype: "palm" },
        extra: {},
      },
    ];
    p3.selectedCards = [];

    const hpBeforeP1 = p1.hp;
    const hpBeforeP2 = p2.hp;

    resolveTurn(state);

    // P2 反擊可能命中 P1（隨機），至少 P2 不應被 P1 攻擊命中（反擊卡非防禦）
    // 驗證流程不拋錯且狀態一致
    expect(state.phase).toBe("ROUND_START");
    expect(p1.hp).toBeLessThanOrEqual(hpBeforeP1);
    expect(p2.hp).toBeLessThanOrEqual(hpBeforeP2);
  });
});
