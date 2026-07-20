const http = require("node:http");
const { createServer } = require("../../server/game/debug/browser-debug-server");

function makeRequest(server, method, path, body, headers = {}) {
  const address = server.address();
  const payload = body === undefined ? null : body;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path,
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
            body: data ? JSON.parse(data) : null,
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

describe("POST /api/run-scenario", () => {
  let server;

  afterEach((done) => {
    if (server) {
      server.close(() => {
        server = null;
        done();
      });
      return;
    }
    done();
  });

  test("returns 200 for a valid scenario", async () => {
    server = createServer(0, {
      runScenarioFn: async (scenarioName) => ({
        ok: true,
        adapterMode: "server-api-real-engine",
        scenario: { name: scenarioName, description: "stub for test" },
        initialState: { turn: 1 },
        p1Selection: [],
        p2Selection: [],
        finalState: { turn: 2 },
        log: ["ran scenario"],
        error: null,
      }),
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const response = await makeRequest(
      server,
      "POST",
      "/api/run-scenario",
      JSON.stringify({ scenarioName: "move-vs-defense" })
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.adapterMode).toBe("server-api-real-engine");
    expect(response.body.scenario.name).toBe("move-vs-defense");
  });

  test("returns 404 for an unknown scenario", async () => {
    server = createServer(0, {
      runScenarioFn: async (scenarioName) => {
        const error = new Error(`unknown scenario: ${scenarioName}`);
        error.code = "SCENARIO_NOT_FOUND";
        throw error;
      },
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const response = await makeRequest(
      server,
      "POST",
      "/api/run-scenario",
      JSON.stringify({ scenarioName: "unknown-scenario" })
    );

    expect(response.statusCode).toBe(404);
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toMatch(/unknown scenario/i);
  });

  test("returns 400 for an invalid body", async () => {
    server = createServer(0, {
      runScenarioFn: async () => ({ ok: true }),
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const response = await makeRequest(
      server,
      "POST",
      "/api/run-scenario",
      JSON.stringify({ badKey: true })
    );

    expect(response.statusCode).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toMatch(/scenarioName/i);
  });

  test("returns 500 when scenario runner throws", async () => {
    server = createServer(0, {
      runScenarioFn: async () => {
        throw new Error("test-error in POST /api/run-scenario");
      },
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const response = await makeRequest(
      server,
      "POST",
      "/api/run-scenario",
      JSON.stringify({ scenarioName: "move-vs-defense" })
    );

    expect(response.statusCode).toBe(500);
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toMatch(/test-error/i);
    expect(response.body.error).toMatch(/run-scenario/i);
    expect(response.body.error).not.toBe("");
  });
});
