import { fetchHealth, fetchScenarios } from "./browser-api-adapter.js";
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
  refs.logOutput.innerHTML = "<div class=\"log-empty\">No log yet.</div>";
  refs.adapterModeText.textContent = "Adapter mode: api-only";
  setStatus("idle", "Idle");
}

function renderScenarioOptions(scenarios) {
  refs.scenarioSelect.innerHTML = "";
  for (const scenarioName of scenarios) {
    const option = document.createElement("option");
    option.value = scenarioName;
    option.textContent = scenarioName;
    refs.scenarioSelect.appendChild(option);
  }
}

function handleThemeToggle() {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme");
  root.setAttribute("data-theme", current === "dark" ? "light" : "dark");
}

function bindEvents() {
  refs.scenarioSelect.addEventListener("change", renderScenarioDescription);
  refs.resetButton.addEventListener("click", renderEmptyState);
  refs.themeToggle.addEventListener("click", handleThemeToggle);
}

async function init() {
  renderEmptyState();
  bindEvents();

  try {
    const health = await fetchHealth();
    const data = await fetchScenarios();

    renderScenarioOptions(data.scenarios || []);
    if ((data.scenarios || []).length > 0) {
      refs.scenarioSelect.value = data.scenarios[0];
      renderScenarioDescription();
    }

    refs.adapterModeText.textContent = `Adapter mode: api-only @ localhost:${health.port}`;
    setStatus("success", "API ready");
  } catch (error) {
    refs.adapterModeText.textContent = "Adapter mode: api-error";
    refs.errorOutput.textContent = error instanceof Error ? error.message : String(error);
    setStatus("error", "API unavailable");
  }
}

init();