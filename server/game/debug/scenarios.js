import scenarios from "./scenario-data.json" with { type: "json" };

export { scenarios };

export function getScenarioList() {
  return Object.values(scenarios);
}

export function getScenarioByName(name) {
  return scenarios[name] || null;
}
