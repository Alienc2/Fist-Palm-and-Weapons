export const scenarios = {
  "move-vs-defense": {
    name: "move-vs-defense",
    description: "P1 moves one step. P2 uses defense.",
    p1Selection: [
      {
        cardId: "basic_move_1",
        type: "move",
        subtype: "step",
        extra: { dx: 1, dy: 0 },
      },
    ],
    p2Selection: [
      {
        cardId: "basic_guard_2",
        type: "defense",
        subtype: "any",
        extra: {},
      },
    ],
  },

  "attack-vs-attack": {
    name: "attack-vs-attack",
    description: "P1 and P2 both reveal one attack card.",
    p1Selection: [
      {
        cardId: "basic_punch_1",
        type: "attack",
        subtype: "punch",
        extra: {},
      },
    ],
    p2Selection: [
      {
        cardId: "basic_palm_1",
        type: "attack",
        subtype: "palm",
        extra: {},
      },
    ],
  },

  "buy-vs-idle": {
    name: "buy-vs-idle",
    description: "P1 enters the shop and buys one card. P2 does nothing.",
    p1Selection: [
      {
        cardId: "basic_buy",
        type: "buy",
        subtype: "shop",
        extra: { shopCardId: "shop_mp_1" },
      },
    ],
    p2Selection: [],
  },
};

export function getScenarioList() {
  return Object.values(scenarios);
}

export function getScenarioByName(name) {
  return scenarios[name] || null;
}