// tests/rules/recoverResolver.test.js

const { resolveRecover } = require("../../server/game/rules/cardResolver");
const { createMatch, submitSelection, playOneTurn } = require("../../server/game/gameEngine");

function makePlayer(overrides = {}) {
  return {
    id: "P1",
    hp: 5,
    maxHp: 10,
    mp: 2,
    maxMp: 5,
    hand: [],
    deck: [
      { id: "d1", type: "attack" },
      { id: "d2", type: "attack" },
      { id: "d3", type: "attack" },
    ],
    discard: [],
    lastRevealedSubtype: null,
    ...overrides,
  };
}

function makeState(player) {
  return { players: [player], log: [] };
}

describe("resolveRecover", () => {
  test("hpGain 會回復 HP 且不超過 maxHp", () => {
    const player = makePlayer({ hp: 5, maxHp: 10 });
    const state = makeState(player);

    resolveRecover(state, player, { id: "recover_hp", hpGain: 3 });

    expect(player.hp).toBe(8);
    expect(state.log.some((msg) => msg.includes("回復 3 HP"))).toBe(true);
  });

  test("hpGain 超過 maxHp 時會封頂", () => {
    const player = makePlayer({ hp: 9, maxHp: 10 });
    const state = makeState(player);

    resolveRecover(state, player, { id: "recover_hp", hpGain: 5 });

    expect(player.hp).toBe(10);
    expect(state.log.some((msg) => msg.includes("回復 1 HP"))).toBe(true);
  });

  test("mpGain 會回復 MP 且不超過 maxMp", () => {
    const player = makePlayer({ mp: 2, maxMp: 5 });
    const state = makeState(player);

    resolveRecover(state, player, { id: "recover_mp", mpGain: 2 });

    expect(player.mp).toBe(4);
    expect(state.log.some((msg) => msg.includes("回復 2 MP"))).toBe(true);
  });

  test("drawCount 會從 deck 抽牌到 hand", () => {
    const player = makePlayer({ hand: [], deck: [{ id: "d1" }, { id: "d2" }, { id: "d3" }] });
    const state = makeState(player);

    resolveRecover(state, player, { id: "recover_draw", drawCount: 2 });

    expect(player.hand).toHaveLength(2);
    expect(player.deck).toHaveLength(1);
    expect(state.log.some((msg) => msg.includes("抽 2 張手牌"))).toBe(true);
  });

  test("drawCount 超過 deck 數量時只抽到 deck 用完", () => {
    const player = makePlayer({ hand: [], deck: [{ id: "d1" }] });
    const state = makeState(player);

    resolveRecover(state, player, { id: "recover_draw", drawCount: 5 });

    expect(player.hand).toHaveLength(1);
    expect(player.deck).toHaveLength(0);
    expect(state.log.some((msg) => msg.includes("抽 1 張手牌"))).toBe(true);
  });

  test("組合效果：同時回復 HP、MP 並抽牌", () => {
    const player = makePlayer({
      hp: 5,
      maxHp: 10,
      mp: 2,
      maxMp: 5,
      hand: [],
      deck: [{ id: "d1" }, { id: "d2" }],
    });
    const state = makeState(player);

    resolveRecover(state, player, { id: "recover_all", hpGain: 2, mpGain: 1, drawCount: 2 });

    expect(player.hp).toBe(7);
    expect(player.mp).toBe(3);
    expect(player.hand).toHaveLength(2);
    expect(player.deck).toHaveLength(0);
  });

  test("沒有可回復效果時會記錄 log", () => {
    const player = makePlayer();
    const state = makeState(player);

    resolveRecover(state, player, { id: "recover_none", hpGain: 0, mpGain: 0, drawCount: 0 });

    expect(state.log.some((msg) => msg.includes("沒有可回復的效果"))).toBe(true);
  });

  test("會設定 lastRevealedSubtype", () => {
    const player = makePlayer();
    const state = makeState(player);

    resolveRecover(state, player, { id: "recover_hp", subtype: "resource", hpGain: 1 });

    expect(player.lastRevealedSubtype).toBe("resource");
  });
});

describe("recover 透過 turnEngine 整合", () => {
  test("使用 recover 卡會回復 HP / MP / 抽牌", () => {
    const state = createMatch();
    const [p1, p2] = state.players;

    p1.hp = 5;
    p1.mp = 2;
    p1.maxHp = 10;
    p1.maxMp = 5;

    const recoverCard = {
      id: "test_recover",
      type: "recover",
      subtype: "resource",
      mpCost: 1,
      hpGain: 2,
      mpGain: 1,
      drawCount: 1,
    };

    const handBefore = p1.hand.length;
    const deckBefore = p1.deck.length;

    submitSelection(state, "P1", [{ card: recoverCard }]);
    submitSelection(state, "P2", []);

    playOneTurn(state);

    // recover 抽 1 張 + turnEngine drawPhase 抽 2 張 = 共抽 3 張
    expect(p1.hp).toBe(7);
    // MP：recover 加 1（2→3）+ 回合結束補 3（3→6），clamp 到 maxMp 5 → 5
    expect(p1.mp).toBe(5);
    expect(p1.hand.length).toBe(handBefore + 3);
    expect(p1.deck.length).toBe(deckBefore - 3);
    expect(state.log.some((msg) => msg.includes("回復 2 HP"))).toBe(true);
    expect(state.log.some((msg) => msg.includes("回復 1 MP"))).toBe(true);


  });
});
