const { createMatch, submitSelection, playOneTurn } = require("../../server/game/gameEngine");

test("debug advantage", () => {
  const state = createMatch();
  const [p1, p2] = state.players;
  console.log("initial p1 pos", JSON.stringify(p1.position), "facing", p1.facing);
  console.log("initial p2 pos", JSON.stringify(p2.position), "facing", p2.facing);
  p1.position = { x: 1, y: 1 };
  p2.position = { x: 1, y: 2 };
  p2.lastRevealedSubtype = "weapon";
  const punchAttack = { id: "basic_punch", type: "attack", subtype: "punch", mpCost: 1, rangeMin: 1, rangeMax: 1, damage: 2, keywords: ["basic"] };
  submitSelection(state, "P1", [{ card: punchAttack }]);
  submitSelection(state, "P2", []);
  console.log("p1 passiveId", p1.passiveId, "passives", JSON.stringify(p1.passives));
  const { getFrontDamageBonus } = require("../../server/game/rules/passiveResolver");
  console.log("p1 frontDamageBonus", getFrontDamageBonus(p1));
  playOneTurn(state);
  console.log("after p1 facing", p1.facing, "p2 facing", p2.facing);
  console.log("log:", state.log.filter((m) => m.includes("傷害")).join(" | "));
  expect(true).toBe(true);
});


