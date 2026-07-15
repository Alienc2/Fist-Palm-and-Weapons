const path = require("path");

const gameEngine = require(path.resolve(__dirname, "../server/game/gameEngine"));
const cards = require(path.resolve(__dirname, "../generated/cards.json"));

const { createMatch, submitSelection, playOneTurn } = gameEngine;

function getCard(cardId) {
  const card = cards.find((item) => item.id === cardId);
  if (!card) {
    const availableIds = cards.slice(0, 30).map((item) => item.id).join(", ");
    throw new Error(`找不到 card: ${cardId}；可用 card id 範例：${availableIds}`);
  }
  return card;
}

function summarizePlayer(player) {
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

function summarizeShop(state) {
  if (!Array.isArray(state.shop)) {
    return [];
  }

  return state.shop.map((item) => ({
    id: item.id,
    stock: item.stock,
    cost: item.cost,
  }));
}

function summarizeState(state) {
  return {
    round: state.round ?? null,
    startingPlayerIndex: state.startingPlayerIndex ?? null,
    stackCount: Array.isArray(state.stack) ? state.stack.length : 0,
    players: Array.isArray(state.players) ? state.players.map(summarizePlayer) : [],
    shop: summarizeShop(state),
    log: Array.isArray(state.log) ? state.log : [],
  };
}

function summarizeSelection(selection) {
  return selection.map((item) => ({
    cardId: item.card.id,
    type: item.card.type,
    subtype: item.card.subtype,
    extra: item.extra,
  }));
}

function printSection(title, payload) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(payload, null, 2));
}

function createScenarios() {
  return {
    "move-vs-defense": {
      description: "P1 移動，P2 防禦",
      p1Selection: [
        {
          card: getCard("basic_move_1"),
          extra: { dx: 1, dy: 0 },
        },
      ],
      p2Selection: [
        {
          card: getCard("basic_guard_2"),
          extra: {},
        },
      ],
    },

    "attack-vs-attack": {
      description: "P1 與 P2 各出 1 張 attack",
      p1Selection: [
        {
          card: getCard("basic_punch_1"),
          extra: {},
        },
      ],
      p2Selection: [
        {
          card: getCard("basic_palm_1"),
          extra: {},
        },
      ],
    },

    "buy-vs-idle": {
      description: "P1 使用 buy，P2 不出牌",
      p1Selection: [
        {
          card: getCard("basic_buy"),
          extra: { shopCardId: "shop_mp_1" },
        },
      ],
      p2Selection: [],
    },
  };
}

function getScenarioName() {
  return process.argv[2] || "move-vs-defense";
}

function main() {
  const scenarioName = getScenarioName();
  const scenarios = createScenarios();
  const scenario = scenarios[scenarioName];

  if (!scenario) {
    throw new Error(
      `未知 scenario: ${scenarioName}；可用 scenarios: ${Object.keys(scenarios).join(", ")}`
    );
  }

  const state = createMatch();

  printSection("Scenario", {
    name: scenarioName,
    description: scenario.description,
  });

  printSection("初始 State", summarizeState(state));
  printSection("P1 Selection", summarizeSelection(scenario.p1Selection));
  printSection("P2 Selection", summarizeSelection(scenario.p2Selection));

  submitSelection(state, "P1", scenario.p1Selection);
  submitSelection(state, "P2", scenario.p2Selection);

  playOneTurn(state);

  printSection("回合後 State", summarizeState(state));
}

main();