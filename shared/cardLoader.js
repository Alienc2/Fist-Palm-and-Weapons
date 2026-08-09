// shared/cardLoader.js

const path = require("path");

const cards = require(path.join(__dirname, "..", "generated", "cards.json"));
const characters = require(path.join(__dirname, "..", "generated", "characters.json"));
const keywords = require(path.join(__dirname, "..", "generated", "keywords.json"));
const combos = require(path.join(__dirname, "..", "generated", "combos.json"));
const aiProfiles = require(path.join(__dirname, "..", "generated", "ai_profiles.json"));

const ALLOWED_GROUPS = ["basic", "shop", "character", "system"];
const ALLOWED_CARD_TYPES = ["attack", "defense", "move", "buy", "recover", "counter"];
const ALLOWED_TARGET_RULES = [
  "single",
  "self",
  "none",
  "shop",
  "all_enemies",
  "adjacent_enemy",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[cardLoader] ${message}`);
  }
}

function normalizeNumber(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  return String(value).trim().toLowerCase() === "true";
}

function parseJsonString(value, fallback, label) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`[cardLoader] ${label} JSON 格式錯誤: ${value}`);
  }
}

function assertArray(value, label) {
  assert(Array.isArray(value), `${label} 必須為陣列`);
}

function assertUniqueIds(items, label) {
  const seen = new Set();
  for (const item of items) {
    assert(item && item.id, `${label} 存在缺少 id 的項目`);
    assert(!seen.has(item.id), `${label} id 重複: ${item.id}`);
    seen.add(item.id);
  }
}

function validateKeyword(keyword) {
  assert(keyword && typeof keyword === "object", "keyword 必須為 object");
  assert(keyword.id, "keyword.id 缺失");
  assert(keyword.category, `keyword.category 缺失: ${keyword.id}`);
  assert(keyword.description, `keyword.description 缺失: ${keyword.id}`);
}

function validateAiProfile(profile) {
  assert(profile && typeof profile === "object", "aiProfile 必須為 object");
  assert(profile.id, "aiProfile.id 缺失");
  assert(profile.name_zh, `aiProfile.name_zh 缺失: ${profile.id}`);
  assert(profile.difficulty, `aiProfile.difficulty 缺失: ${profile.id}`);
  [
    "attack_weight",
    "defense_weight",
    "move_weight",
    "buy_weight",
    "recover_weight",
    "combo_weight",
  ].forEach((field) => {
    assert(profile[field] !== undefined, `aiProfile.${field} 缺失: ${profile.id}`);
    assert(!Number.isNaN(Number(profile[field])), `aiProfile.${field} 必須為數字: ${profile.id}`);
  });
}

function validateCombo(combo) {
  assert(combo && typeof combo === "object", "combo 必須為 object");
  assert(combo.id, "combo.id 缺失");
  assert(combo.combo_type, `combo.combo_type 缺失: ${combo.id}`);
  assert(combo.required_cards !== undefined, `combo.required_cards 缺失: ${combo.id}`);
  assert(combo.effect_type, `combo.effect_type 缺失: ${combo.id}`);
  assert(combo.effect_params !== undefined, `combo.effect_params 缺失: ${combo.id}`);
  assert(combo.duration, `combo.duration 缺失: ${combo.id}`);
  parseJsonString(combo.effect_params, {}, `combo.effect_params ${combo.id}`);
}

function validateCharacter(character) {
  assert(character && typeof character === "object", "character 必須為 object");
  assert(character.id, "character.id 缺失");
  assert(character.name_zh, `character.name_zh 缺失: ${character.id}`);
  assert(character.role, `character.role 缺失: ${character.id}`);
  assert(character.initial_hp !== undefined, `character.initial_hp 缺失: ${character.id}`);
  assert(character.initial_mp !== undefined, `character.initial_mp 缺失: ${character.id}`);
  assert(character.initial_hand_size !== undefined, `character.initial_hand_size 缺失: ${character.id}`);

  assert(Number(character.initial_hp) > 0, `character.initial_hp 必須大於 0: ${character.id}`);
  assert(Number(character.initial_mp) >= 0, `character.initial_mp 不可小於 0: ${character.id}`);
  assert(Number(character.initial_hand_size) > 0, `character.initial_hand_size 必須大於 0: ${character.id}`);

  if (character.passive_params !== undefined && character.passive_params !== "") {
    parseJsonString(character.passive_params, {}, `character.passive_params ${character.id}`);
  }
}

function validateCard(card, keywordIdSet) {
  assert(card && typeof card === "object", "card 必須為 object");
  assert(card.id, "card.id 缺失");
  assert(card.type, `card.type 缺失: ${card.id}`);
  assert(card.subtype !== undefined, `card.subtype 缺失: ${card.id}`);
  assert(card.name_zh, `card.name_zh 缺失: ${card.id}`);
  assert(card.group, `card.group 缺失: ${card.id}`);
  assert(ALLOWED_GROUPS.includes(card.group), `card.group 非法: ${card.id} -> ${card.group}`);
  assert(ALLOWED_CARD_TYPES.includes(card.type), `card.type 非法: ${card.id} -> ${card.type}`);

const defaultCardSet = String(card.Default_Card_Set || "").trim();
const defaultCopies = card.No_of_Cards_in_Hand;

if (defaultCardSet) {
  assert(["1", "2", "3", "4", "ALL"].includes(defaultCardSet.toUpperCase()), `Default_Card_Set 非法: ${card.id} -> ${defaultCardSet}`);
}

if (defaultCopies !== undefined && defaultCopies !== "") {
  assert(Number(defaultCopies) >= 0, `No_of_Cards_in_Hand 不可小於 0: ${card.id}`);
}

if (card.target_rule) {
  assert(ALLOWED_TARGET_RULES.includes(card.target_rule), `card.target_rule 非法: ${card.id} -> ${card.target_rule}`);
}

if (card.type === "attack") {
  assert(card.range_min !== undefined, `attack range_min 缺失: ${card.id}`);
  assert(card.range_max !== undefined, `attack range_max 缺失: ${card.id}`);
  assert(card.damage !== undefined, `attack damage 缺失: ${card.id}`);
  assert(Number(card.range_min) <= Number(card.range_max), `attack range_min/range_max 非法: ${card.id}`);
  assert(Number(card.damage) >= 0, `attack damage 不可小於 0: ${card.id}`);
}

if (card.type === "move") {
  assert(card.move_min !== undefined, `move move_min 缺失: ${card.id}`);
  assert(card.move_max !== undefined, `move move_max 缺失: ${card.id}`);
  assert(Number(card.move_min) <= Number(card.move_max), `move move_min/move_max 非法: ${card.id}`);
}

if (card.mp_cost !== undefined && card.mp_cost !== "") {
  assert(Number(card.mp_cost) >= 0, `mp_cost 不可小於 0: ${card.id}`);
}

if (card.buy_cost !== undefined && card.buy_cost !== "") {
  assert(Number(card.buy_cost) >= 0, `buy_cost 不可小於 0: ${card.id}`);
}

if (card.stock !== undefined && card.stock !== "") {
  assert(Number(card.stock) >= 0, `stock 不可小於 0: ${card.id}`);
}

const parsedKeywords = String(card.keywords || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

for (const keywordId of parsedKeywords) {
  assert(keywordIdSet.has(keywordId), `card keyword 不存在: ${card.id} -> ${keywordId}`);
  }
}

function normalizeKeyword(keyword) {
  return {
    id: keyword.id,
    category: keyword.category,
    description: keyword.description,
    raw: keyword,
  };
}

function normalizeAiProfile(profile) {
  return {
    id: profile.id,
    name: profile.name_zh,
    difficulty: profile.difficulty,
    attackWeight: normalizeNumber(profile.attack_weight),
    defenseWeight: normalizeNumber(profile.defense_weight),
    moveWeight: normalizeNumber(profile.move_weight),
    buyWeight: normalizeNumber(profile.buy_weight),
    recoverWeight: normalizeNumber(profile.recover_weight),
    comboWeight: normalizeNumber(profile.combo_weight),
    description: profile.description || "",
    raw: profile,
  };
}

function normalizeCombo(combo) {
  return {
    id: combo.id,
    comboType: combo.combo_type,
    requiredCards: combo.required_cards,
    requiredBoardPattern: combo.required_board_pattern || "none",
    effectType: combo.effect_type,
    effectParams: parseJsonString(combo.effect_params, {}, `combo.effect_params ${combo.id}`),
    duration: combo.duration,
    description: combo.description || "",
    raw: combo,
  };
}

// 將 target_rule 映射到 targeting（targetingResolver 使用）
// single → single_enemy、all_enemies → all_enemies、
// adjacent_enemy → adjacent_enemies、self → self_chosen_enemies
function mapTargetRuleToTargeting(targetRule) {
  switch (String(targetRule || "").trim()) {
    case "all_enemies":
      return "all_enemies";
    case "adjacent_enemy":
      return "adjacent_enemies";
    case "self":
      return "self_chosen_enemies";
    case "none":
    case "shop":
      return null;
    case "single":
    default:
      return "single_enemy";
  }
}

function normalizeCard(card) {
  const targetRule = card.target_rule || "single";
  return {
    id: card.id,
    definitionId: undefined,
    name: card.name_zh,
    aliasGroup: card.alias_group,
    description: card.description_template,
    group: card.group,
    type: card.type,
    subtype: card.subtype,
    mpCost: normalizeNumber(card.mp_cost),
    buyCost: normalizeNumber(card.buy_cost),
    rangeMin: normalizeNumber(card.range_min),
    rangeMax: normalizeNumber(card.range_max),
    damage: normalizeNumber(card.damage),
    blockValue: normalizeNumber(card.block_value),
    hpGain: normalizeNumber(card.hp_gain),
    mpGain: normalizeNumber(card.mp_gain),
    drawCount: normalizeNumber(card.draw_count),
    moveMin: normalizeNumber(card.move_min),
    moveMax: normalizeNumber(card.move_max),
    stock: normalizeNumber(card.stock, 0),
    persistUntilTriggered: normalizeBoolean(card.persist_until_triggered),
    keywords: String(card.keywords || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
    targetRule,
    targeting: mapTargetRuleToTargeting(targetRule),
    defaultCardSet: String(card.Default_Card_Set || "").trim(),
    defaultCopiesInHand: normalizeNumber(card.No_of_Cards_in_Hand, 0),
    enabled: normalizeBoolean(card.enabled),
  };
}



function normalizeCharacter(character) {
  return {
    id: character.id,
    name: character.name_zh,
    role: character.role,
    initialHp: normalizeNumber(character.initial_hp),
    initialMp: normalizeNumber(character.initial_mp),
    initialHandSize: normalizeNumber(character.initial_hand_size),
    tokenColor: character.token_color || "white",
    passiveId: character.passive_id || null,
    passiveParams: parseJsonString(character.passive_params, null, `character.passive_params ${character.id}`),
    description: character.description || "",
    raw: character,
  };
}

function validateAllData() {
  assertArray(cards, "generated/cards.json");
  assertArray(characters, "generated/characters.json");
  assertArray(keywords, "generated/keywords.json");
  assertArray(combos, "generated/combos.json");
  assertArray(aiProfiles, "generated/ai_profiles.json");

  assertUniqueIds(cards, "cards");
  assertUniqueIds(characters, "characters");
  assertUniqueIds(keywords, "keywords");
  assertUniqueIds(combos, "combos");
  assertUniqueIds(aiProfiles, "aiProfiles");

  keywords.forEach(validateKeyword);
  const keywordIdSet = new Set(keywords.map((keyword) => keyword.id));

  cards.forEach((card) => validateCard(card, keywordIdSet));
  characters.forEach(validateCharacter);
  combos.forEach(validateCombo);
  aiProfiles.forEach(validateAiProfile);
}

function buildIndexes(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function loadKeywords() {
  validateAllData();
  return keywords.map(normalizeKeyword);
}

function loadAiProfiles() {
  validateAllData();
  return aiProfiles.map(normalizeAiProfile);
}

function loadCombos() {
  validateAllData();
  return combos.map(normalizeCombo);
}

function loadCards() {
  validateAllData();
  return cards.map(normalizeCard).filter((card) => card.enabled);
}

function loadCharacters() {
  validateAllData();
  return characters.map(normalizeCharacter);
}

function getCardsByGroup(group) {
  return loadCards().filter((card) => card.group === group);
}

function getCardById(cardId) {
  return buildIndexes(loadCards()).get(cardId) || null;
}

function getCharacterById(characterId) {
  return buildIndexes(loadCharacters()).get(characterId) || null;
}

function getKeywordById(keywordId) {
  return buildIndexes(loadKeywords()).get(keywordId) || null;
}

function getComboById(comboId) {
  return buildIndexes(loadCombos()).get(comboId) || null;
}

function getAiProfileById(profileId) {
  return buildIndexes(loadAiProfiles()).get(profileId) || null;
}

module.exports = {
  validateAllData,
  validateCard,
  validateCharacter,
  validateKeyword,
  validateCombo,
  validateAiProfile,
  loadCards,
  loadCharacters,
  loadKeywords,
  loadCombos,
  loadAiProfiles,
  getCardsByGroup,
  getCardById,
  getCharacterById,
  getKeywordById,
  getComboById,
  getAiProfileById,
};