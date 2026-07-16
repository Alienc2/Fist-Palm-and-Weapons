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
  refs.logOutput.innerHTML = "<div class=\"log-empty\">No log yet.</div>";
  refs.adapterModeText.textContent = "Adapter mode: api-only";
  setStatus("idle", "Idle");
}

function classifyLogLine(line) {
  if (/失敗|error|invalid/i.test(line)) {
    return "error";
  }
  if (/距離不符|warning|不足/i.test(line)) {
    return "warn";
  }
  return "info";
}

function renderLogs(logs) {
  refs.logOutput.innerHTML = "";
  if (!logs || logs.length === 0) {
    refs.logOutput.innerHTML =
      '<div class="log-empty">No log yet.</div>';
    return;
  }
  logs.forEach((line) => {
    const item = document.createElement("div");
    item.className = `log-item ${classifyLogLine(line)}`;
    item.textContent = line;
    refs.logOutput.appendChild(item);
  });
}

// stub initial state，用來配合 FIX-36/37 單回合 debug runner
function createInitialStateSnapshot() {
  return {
    round: 1,
    startingPlayerIndex: 0,
    stackCount: 0,
    players: [
      {
        id: "P1",
        hp: 9,
        mp: 3,
        position: { x: 1, y: 1 },
        handCount: 4,
        deckCount: 17,
        discardCount: 0,
        lastRevealedSubtype: null,
      },
      {
        id: "P2",
        hp: 12,
        mp: 2,
        position: { x: 3, y: 3 },
        handCount: 4,
        deckCount: 17,
        discardCount: 0,
        lastRevealedSubtype: null,
      },
    ],
    shop: [],
    log: [],
  };
}

// 以 scenarios.js 的 payload 做 stub 行為，不連真 engine
function runScenarioStub(scenario) {
  const initialState = createInitialStateSnapshot();
  const finalState = structuredClone(initialState);
  const log = [];

  if (scenario.name === "move-vs-defense") {
    finalState.round = 2;
    finalState.players[0].position = { x: 2, y: 1 };
    finalState.players[0].handCount = 6;
    finalState.players[0].deckCount = 15;
    finalState.players[0].lastRevealedSubtype = "step";

    finalState.players[1].handCount = 6;
    finalState.players[1].deckCount = 15;
    finalState.players[1].lastRevealedSubtype = "any";

    log.push("P1 moved to (2,1)");
    log.push(
      "P2 used defense basic_guard_2 and keeps the effect until triggered or round end"
    );
  }

  if (scenario.name === "attack-vs-attack") {
    finalState.round = 2;

    finalState.players[0].handCount = 6;
    finalState.players[0].deckCount = 15;
    finalState.players[0].lastRevealedSubtype = "punch";

    finalState.players[1].handCount = 6;
    finalState.players[1].deckCount = 15;
    finalState.players[1].lastRevealedSubtype = "palm";

    log.push(
      "P2 used basic_palm_1 targeting P1, but range was invalid"
    );
    log.push(
      "P1 used basic_punch_1 targeting P2, but range was invalid"
    );
  }

  if (scenario.name === "buy-vs-idle") {
    finalState.round = 2;

    finalState.players[0].mp = 1;
    finalState.players[0].handCount = 6;
    finalState.players[0].deckCount = 15;
    finalState.players[0].discardCount = 1;
    finalState.players[0].lastRevealedSubtype = "shop";

    finalState.players[1].handCount = 6;
    finalState.players[1].deckCount = 15;

    log.push("P1 used basic_buy and entered the shop");
    log.push(
      "P1 bought shop_mp_1 successfully, spent 2 MP, remaining stock 0"
    );
  }

  finalState.log = log;

  return {
    scenario: {
      name: scenario.name,
      description: scenario.description,
    },
    initialState,
    p1Selection: scenario.p1Selection,
    p2Selection: scenario.p2Selection,
    finalState,
    log,
    error: null,
    adapterMode: "stub",
  };
}

function renderResult(result) {
  refs.initialStateOutput.textContent = formatJson(result.initialState);
  refs.p1SelectionOutput.textContent = formatJson(result.p1Selection);
  refs.p2SelectionOutput.textContent = formatJson(result.p2Selection);
  refs.finalStateOutput.textContent = formatJson(result.finalState);
  refs.errorOutput.textContent = result.error
    ? String(result.error)
    : "No error.";
  renderLogs(result.log);
  setStatus("success", `Completed (${result.adapterMode})`);
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
    refs.adapterModeText.textContent = "Adapter mode: server-api-real-engine";
  } catch (error) {
    console.error("[sandbox] run scenario API failed:", error);
    const fallback = runScenarioStub(scenario);
    renderResult(fallback);
    refs.adapterModeText.textContent = "Adapter mode: stub (api-error)";
    refs.errorOutput.textContent =
      error instanceof Error ? error.message : String(error);
    // UI 上顯示係 fallback 狀態，但仍視為完成
    setStatus("error", "API failed, using stub result");
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

async function init() {
  renderEmptyState();
  bindEvents();

  try {
    const health = await fetchHealth();
    const data = await fetchScenarios();

    refs.scenarioSelect.innerHTML = "";
    for (const scenarioName of data.scenarios) {
      const option = document.createElement("option");
      option.value = scenarioName;
      option.textContent = scenarioName;
      refs.scenarioSelect.appendChild(option);
    }

    if (data.scenarios.length > 0) {
      refs.scenarioSelect.value = data.scenarios[0];
      renderScenarioDescription();
    }

    refs.adapterModeText.textContent = `Adapter mode: api-only @ localhost:${health.port}`;
    setStatus("success", "API ready");
  } catch (error) {
    refs.adapterModeText.textContent = "Adapter mode: api-error";
    refs.errorOutput.textContent =
      error instanceof Error ? error.message : String(error);
    setStatus("error", "API unavailable");
  }
}

init();