// server/game/rules/passiveResolver.js
// 角色被動技能查詢與效果應用

// 查詢玩家是否啟用指定 passive
function isPassiveEnabled(player, passiveId) {
  if (!player || !Array.isArray(player.passives)) return false;
  return player.passives.some(
    (p) => p.id === passiveId && p.enabled !== false
  );
}

// 取得指定 passive 的 params
function getPassiveParams(player, passiveId) {
  if (!player || !Array.isArray(player.passives)) return null;
  const entry = player.passives.find((p) => p.id === passiveId);
  return entry ? entry.params || {} : null;
}

// 正面攻擊傷害加成（front_damage_bonus）
// 回傳傷害加成數值
function getFrontDamageBonus(player) {
  if (!isPassiveEnabled(player, "front_damage_bonus")) return 0;
  const params = getPassiveParams(player, "front_damage_bonus") || {};
  return Number(params.value || 0);
}

// 正面防禦加成（front_defense_bonus）
// 回傳防禦加成數值
function getFrontDefenseBonus(player) {
  if (!isPassiveEnabled(player, "front_defense_bonus")) return 0;
  const params = getPassiveParams(player, "front_defense_bonus") || {};
  return Number(params.value || 0);
}

// 每回合免費轉向次數（free_facing_change）
function getFreeFacingChangeCount(player) {
  if (!isPassiveEnabled(player, "free_facing_change")) return 0;
  const params = getPassiveParams(player, "free_facing_change") || {};
  return Number(params.per_round || 0);
}

// 本局首次購買折扣（first_shop_discount）
// 回傳 MP 折扣數值；若已使用過則回傳 0
function getFirstShopDiscount(player) {
  if (!isPassiveEnabled(player, "first_shop_discount")) return 0;
  if (player.firstShopDiscountUsed) return 0;
  const params = getPassiveParams(player, "first_shop_discount") || {};
  return Number(params.mp_discount || 0);
}

// 標記首次購買折扣已使用
function markFirstShopDiscountUsed(player) {
  player.firstShopDiscountUsed = true;
}

module.exports = {
  isPassiveEnabled,
  getPassiveParams,
  getFrontDamageBonus,
  getFrontDefenseBonus,
  getFreeFacingChangeCount,
  getFirstShopDiscount,
  markFirstShopDiscountUsed,
};
