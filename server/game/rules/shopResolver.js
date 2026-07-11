// server/game/rules/shopResolver.js

function log(state, msg) {
  state.log.push(msg);
}

function getShopCard(state, cardId) {
  if (!state.shop || !Array.isArray(state.shop.cards)) return null;
  return state.shop.cards.find((card) => card.id === cardId) || null;
}

function buyFromShop(state, player, cardId) {
  const shopCard = getShopCard(state, cardId);

  if (!shopCard) {
    log(state, `${player.id} 嘗試購買 ${cardId}，但商店中不存在`);
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (shopCard.stock <= 0) {
    log(state, `${player.id} 嘗試購買 ${cardId}，但已無庫存`);
    return { ok: false, reason: "OUT_OF_STOCK" };
  }

  if (player.mp < shopCard.buyCost) {
    log(state, `${player.id} 嘗試購買 ${cardId}，但 MP 不足`);
    return { ok: false, reason: "NOT_ENOUGH_MP" };
  }

  player.mp -= shopCard.buyCost;
  shopCard.stock -= 1;
  player.discard.push({ ...shopCard });

  log(
    state,
    `${player.id} 購買 ${shopCard.id} 成功，消耗 ${shopCard.buyCost} MP，剩餘庫存 ${shopCard.stock}`
  );

  return { ok: true, reason: "BOUGHT", card: shopCard };
}

module.exports = {
  getShopCard,
  buyFromShop,
};