// server/game/rules/advantage.js
// 拳剋武器，武器剋掌，掌剋拳

const ADV_TABLE = {
  punch: { strongAgainst: "weapon", weakAgainst: "palm" },
  weapon: { strongAgainst: "palm", weakAgainst: "punch" },
  palm: { strongAgainst: "punch", weakAgainst: "weapon" },
};

function getAdvantage(attackerSubtype, defenderSubtype) {
  const conf = ADV_TABLE[attackerSubtype] || {};
  if (conf.strongAgainst === defenderSubtype) return "advantage";
  if (conf.weakAgainst === defenderSubtype) return "disadvantage";
  return "neutral";
}

function getAdvantageModifiers(attackerSubtype, defenderSubtype) {
  const rel = getAdvantage(attackerSubtype, defenderSubtype);
  if (rel === "advantage") return { hit: 1, damage: 1 };
  if (rel === "disadvantage") return { hit: -1, damage: -1 };
  return { hit: 0, damage: 0 };
}

module.exports = {
  ADV_TABLE,
  getAdvantage,
  getAdvantageModifiers,
};