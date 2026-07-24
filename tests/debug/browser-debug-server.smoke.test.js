const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "../..");
const HTML_PATH = path.join(ROOT_DIR, "server", "game", "debug", "browser-sandbox.html");
const SERVER_MODULE_PATH = "../../server/game/debug/browser-debug-server";

function makeRequest(server, method, requestPath, body, headers = {}) {
  const address = server.address();
  const payload = body === undefined ? null : body;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path: requestPath,
        method,
        headers: {
          ...(payload !== null
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      }
    );

    req.on("error", reject);

    if (payload !== null) {
      req.write(payload);
    }

    req.end();
  });
}

describe("browser debug server happy path smoke", () => {
  let server;
  let createServer;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, "log").mockImplementation(() => {});
    createServer = require(SERVER_MODULE_PATH).createServer;
  });

  afterEach((done) => {
    jest.restoreAllMocks();
    if (server) {
      server.close(() => {
        server = null;
        done();
      });
      return;
    }
    done();
  });

  test("serves sandbox html, health, and scenarios", async () => {
    expect(fs.existsSync(HTML_PATH)).toBe(true);

    server = createServer(0, {
      runScenarioFn: async (scenarioName) => ({
        ok: true,
        adapterMode: "server-api-real-engine",
        scenario: { name: scenarioName, description: "smoke test scenario" },
        initialState: { turn: 1 },
        p1Selection: [],
        p2Selection: [],
        finalState: { turn: 2 },
        log: ["ran scenario"],
        error: null,
      }),
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const htmlResponse = await makeRequest(server, "GET", "/server/game/debug/browser-sandbox.html");
    expect(htmlResponse.statusCode).toBe(200);
    expect(htmlResponse.headers["content-type"]).toMatch(/text\/html/);
    expect(htmlResponse.body).toContain("scenarioSelect");
    expect(htmlResponse.body).toContain("runButton");
    expect(htmlResponse.body).toContain("adapterModeText");
    expect(htmlResponse.body).toContain("statusText");

    const healthResponse = await makeRequest(server, "GET", "/api/health");
    expect(healthResponse.statusCode).toBe(200);
    const health = JSON.parse(healthResponse.body);
    expect(health.ok).toBe(true);
    expect(health.service).toBe("browser-debug-server");
    expect(typeof health.port).toBe("number");

    const scenariosResponse = await makeRequest(server, "GET", "/api/scenarios");
    expect(scenariosResponse.statusCode).toBe(200);
    const scenarios = JSON.parse(scenariosResponse.body);
    expect(scenarios.ok).toBe(true);
    expect(Array.isArray(scenarios.scenarios)).toBe(true);
    expect(scenarios.scenarios.length).toBeGreaterThan(0);
  });
});