const { createInitialState } = require("../../server/game/state/createInitialState");
const { buyFromShop } = require("../../server/game/rules/shopResolver");

function makeState() {
  const state = createInitialState({
    players: [
      { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
      { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense" },
    ],
  });

  const player = state.players[0];
  const shopCard = state.shop.cards[0];

  if (!shopCard) {
    throw new Error("No shop card available for test");
  }

  return { state, player, shopCard };
}

describe("shopResolver.buyFromShop", () => {
  test("buy success: 扣 MP、減 stock、加入 discard", () => {
    const { state, player, shopCard } = makeState();
    const initialMp = player.mp;
    const initialStock = shopCard.stock;

    const result = buyFromShop(state, player, shopCard.id);

    expect(result).toEqual({ ok: true, reason: "BOUGHT", card: shopCard });
    expect(player.mp).toBe(initialMp - shopCard.buyCost);
    expect(shopCard.stock).toBe(initialStock - 1);
    expect(player.discard).toHaveLength(1);
    expect(player.discard[0].id).toBe(shopCard.id);
    expect(state.log[state.log.length - 1]).toContain("購買");
    expect(state.log[state.log.length - 1]).toContain("成功");
  });

  test("MP 不足: 唔可扣 MP、唔可改 stock、唔可加卡", () => {
    const { state, player, shopCard } = makeState();
    player.mp = Math.max(0, shopCard.buyCost - 1);
    const initialMp = player.mp;
    const initialStock = shopCard.stock;

    const result = buyFromShop(state, player, shopCard.id);

    expect(result).toEqual({ ok: false, reason: "NOT_ENOUGH_MP" });
    expect(player.mp).toBe(initialMp);
    expect(shopCard.stock).toBe(initialStock);
    expect(player.discard).toHaveLength(0);
    expect(state.log[state.log.length - 1]).toContain("MP 不足");
  });

  test("stock 耗盡: 唔可扣 MP、唔可加卡", () => {
    const { state, player, shopCard } = makeState();
    shopCard.stock = 0;
    state.shop.stockByCardId[shopCard.id] = 0;
    const initialMp = player.mp;

    const result = buyFromShop(state, player, shopCard.id);

    expect(result).toEqual({ ok: false, reason: "OUT_OF_STOCK" });
    expect(player.mp).toBe(initialMp);
    expect(shopCard.stock).toBe(0);
    expect(player.discard).toHaveLength(0);
    expect(state.log[state.log.length - 1]).toContain("已無庫存");
  });
});
