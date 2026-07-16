const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const gameEngine = require("../gameEngine");
const scenarios = require("./scenario-data.json");
const generatedCards = require("../../../generated/cards.json");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const PORT_START = Number(process.env.PORT || 3001);
const MAX_JSON_BODY_BYTES = 1024 * 16;

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  default: "application/octet-stream",
};

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=UTF-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function getScenarios() {
  return Object.keys(scenarios);
}

function getScenarioByName(scenarioName) {
  return scenarios[scenarioName] || null;
}

function summarizePlayer(player) {
  return {
    id: player.id,
    hp: player.hp,
    mp: player.mp,
    position: player.position,
    handCount: Array.isArray(player.hand) ? player.hand.length : 0,
    deckCount: Array.isArray(player.deck) ? player.deck.length : 0,
    discardCount: Array.isArray(player.discard) ? player.discard.length : 0,
    lastRevealedSubtype: player.lastRevealedSubtype || null,
  };
}

function summarizeShop(state) {
  if (Array.isArray(state.shop)) {
    return state.shop.map((item) => ({
      id: item.id,
      stock: item.stock,
      cost: item.cost,
    }));
  }

  if (Array.isArray(state.shop?.cards)) {
    return state.shop.cards.map((item) => ({
      id: item.id,
      stock: item.stock,
      cost: item.cost ?? item.buyCost ?? item.mpCost ?? 0,
    }));
  }

  return [];
}

function summarizeState(state) {
  return {
    round: state.round ?? null,
    startingPlayerIndex: state.startingPlayerIndex ?? null,
    stackCount: Array.isArray(state.stack) ? state.stack.length : 0,
    players: Array.isArray(state.players) ? state.players.map(summarizePlayer) : [],
    shop: summarizeShop(state),
    log: Array.isArray(state.log) ? [...state.log] : [],
  };
}

function summarizeSelection(selection) {
  return selection.map((item) => ({
    cardId: item.card?.id ?? item.cardId ?? null,
    type: item.card?.type ?? item.type ?? null,
    subtype: item.card?.subtype ?? item.subtype ?? null,
    extra: item.extra ?? {},
  }));
}

function buildCardLookupFromState(state) {
  const lookup = new Map();

  for (const player of state.players ?? []) {
    for (const card of player.hand ?? []) {
      if (card?.id) {
        lookup.set(card.id, card);
      }
    }

    for (const card of player.deck ?? []) {
      if (card?.id && !lookup.has(card.id)) {
        lookup.set(card.id, card);
      }
    }

    for (const card of player.discard ?? []) {
      if (card?.id && !lookup.has(card.id)) {
        lookup.set(card.id, card);
      }
    }
  }

  for (const shopItem of state.shop?.cards ?? state.shop ?? []) {
    if (shopItem?.id && !lookup.has(shopItem.id)) {
      lookup.set(shopItem.id, shopItem);
    }
  }

  for (const card of generatedCards) {
    if (card?.id && !lookup.has(card.id)) {
      lookup.set(card.id, card);
    }
  }

  return lookup;
}

function hydrateSelection(state, scenarioSelection) {
  if (!Array.isArray(scenarioSelection)) {
    throw new Error("Scenario selection must be an array.");
  }

  const lookup = buildCardLookupFromState(state);

  return scenarioSelection.map((item) => {
    const card = lookup.get(item.cardId);

    if (!card) {
      throw new Error(`Card not found in current match state: ${item.cardId}`);
    }

    return {
      card,
      extra: item.extra ?? {},
    };
  });
}

function runScenarioWithRealEngine(scenarioName) {
  const scenario = getScenarioByName(scenarioName);

  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioName}`);
  }

  const state = gameEngine.createMatch();
  const initialState = summarizeState(state);
  const p1Selection = hydrateSelection(state, scenario.p1Selection);
  const p2Selection = hydrateSelection(state, scenario.p2Selection);

  gameEngine.submitSelection(state, "P1", p1Selection);
  gameEngine.submitSelection(state, "P2", p2Selection);
  gameEngine.playOneTurn(state);

  return {
    ok: true,
    adapterMode: "server-api-real-engine",
    scenario: {
      name: scenario.name,
      description: scenario.description,
    },
    initialState,
    p1Selection: summarizeSelection(p1Selection),
    p2Selection: summarizeSelection(p2Selection),
    finalState: summarizeState(state),
    log: Array.isArray(state.log) ? [...state.log] : [],
    error: null,
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let byteLength = 0;
    let isTooLarge = false;

    req.on("data", (chunk) => {
      byteLength += chunk.length;

      if (byteLength > MAX_JSON_BODY_BYTES) {
        isTooLarge = true;
        return;
      }

      body += chunk;
    });

    req.on("end", () => {
      if (isTooLarge) {
        reject(Object.assign(new Error("Request body too large."), { statusCode: 413 }));
        return;
      }

      try {
        const parsed = JSON.parse(body || "{}");

        if (
          !parsed ||
          typeof parsed !== "object" ||
          Array.isArray(parsed) ||
          typeof parsed.scenarioName !== "string" ||
          parsed.scenarioName.trim() === ""
        ) {
          reject(
            Object.assign(
              new Error('Request body must be JSON like { "scenarioName": "move-vs-defense" }.'),
              { statusCode: 400 }
            )
          );
          return;
        }

        resolve({ scenarioName: parsed.scenarioName.trim() });
      } catch (error) {
        reject(Object.assign(new Error("Request body must be valid JSON."), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function resolveStaticPath(urlPath) {
  const normalized = decodeURIComponent(urlPath.split("?")[0]);

  if (
    normalized === "/" ||
    normalized === "/server/game/debug" ||
    normalized === "/server/game/debug/"
  ) {
    return path.join(
      ROOT_DIR,
      "server",
      "game",
      "debug",
      "browser-sandbox.html"
    );
  }

  if (normalized.startsWith("/server/game/debug/")) {
    return path.join(ROOT_DIR, normalized.slice(1));
  }

  if (normalized.startsWith("/scripts/")) {
    return path.join(ROOT_DIR, normalized.slice(1));
  }

  return path.join(ROOT_DIR, normalized.slice(1));
}

function serveFile(res, filePath) {
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || MIME_TYPES.default;

  res.writeHead(200, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
  });

  fs.createReadStream(filePath).pipe(res);
}

function createServer(port) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    console.log(`${req.method} ${pathname}`);

    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        service: "browser-debug-server",
        port,
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/scenarios") {
      sendJson(res, 200, {
        ok: true,
        scenarios: getScenarios(),
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/run-scenario") {
      try {
        const body = await readJsonBody(req);

        if (!getScenarioByName(body.scenarioName)) {
          sendJson(res, 404, {
            ok: false,
            error: `Unknown scenario: ${body.scenarioName}`,
          });
          return;
        }

        const result = runScenarioWithRealEngine(body.scenarioName);
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, error.statusCode || 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    const filePath = resolveStaticPath(pathname);
    console.log("[debug-server] static filePath =", filePath);
    serveFile(res, filePath);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.log(`[debug-server] port ${port} in use, trying ${port + 1}`);
      createServer(port + 1);
      return;
    }
    console.error("[debug-server] server error:", error);
    process.exit(1);
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`[debug-server] listening on http://localhost:${port}`);
    console.log(
      `[debug-server] open http://localhost:${port}/server/game/debug/browser-sandbox.html`
    );
  });
}

createServer(PORT_START);
