// server/game/state/createInitialState.js

function createBasicDeck() {
  // 暫時簡化：幾張基本攻擊、防禦、移動、購買
  return [
    { id: "basic_punch", type: "attack", subtype: "punch", mpCost: 1, rangeMin: 1, rangeMax: 1, damage: 2, keywords: ["basic"] },
    { id: "basic_palm", type: "attack", subtype: "palm", mpCost: 1, rangeMin: 1, rangeMax: 1, damage: 2, keywords: ["basic"] },
    { id: "basic_weapon", type: "attack", subtype: "weapon", mpCost: 1, rangeMin: 2, rangeMax: 2, damage: 1, keywords: ["basic"] },
    { id: "basic_guard", type: "defense", subtype: "any", mpCost: 1, rangeMin: 1, rangeMax: 2, blockValue: 999, keywords: ["basic", "persist_guard"] },
    { id: "basic_move", type: "move", subtype: "step", mpCost: 1, moveMin: 1, moveMax: 1, keywords: ["basic"] },
    { id: "basic_buy", type: "buy", subtype: "shop", mpCost: 0, keywords: ["basic", "shop_entry"] },
  ];
}

function createPlayer(id, position) {
  const deck = createBasicDeck();
  return {
    id,
    hp: 10,
    mp: 3,
    hand: deck.slice(0, 4),
    deck: deck.slice(4),
    discard: [],
    position: { x: position.x, y: position.y },
    facing: "up",
    selectedCards: [],
    lastDefenseCard: null,
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
      createPlayer("P1", { x: 1, y: 1 }),
      createPlayer("P2", { x: 3, y: 3 }),
    ],
    log: [],
  };
}

module.exports = {
  createInitialState,
};