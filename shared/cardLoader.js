// shared/cardLoader.js

const path = require("path");

const cards = require(path.join(__dirname, "..", "generated", "cards.json"));
const characters = require(path.join(__dirname, "..", "generated", "characters.json"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[cardLoader] ${message}`);
  }
}

function validateCard(card) {
  assert(card && typeof card === "object", "card 必須為 object");
  assert(card.id, "card.id 缺失");
  assert(card.type, `card.type 缺失: ${card.id}`);
  assert(card.subtype !== undefined, `card.subtype 缺失: ${card.id}`);
  assert(card.name_zh, `card.name_zh 缺失: ${card.id}`);
  assert(card.group, `card.group 缺失: ${card.id}`);

  if (card.type === "attack") {
    assert(card.range_min !== undefined, `attack range_min 缺失: ${card.id}`);
    assert(card.range_max !== undefined, `attack range_max 缺失: ${card.id}`);
    assert(card.damage !== undefined, `attack damage 缺失: ${card.id}`);
  }

  if (card.type === "move") {
    assert(card.move_min !== undefined, `move move_min 缺失: ${card.id}`);
    assert(card.move_max !== undefined, `move move_max 缺失: ${card.id}`);
  }
}

function validateCharacter(character) {
  assert(character && typeof character === "object", "character 必須為 object");
  assert(character.id, "character.id 缺失");
  assert(character.name_zh, `character.name_zh 缺失: ${character.id}`);
  assert(character.initial_hp !== undefined, `character.initial_hp 缺失: ${character.id}`);
  assert(character.initial_mp !== undefined, `character.initial_mp 缺失: ${character.id}`);
  assert(character.initial_hand_size !== undefined, `character.initial_hand_size 缺失: ${character.id}`);
}

function validateAllData() {
  assert(Array.isArray(cards), "generated/cards.json 必須為陣列");
  assert(Array.isArray(characters), "generated/characters.json 必須為陣列");

  cards.forEach(validateCard);
  characters.forEach(validateCharacter);
}

function normalizeNumber(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function normalizeCard(card) {
  return {
    id: card.id,
    name: card.name_zh,
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
    targetRule: card.target_rule || "single",
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
    passiveParams: character.passive_params || null,
    description: character.description || "",
  };
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
  return loadCards().find((card) => card.id === cardId);
}

function getCharacterById(characterId) {
  return loadCharacters().find((character) => character.id === characterId);
}

module.exports = {
  validateAllData,
  loadCards,
  loadCharacters,
  getCardsByGroup,
  getCardById,
  getCharacterById,
};