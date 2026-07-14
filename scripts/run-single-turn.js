const path = require("path");

const gameEngine = require(path.resolve(__dirname, "../server/game/gameEngine"));
const cards = require(path.resolve(__dirname, "../generated/cards.json"));

const { createMatch, submitSelection, playOneTurn } = gameEngine;

function getCard(cardId) {
  const card = cards.find((item) => item.id === cardId);
  if (!card) {
    throw new Error(`找不到 card: ${cardId}`);
  }
  return card;
}

const {
  serializeMatchState,
} = require(path.resolve(__dirname, "../server/game/debug/serializeMatchState"));

function printSection(title, payload) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(payload, null, 2));
}

function main() {
  const playerConfigs = [
    { id: "P1", characterId: "hero_1" },
    { id: "P2", characterId: "hero_2" },
  ];

  const state = createMatch({
    playerConfigs,
    startingPlayerIndex: 0,
  });

  const p1Move = getCard("basic_move_1");
  const p2Defense = getCard("basic_guard_2");

  printSection("初始 State", serializeMatchState(state));

  const p1Selection = [
    {
      card: p1Move,
      extra: { dx: 1, dy: 0 },
    },
  ];

  const p2Selection = [
    {
      card: p2Defense,
      extra: {},
    },
  ];

  printSection("P1 Selection", p1Selection.map((item) => ({
    cardId: item.card.id,
    type: item.card.type,
    extra: item.extra,
  })));

  printSection("P2 Selection", p2Selection.map((item) => ({
    cardId: item.card.id,
    type: item.card.type,
    extra: item.extra,
  })));

  submitSelection(state, "P1", p1Selection);
  submitSelection(state, "P2", p2Selection);

  playOneTurn(state);

  printSection("回合後 State", serializeMatchState(state));
}

main();