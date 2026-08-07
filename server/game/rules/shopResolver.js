// server/game/rules/shopResolver.js

const {
  getFirstShopDiscount,
  markFirstShopDiscountUsed,
} = require("./passiveResolver");

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

  const discount = getFirstShopDiscount(player);
  const effectiveCost = Math.max(shopCard.buyCost - discount, 0);

  if (player.mp < effectiveCost) {
    log(state, `${player.id} 嘗試購買 ${cardId}，但 MP 不足`);
    return { ok: false, reason: "NOT_ENOUGH_MP" };
  }

  player.mp -= effectiveCost;
  shopCard.stock -= 1;
  player.discard.push({ ...shopCard });

  if (discount > 0) {
    markFirstShopDiscountUsed(player);
    log(state, `${player.id} 首次購買折扣 -${discount} MP`);
  }

  log(
    state,
    `${player.id} 購買 ${shopCard.id} 成功，消耗 ${effectiveCost} MP，剩餘庫存 ${shopCard.stock}`
  );

  return { ok: true, reason: "BOUGHT", card: shopCard };

}

module.exports = {
  getShopCard,
  buyFromShop,
};