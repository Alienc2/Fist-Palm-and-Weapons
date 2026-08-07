// server/game/ai/aiDecision.js
// Phase F：AI decision making
// 根據玩家狀態 + AI profile 的權重，決定本回合要出的牌與 extra 參數。
// 純函式、可測試、不直接改 state（只回傳 selection 陣列）。

const cardLoader = require("../../../shared/cardLoader");
const { manhattanDistance } = require("../rules/distance");

// 預設 profile（若找不到指定 profile 時使用）
const DEFAULT_PROFILE_ID = "ai_normal";

function getProfile(profileId) {
  const profile = cardLoader.getAiProfileById(profileId || DEFAULT_PROFILE_ID);
  if (profile) return profile;
  return cardLoader.getAiProfileById(DEFAULT_PROFILE_ID);
}

// 找出距離最近的合法敵人
function findNearestEnemy(player, players) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const other of players) {
    if (other.id === player.id) continue;
    if (other.isEliminated) continue;
    const dist = manhattanDistance(player.position, other.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = other;
    }
  }
  return { enemy: nearest, distance: nearestDist };
}

// 依權重隨機挑選一個 card type（attack / defense / move / buy / recover）
function pickCardTypeByWeight(profile, rng = Math.random) {
  const weights = {
    attack: profile.attackWeight,
    defense: profile.defenseWeight,
    move: profile.moveWeight,
    buy: profile.buyWeight,
    recover: profile.recoverWeight,
  };

  const total = Object.values(weights).reduce((sum, w) => sum + Math.max(w, 0), 0);
  if (total <= 0) return "attack";

  let roll = rng() * total;
  for (const [type, weight] of Object.entries(weights)) {
    roll -= Math.max(weight, 0);
    if (roll <= 0) return type;
  }
  return "attack";
}

// 從手牌中挑選指定 type 的卡（優先挑 combo 相關，其次隨機）
function pickCardOfType(player, type, rng = Math.random) {
  const candidates = (player.hand || []).filter((card) => card.type === type);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

// 為 attack 卡決定 extra（preferredTargetId）
function buildAttackExtra(player, players, card, rng = Math.random) {
  const { enemy } = findNearestEnemy(player, players);
  if (!enemy) return {};
  return { preferredTargetId: enemy.id };
}

// 為 move 卡決定 extra（dx / dy，向最近敵人靠近）
function buildMoveExtra(player, players, card, rng = Math.random) {
  const { enemy } = findNearestEnemy(player, players);
  if (!enemy) return { dx: 0, dy: 0 };

  const dx = Math.sign(enemy.position.x - player.position.x);
  const dy = Math.sign(enemy.position.y - player.position.y);

  // 若 dx 與 dy 都非 0，只取其中一軸（曼哈頓移動一次一格）
  if (dx !== 0 && dy !== 0) {
    return rng() < 0.5 ? { dx, dy: 0 } : { dx: 0, dy };
  }
  return { dx, dy };
}

// 為 buy 卡決定 extra（shopCardId：挑最貴且買得起的卡）
function buildBuyExtra(player, card, shop, rng = Math.random) {
  const shopCards = (shop?.cards || []).filter(
    (shopCard) => shopCard.stock > 0 && shopCard.buyCost <= player.mp
  );
  if (shopCards.length === 0) return {};
  shopCards.sort((a, b) => b.buyCost - a.buyCost);
  return { shopCardId: shopCards[0].id };
}


// 為 recover 卡決定 extra（無需參數）
function buildRecoverExtra() {
  return {};
}

// 為 defense 卡決定 extra（無需參數）
function buildDefenseExtra() {
  return {};
}

// 主入口：為單一玩家決定本回合 selection
// options:
//   - profileId: AI profile id（預設 ai_normal）
//   - rng: 隨機函式（預設 Math.random，測試可注入）
//   - maxCards: 本回合最多出幾張牌（預設 1）
//   - shop: 商店狀態（供 buy 卡決定 shopCardId）
function decideSelection(player, players, options = {}) {
  const profile = getProfile(options.profileId);
  const rng = options.rng || Math.random;
  const maxCards = options.maxCards || 1;
  const shop = options.shop || null;

  const selections = [];
  const usedTypes = new Set();

  for (let i = 0; i < maxCards; i++) {
    const type = pickCardTypeByWeight(profile, rng);
    if (usedTypes.has(type)) continue;

    const card = pickCardOfType(player, type, rng);
    if (!card) continue;

    let extra = {};
    if (type === "attack") {
      extra = buildAttackExtra(player, players, card, rng);
    } else if (type === "move") {
      extra = buildMoveExtra(player, players, card, rng);
    } else if (type === "buy") {
      extra = buildBuyExtra(player, card, shop, rng);
    } else if (type === "recover") {
      extra = buildRecoverExtra();
    } else if (type === "defense") {
      extra = buildDefenseExtra();
    }

    selections.push({ card, extra });
    usedTypes.add(type);
  }

  return selections;
}


module.exports = {
  DEFAULT_PROFILE_ID,
  getProfile,
  findNearestEnemy,
  pickCardTypeByWeight,
  pickCardOfType,
  buildAttackExtra,
  buildMoveExtra,
  buildBuyExtra,
  buildRecoverExtra,
  buildDefenseExtra,
  decideSelection,
};
