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