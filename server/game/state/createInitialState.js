// server/game/state/createInitialState.js

const {
  getCardsByGroup,
  getCharacterById,
  loadCharacters,
} = require("../../../shared/cardLoader");

function createStarterDeck() {
  const basicCards = getCardsByGroup("basic");

  // 先做最小版：每張 basic enabled 卡各取 1 張
  return basicCards.map((card) => ({ ...card }));
}

function drawInitialHand(deck, handSize) {
  const hand = [];
  for (let i = 0; i < handSize; i++) {
    if (deck.length === 0) break;
    hand.push(deck.shift());
  }
  return hand;
}

function createPlayer(id, position, characterId) {
  const fallbackCharacter = loadCharacters()[0];
  const character = getCharacterById(characterId) || fallbackCharacter;

  const deck = createStarterDeck();
  const hand = drawInitialHand(deck, character.initialHandSize);

  return {
    id,
    characterId: character.id,
    characterName: character.name,
    hp: character.initialHp,
    mp: character.initialMp,
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

function createInitialState() {
  return {
    matchId: "test-match",
    phase: "ROUND_START",
    round: 1,
    startingPlayerIndex: 0,
    revealIndex: 0,
    players: [
      createPlayer("P1", { x: 1, y: 1 }, "char_attack"),
      createPlayer("P2", { x: 3, y: 3 }, "char_defense"),
    ],
    log: [],
  };
}

module.exports = {
  createInitialState,
};