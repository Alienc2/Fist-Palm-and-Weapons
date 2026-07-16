export async function fetchHealth() {
  const res = await fetch("/api/health");
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchScenarios() {
  const res = await fetch("/api/scenarios");
  if (!res.ok) {
    throw new Error(`Scenarios request failed: ${res.status}`);
  }
  return res.json();
}

export async function runScenario(scenarioName) {
  const res = await fetch("/api/run-scenario", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioName }),
  });
  if (!res.ok) {
    throw new Error(`Run scenario request failed: ${res.status}`);
  }
  return res.json();
}
