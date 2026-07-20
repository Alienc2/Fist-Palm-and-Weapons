import { fetchHealth, fetchScenarios, runScenario } from "./browser-api-adapter.js";
import { getScenarioByName } from "./scenarios.js";

const refs = {
  scenarioSelect: document.querySelector("#scenarioSelect"),
  scenarioDescription: document.querySelector("#scenarioDescription"),
  runButton: document.querySelector("#runButton"),
  resetButton: document.querySelector("#resetButton"),
  statusText: document.querySelector("#statusText"),
  adapterModeText: document.querySelector("#adapterModeText"),
  initialStateOutput: document.querySelector("#initialStateOutput"),
  p1SelectionOutput: document.querySelector("#p1SelectionOutput"),
  p2SelectionOutput: document.querySelector("#p2SelectionOutput"),
  finalStateOutput: document.querySelector("#finalStateOutput"),
  logOutput: document.querySelector("#logOutput"),
  errorOutput: document.querySelector("#errorOutput"),
  themeToggle: document.querySelector("#themeToggle"),
};

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function setStatus(type, text) {
  refs.statusText.className = `status-pill status-${type}`;
  refs.statusText.textContent = text;
}

function renderScenarioDescription() {
  const scenario = getScenarioByName(refs.scenarioSelect.value);
  refs.scenarioDescription.textContent = scenario ? scenario.description : "";
}

function renderEmptyState() {
  refs.initialStateOutput.textContent = "No data yet.";
  refs.p1SelectionOutput.textContent = "No data yet.";
  refs.p2SelectionOutput.textContent = "No data yet.";
  refs.finalStateOutput.textContent = "No data yet.";
  refs.errorOutput.textContent = "No error.";
  refs.logOutput.innerHTML = "<div class="log-empty">No log yet.</div>";
  setStatus("idle", "Idle");
}

function classifyLogLine(line) {
  if (/失敗|error|invalid/i.test(line)) return "error";
  if (/距離不符|warning|不足/i.test(line)) return "warn";
  return "info";
}

function renderLogs(logs) {
  refs.logOutput.innerHTML = "";
  if (!logs || logs.length === 0) {
    refs.logOutput.innerHTML = "<div class="log-empty">No log yet.</div>";
    return;
  }
  logs.forEach((line) => {
    const item = document.createElement("div");
    item.className = `log-item ${classifyLogLine(line)}`;
    item.textContent = line;
    refs.logOutput.appendChild(item);
  });
}

function renderResult(result) {
  refs.initialStateOutput.textContent = formatJson(result.initialState);
  refs.p1SelectionOutput.textContent = formatJson(result.p1Selection);
  refs.p2SelectionOutput.textContent = formatJson(result.p2Selection);
  refs.finalStateOutput.textContent = formatJson(result.finalState);
  refs.errorOutput.textContent = result.error ? String(result.error) : "No error.";
  renderLogs(result.log);
  refs.adapterModeText.textContent = `Adapter mode: ${result.adapterMode}`;
  setStatus(result.error ? "error" : "success", result.error ? "Completed with error" : `Completed (${result.adapterMode})`);
}

async function handleRun() {
  const scenario = getScenarioByName(refs.scenarioSelect.value);
  if (!scenario) {
    setStatus("error", "Scenario not found");
    refs.errorOutput.textContent = "Scenario not found.";
    return;
  }
  setStatus("running", "Running");
  try {
    const result = await runScenario(scenario.name);
    renderResult(result);
  } catch (error) {
    setStatus("error", "Adapter failed");
    refs.adapterModeText.textContent = "Adapter mode: api-error";
    refs.errorOutput.textContent = error instanceof Error ? error.stack || error.message : String(error);
  }
}

function handleThemeToggle() {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme");
  root.setAttribute("data-theme", current === "dark" ? "light" : "dark");
}

function bindEvents() {
  refs.scenarioSelect.addEventListener("change", renderScenarioDescription);
  refs.runButton.addEventListener("click", handleRun);
  refs.resetButton.addEventListener("click", renderEmptyState);
  refs.themeToggle.addEventListener("click", handleThemeToggle);
}

function populateScenarioSelect(scenarios) {
  refs.scenarioSelect.innerHTML = "";
  for (const scenarioName of scenarios) {
    const option = document.createElement("option");
    option.value = scenarioName;
    option.textContent = scenarioName;
    refs.scenarioSelect.appendChild(option);
  }
  if (scenarios.length > 0) {
    refs.scenarioSelect.value = scenarios[0];
  }
  renderScenarioDescription();
}

async function init() {
  renderEmptyState();
  bindEvents();
  try {
    const health = await fetchHealth();
    const data = await fetchScenarios();
    populateScenarioSelect(data.scenarios || []);
    refs.adapterModeText.textContent = `Adapter mode: localhost:${health.port}`;
    setStatus("success", "API ready");
  } catch (error) {
    refs.adapterModeText.textContent = "Adapter mode: api-error";
    refs.errorOutput.textContent = error instanceof Error ? error.message : String(error);
    setStatus("error", "API unavailable");
  }
}

init();

export {
  init,
  renderResult,
  renderEmptyState,
  setStatus,
  handleRun,
};
