function serializePlayer(player) {
  return {
    id: player.id,
    hp: player.hp,
    mp: player.mp,
    position: player.position,
    handCount: Array.isArray(player.hand) ? player.hand.length : 0,
    deckCount: Array.isArray(player.deck) ? player.deck.length : 0,
    discardCount: Array.isArray(player.discard) ? player.discard.length : 0,
    lastRevealedSubtype: player.lastRevealedSubtype || null,
  };
}

function serializeMatchState(state) {
  return {
    round: state.round ?? null,
    startingPlayerIndex: state.startingPlayerIndex ?? null,
    stackCount: Array.isArray(state.stack) ? state.stack.length : 0,
    players: Array.isArray(state.players) ? state.players.map(serializePlayer) : [],
    shop: Array.isArray(state.shop)
      ? state.shop.map((item) => ({
          id: item.id,
          stock: item.stock,
          cost: item.cost,
        }))
      : [],
    log: Array.isArray(state.log) ? state.log : [],
  };
}

module.exports = {
  serializeMatchState,
};