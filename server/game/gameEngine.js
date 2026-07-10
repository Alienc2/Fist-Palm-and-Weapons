// matchState
{
  matchId: "test-match",
  phase: "SELECT_CARDS" | "RESOLVE_TURN" | "END_TURN" | "DRAW_PHASE" | "DISCARD_TO_LIMIT" | "ROUND_START",
  round: 1,
  startingPlayerIndex: 0,
  revealIndex: 0,
  players: [
    {
      id: "P1",
      hp: 10,
      mp: 3,
      hand: [cardInstance...],
      deck: [cardInstance...],
      discard: [],
      position: { x: 1, y: 1 },
      facing: "up",
      selectedCards: [], // 本回合選牌順序
      lastDefenseCard: null, // 防禦殘留
      isEliminated: false,
    },
    ...
  ],
  log: [],
}