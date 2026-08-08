// tests/rules/turnEngine.deck.test.js
// Phase I-02：牌庫重洗（deck reshuffle）與手牌上限棄牌（discardToLimit）測試
// 驗證：
//   1. 牌庫耗盡時，自動將棄牌堆洗回牌庫再抽牌
//   2. 手牌超過上限時，依 pendingDiscards 優先棄牌，不足自動補棄
//   3. handLimit 可依玩家設定

const { drawCards, discardToLimit, shuffleArray } = require("../../server/game/rules/turnEngine");

function makeCard(id, type = "attack") {
  return { id, instanceId: id, definitionId: id, type, zone: "deck" };
}

function makePlayer(overrides = {}) {
  return {
    id: "P1",
    hand: [],
    deck: [],
    discard: [],
    handLimit: 8,
    pendingDiscards: [],
    ...overrides,
  };
}

describe("shuffleArray", () => {
  test("回傳新陣列且不修改原陣列", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffleArray(arr, () => 0.5);
    expect(result).not.toBe(arr);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  test("使用固定 rng 時結果可重現", () => {
    const arr = [1, 2, 3, 4, 5];
    const a = shuffleArray(arr, () => 0.5);
    const b = shuffleArray(arr, () => 0.5);
    expect(a).toEqual(b);
  });
});

describe("drawCards - 牌庫重洗", () => {
  test("牌庫充足時直接抽牌，不觸發重洗", () => {
    const player = makePlayer({
      deck: [makeCard("c1"), makeCard("c2"), makeCard("c3")],
      discard: [makeCard("d1")],
    });
    const log = [];
    const drawn = drawCards(player, 2, () => 0.5, (msg) => log.push(msg));

    expect(drawn).toHaveLength(2);
    expect(drawn[0].zone).toBe("hand");
    expect(player.deck).toHaveLength(1);
    expect(player.discard).toHaveLength(1);
    expect(log).toHaveLength(0);
  });

  test("牌庫耗盡時，將棄牌堆洗回牌庫再抽牌", () => {
    const player = makePlayer({
      deck: [makeCard("c1")],
      discard: [makeCard("d1"), makeCard("d2"), makeCard("d3")],
    });
    const log = [];
    const drawn = drawCards(player, 3, () => 0.5, (msg) => log.push(msg));

    // 抽 3 張：第 1 張來自牌庫，第 2、3 張來自重洗後的棄牌堆
    expect(drawn).toHaveLength(3);
    expect(player.deck).toHaveLength(1); // 重洗後剩 1 張
    expect(player.discard).toHaveLength(0);
    expect(log.some((msg) => msg.includes("重洗"))).toBe(true);
  });

  test("牌庫與棄牌堆皆空時，無法抽牌", () => {
    const player = makePlayer({ deck: [], discard: [] });
    const drawn = drawCards(player, 3, () => 0.5);
    expect(drawn).toHaveLength(0);
  });

  test("牌庫耗盡且棄牌堆不足時，只抽到可用的張數", () => {
    const player = makePlayer({
      deck: [makeCard("c1")],
      discard: [makeCard("d1")],
    });
    const drawn = drawCards(player, 5, () => 0.5);
    // 第 1 張來自牌庫，重洗後棄牌堆 1 張，共 2 張
    expect(drawn).toHaveLength(2);
  });
});

describe("discardToLimit - 手牌上限棄牌", () => {
  test("手牌未超過上限時不棄牌", () => {
    const player = makePlayer({
      hand: [makeCard("h1"), makeCard("h2")],
      handLimit: 8,
    });
    const state = { players: [player] };
    discardToLimit(state);
    expect(player.hand).toHaveLength(2);
    expect(player.discard).toHaveLength(0);
  });

  test("手牌超過上限時，依 pendingDiscards 優先棄牌", () => {
    const player = makePlayer({
      hand: [makeCard("h1"), makeCard("h2"), makeCard("h3"), makeCard("h4")],
      handLimit: 2,
      pendingDiscards: [{ instanceId: "h3" }, { instanceId: "h4" }],
    });
    const state = { players: [player] };
    discardToLimit(state);

    expect(player.hand).toHaveLength(2);
    expect(player.discard.map((c) => c.id).sort()).toEqual(["h3", "h4"]);
    expect(player.pendingDiscards).toEqual([]);
  });

  test("pendingDiscards 不足時，自動補棄最左邊的牌", () => {
    const player = makePlayer({
      hand: [makeCard("h1"), makeCard("h2"), makeCard("h3"), makeCard("h4")],
      handLimit: 2,
      pendingDiscards: [{ instanceId: "h4" }],
    });
    const state = { players: [player] };
    discardToLimit(state);

    expect(player.hand).toHaveLength(2);
    // 棄 h4（pending）+ 最左邊 h1（自動補棄）
    expect(player.discard.map((c) => c.id).sort()).toEqual(["h1", "h4"]);
  });

  test("handLimit 可依玩家設定（非預設 8）", () => {
    const player = makePlayer({
      hand: [makeCard("h1"), makeCard("h2"), makeCard("h3")],
      handLimit: 1,
    });
    const state = { players: [player] };
    discardToLimit(state);
    expect(player.hand).toHaveLength(1);
    expect(player.discard).toHaveLength(2);
  });
});
