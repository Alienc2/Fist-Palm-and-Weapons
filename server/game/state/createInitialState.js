// server/game/state/createInitialState.js

const {
  getCardsByGroup,
  getCharacterById,
  loadCharacters,
  validateAllData,
} = require("../../../shared/cardLoader");

function cloneCard(card, ownerId, zone, sequence) {
  return {
    ...card,
    instanceId: `${ownerId}:${zone}:${card.id}:${sequence}`,
    definitionId: card.id,
    ownerId,
    zone,
  };
}

function getStarterSetKeysForCharacter(character) {
  const roleToSetKey = {
    attack: "1",
    defense: "2",
    move: "3",
    balanced: "4",
  };

  const roleKey = roleToSetKey[character.role] || null;
  return ["all", roleKey].filter(Boolean);
}

function createStarterDeck(character, ownerId) {
  const basicCards = getCardsByGroup("basic");
  const allowedSetKeys = new Set(
    getStarterSetKeysForCharacter(character).map((value) => String(value).toUpperCase())
  );

  const starterDeck = [];
  let sequence = 0;

  for (const card of basicCards) {
    const cardSetKey = String(card.defaultCardSet || "").trim().toUpperCase();
    const copies = Number(card.defaultCopiesInHand || 0);

    if (!allowedSetKeys.has(cardSetKey)) {
      continue;
    }

    if (copies <= 0) {
      continue;
    }

    for (let i = 0; i < copies; i++) {
      sequence += 1;
      starterDeck.push(
        cloneCard(
          {
            ...card,
            starterOwnerRole: character.role,
            starterCharacterId: character.id,
          },
          ownerId,
          "deck",
          sequence
        )
      );
    }
  }

  return starterDeck;
}

function createShopState() {
  const shopCards = getCardsByGroup("shop");

  return {
    cards: shopCards.map((card) => ({
      ...card,
      definitionId: card.id,
      stock: Number(card.stock || 0),
    })),
    stockByCardId: Object.fromEntries(
      shopCards.map((card) => [card.id, Number(card.stock || 0)])
    ),
  };
}

function drawInitialHand(deck, handSize, ownerId) {
  const workingDeck = [...deck];
  const hand = [];

  for (let i = 0; i < handSize; i++) {
    if (workingDeck.length === 0) break;
    const nextCard = workingDeck.shift();
    hand.push({
      ...nextCard,
      zone: "hand",
      instanceId: `${ownerId}:hand:${nextCard.definitionId}:${i + 1}`,
    });
  }

  return {
    hand,
    deck: workingDeck,
  };
}

function createPlayer(id, position, characterId) {
  const fallbackCharacter = loadCharacters()[0];
  const character = getCharacterById(characterId) || fallbackCharacter;

  if (!character) {
    throw new Error("[createInitialState] 找不到可用角色資料");
  }

  const rawStarterDeck = createStarterDeck(character, id);
  const { hand, deck } = drawInitialHand(rawStarterDeck, character.initialHandSize, id);

  const passiveEntry = character.passiveId
    ? [
        {
          id: character.passiveId,
          source: "character",
          params: character.passiveParams || {},
          enabled: true,
        },
      ]
    : [];

  return {
    id,
    characterId: character.id,
    characterName: character.name,
    role: character.role,
    tokenColor: character.tokenColor,
    passiveId: character.passiveId,
    passiveParams: character.passiveParams,
    passives: passiveEntry,
    activeEffects: [],
    hp: character.initialHp,
    maxHp: character.initialHp,
    mp: character.initialMp,
    maxMp: character.initialMp,
    hand,
    deck,
    discard: [],
    position: { x: position.x, y: position.y },
    facing: "up",
    selectedCards: [],
    lastDefenseCard: null,
    lastRevealedSubtype: null,
    guardSubtype: null,
    isEliminated: false,
  };
}

function createInitialState(options = {}) {
  validateAllData();

  const {
    matchId = "test-match",
    phase = "ROUND_START",
    round = 1,
    revealIndex = 0,
    startingPlayerIndex = 0,
    players = [
      { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
      { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense" },
    ],
  } = options;

  const normalizedPlayers = players.map((player) =>
    createPlayer(player.id, player.position, player.characterId)
  );

  return {
    matchId,
    phase,
    round,
    turn: 1,
    revealIndex,
    startingPlayerIndex,
    activePlayerIndex: startingPlayerIndex,
    turnOrder: normalizedPlayers.map((player) => player.id),
    players: normalizedPlayers,
    shop: createShopState(),
    stack: [],
    eliminatedPlayers: [],
    log: [],
  };
}

module.exports = {
  createInitialState,
};