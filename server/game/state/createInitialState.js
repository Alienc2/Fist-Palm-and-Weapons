// server/game/state/createInitialState.js

const cardLoader = require("../../../shared/cardLoader");

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
  const basicCards = cardLoader.getCardsByGroup("basic");
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

    if (starterDeck.length === 0) {
      throw new Error(
        `[createInitialState] starter deck is empty for character ${character?.id || "unknown"}`
      );
    }

    return starterDeck;
    }

function createShopState() {
  const shopCards = cardLoader.getCardsByGroup("shop");

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

function shuffle(array, rng = Math.random) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function drawInitialHand(deck, handSize, ownerId) {
  const workingDeck = [...shuffle(deck)];
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

// 計算起始朝向：指向棋盤中心 (2,2)
// 優先 y 軸（up/down），其次 x 軸（left/right）
function getFacingTowardCenter(position, center = { x: 2, y: 2 }) {
  const dx = center.x - position.x;
  const dy = center.y - position.y;

  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy > 0 ? "down" : dy < 0 ? "up" : "right";
  }
  return dx > 0 ? "right" : dx < 0 ? "left" : "up";
}

// 確保起始手牌包含 basic_buy（學習武功），若無則從牌庫換入
function ensureBasicBuyInHand(hand, deck, ownerId) {
  const hasBasicBuy = hand.some((card) => card.definitionId === "basic_buy");
  if (hasBasicBuy) {
    return { hand, deck };
  }

  const buyIndex = deck.findIndex((card) => card.definitionId === "basic_buy");
  if (buyIndex === -1) {
    return { hand, deck };
  }

  const [buyCard] = deck.splice(buyIndex, 1);
  const swapped = hand.pop();
  if (swapped) {
    deck.unshift(swapped);
  }
  hand.push({
    ...buyCard,
    zone: "hand",
    instanceId: `${ownerId}:hand:${buyCard.definitionId}:${hand.length}`,
  });

  return { hand, deck };
}


function createPlayer(id, position, characterId) {
  const fallbackCharacter = cardLoader.loadCharacters()[0];
  const character = cardLoader.getCharacterById(characterId) || fallbackCharacter;

  if (!character) {
    throw new Error("[createInitialState] 找不到可用角色資料");
  }

  const rawStarterDeck = createStarterDeck(character, id);
  const drawn = drawInitialHand(rawStarterDeck, character.initialHandSize, id);
  const { hand, deck } = ensureBasicBuyInHand(drawn.hand, drawn.deck, id);


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
    handLimit: character.handLimit || 8,
    pendingDiscards: [],
    position: { x: position.x, y: position.y },
    facing: getFacingTowardCenter(position),

    selectedCards: [],
    lastDefenseCard: null,
    lastRevealedSubtype: null,
    guardSubtype: null,
    isEliminated: false,
  };
}


function createInitialState(options = {}) {
  cardLoader.validateAllData();

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
  createStarterDeck,
};