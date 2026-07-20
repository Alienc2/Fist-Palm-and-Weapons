const path = require("node:path");

let document;
let fetchMock;

function createElement(id) {
  const handlers = {};
  return {
    id,
    textContent: "",
    className: "",
    innerHTML: "",
    value: "",
    options: [],
    appendChild: jest.fn(),
    addEventListener: jest.fn((event, handler) => {
      handlers[event] = handler;
    }),
    click: jest.fn(() => {
      if (handlers.click) handlers.click();
    }),
    setAttribute: jest.fn(),
    _handlers: handlers,
  };
}

function buildDom() {
  const ids = [
    "scenarioSelect",
    "scenarioDescription",
    "runButton",
    "resetButton",
    "statusText",
    "adapterModeText",
    "initialStateOutput",
    "p1SelectionOutput",
    "p2SelectionOutput",
    "finalStateOutput",
    "logOutput",
    "errorOutput",
    "themeToggle",
  ];

  const elements = new Map();
  const doc = {
    body: { innerHTML: "" },
    documentElement: {
      getAttribute: jest.fn(() => null),
      setAttribute: jest.fn(),
    },
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      textContent: "",
      className: "",
      value: "",
      appendChild: jest.fn(),
      setAttribute: jest.fn(),
    }),
    querySelector: (selector) => {
      const id = selector.startsWith("#") ? selector.slice(1) : selector;
      if (!elements.has(id)) elements.set(id, createElement(id));
      return elements.get(id);
    },
  };

  ids.forEach((id) => doc.querySelector(`#${id}`));
  return doc;
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function setupGlobals() {
  global.structuredClone = global.structuredClone || ((value) => JSON.parse(JSON.stringify(value)));
}

describe("browser sandbox contract", () => {
  beforeEach(() => {
    jest.resetModules();
    document = buildDom();
    fetchMock = jest.fn();
    global.document = document;
    global.window = { document };
    global.fetch = fetchMock;
  });

  afterEach(() => {
    delete global.structuredClone;
  });

  test("shows API unavailable when bootstrap fetch fails", async () => {
    jest.doMock("../../server/game/debug/browser-api-adapter", () => ({
      fetchHealth: jest.fn().mockRejectedValue(new Error("Health check failed: 500")),
      fetchScenarios: jest.fn(),
      runScenario: jest.fn(),
    }));
    jest.doMock("../../server/game/debug/scenarios", () => ({
      getScenarioByName: jest.fn(() => ({ name: "move-vs-defense", description: "stub" })),
    }));

    require("../../server/game/debug/browser-sandbox");
    await flushPromises();
    await flushPromises();

    expect(document.querySelector("#statusText").textContent).toBe("API unavailable");
    expect(document.querySelector("#adapterModeText").textContent).toBe("Adapter mode: api-error");
    expect(document.querySelector("#errorOutput").textContent).toMatch(/Health check failed/i);
  });

  test("shows api-error when runScenario rejects", async () => {
    jest.doMock("../../server/game/debug/browser-api-adapter", () => ({
      fetchHealth: jest.fn().mockResolvedValue({ port: 3001 }),
      fetchScenarios: jest.fn().mockResolvedValue({ scenarios: ["move-vs-defense"] }),
      runScenario: jest.fn().mockRejectedValue(new Error("Run scenario request failed: 500")),
    }));
    jest.doMock("../../server/game/debug/scenarios", () => ({
      getScenarioByName: jest.fn(() => ({ name: "move-vs-defense", description: "stub" })),
    }));

    const sandbox = require("../../server/game/debug/browser-sandbox");
    await flushPromises();
    await flushPromises();

    const runButton = document.querySelector("#runButton");
    runButton.click();
    await flushPromises();
    await flushPromises();

    expect(document.querySelector("#adapterModeText").textContent).toBe("Adapter mode: api-error");
    expect(document.querySelector("#statusText").textContent).toBe("Adapter failed");
    expect(document.querySelector("#errorOutput").textContent).toMatch(/Run scenario request failed/i);
    expect(sandbox.handleRun).toBeDefined();
  });
});
