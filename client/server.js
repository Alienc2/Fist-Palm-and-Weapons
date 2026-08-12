// client/server.js
// Phase E 正式 UI 的開發伺服器。
// 提供：
//   1. 靜態檔案服務（client/ 目錄）
//   2. 遊戲 API（browser → API → server → real engine）
// 沿用專案既有架構：browser 不直接 import CommonJS engine，一律經 API 呼叫。

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const gameEngine = require("../server/game/gameEngine");
const { autoSelectAiPlayers } = require("../server/game/ai/aiMatch");
const { createSocketServer } = require("../server/network/socketServer");



const ROOT_DIR = path.resolve(__dirname);
const PORT_START = Number(process.env.PORT || 4000);

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

// 序列化玩家狀態（供 UI 使用，避免把內部函式/循環引用送出）
function serializePlayer(player) {
  return {
    id: player.id,
    characterId: player.characterId,
    characterName: player.characterName,
    role: player.role,
    tokenColor: player.tokenColor,
    passiveId: player.passiveId,
    passiveParams: player.passiveParams,
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp,
    maxMp: player.maxMp,
    hand: (player.hand || []).map(serializeCard),
    deckCount: Array.isArray(player.deck) ? player.deck.length : 0,
    discardCount: Array.isArray(player.discard) ? player.discard.length : 0,
    position: player.position,
    facing: player.facing,
    selectedCards: (player.selectedCards || []).map((item) => ({
      card: serializeCard(item.card),
      extra: item.extra || {},
    })),
    lastDefenseCard: player.lastDefenseCard,
    lastRevealedSubtype: player.lastRevealedSubtype || null,
    guardSubtype: player.guardSubtype || null,
    isEliminated: !!player.isEliminated,
    isAi: !!player.isAi,
    handLimit: player.handLimit || 8,
  };
}


function serializeCard(card) {
  if (!card) return null;
  // cardLoader.normalizeCard 已將欄位轉為 camelCase（name / mpCost / rangeMin / moveMin 等），
  // 同時保留 snake_case 欄位（name_zh / alias_group / description_template / move_min 等），
  // 確保前端 normalizeClientCard 一定讀到完整資料。
  const name = card.name || card.name_zh;
  const aliasGroup = card.aliasGroup || card.alias_group;
  const description = card.description || card.description_template;
  const mpCost = card.mpCost ?? card.mp_cost;
  const buyCost = card.buyCost ?? card.buy_cost;
  const rangeMin = card.rangeMin ?? card.range_min;
  const rangeMax = card.rangeMax ?? card.range_max;
  const moveMin = card.moveMin ?? card.move_min;
  const moveMax = card.moveMax ?? card.move_max;
  const blockValue = card.blockValue ?? card.block_value;
  const hpGain = card.hpGain ?? card.hp_gain;
  const mpGain = card.mpGain ?? card.mp_gain;
  const drawCount = card.drawCount ?? card.draw_count;
  const persistUntilTriggered = card.persistUntilTriggered ?? card.persist_until_triggered;
  const targetRule = card.targetRule || card.target_rule;

  return {
    id: card.id,
    instanceId: card.instanceId,
    definitionId: card.definitionId,
    // camelCase（前端 normalizeClientCard 主要讀呢套）
    name,
    aliasGroup,
    description,
    mpCost,
    buyCost,
    rangeMin,
    rangeMax,
    damage: card.damage,
    blockValue,
    hpGain,
    mpGain,
    drawCount,
    moveMin,
    moveMax,
    stock: card.stock,
    persistUntilTriggered,
    keywords: card.keywords,
    targeting: card.targeting,
    // snake_case（向後兼容）
    name_zh: name,
    alias_group: aliasGroup,
    group: card.group,
    type: card.type,
    subtype: card.subtype,
    mp_cost: mpCost,
    buy_cost: buyCost,
    range_min: rangeMin,
    range_max: rangeMax,
    block_value: blockValue,
    hp_gain: hpGain,
    mp_gain: mpGain,
    draw_count: drawCount,
    move_min: moveMin,
    move_max: moveMax,
    persist_until_triggered: persistUntilTriggered,
    target_rule: targetRule,
    description_template: description,
    enabled: card.enabled,
  };
}


function serializeShop(state) {
  return {
    cards: (state.shop?.cards || []).map((card) => ({
      ...serializeCard(card),
      stock: card.stock,
    })),
    stockByCardId: state.shop?.stockByCardId || {},
  };
}

function serializeState(state) {
  return {
    matchId: state.matchId,
    phase: state.phase,
    round: state.round,
    turn: state.turn,
    revealIndex: state.revealIndex,
    startingPlayerIndex: state.startingPlayerIndex,
    activePlayerIndex: state.activePlayerIndex,
    turnOrder: state.turnOrder,
    aiPlayerIds: state.aiPlayerIds || [],
    players: (state.players || []).map(serializePlayer),

    shop: serializeShop(state),
    stackCount: Array.isArray(state.stack) ? state.stack.length : 0,
    eliminatedPlayers: state.eliminatedPlayers || [],
    log: Array.isArray(state.log) ? [...state.log] : [],
  };
}

// 建立一局新對戰（可指定玩家角色，含 AI 玩家）
function createMatch(payload = {}) {
  const players = payload.players || [
    { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
    { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense" },
  ];

  // 標記 AI 玩家（有 aiProfileId 即為 AI 控制）
  const aiPlayerIds = players
    .filter((p) => p.aiProfileId !== undefined && p.aiProfileId !== null)
    .map((p) => p.id);

  const state = gameEngine.createMatch({ players });

  // 在玩家物件上標記 isAi，供 UI 判斷人類 / AI
  for (const p of state.players) {
    p.isAi = aiPlayerIds.includes(p.id);
  }

  state.aiPlayerIds = aiPlayerIds;
  return state;
}



function readJsonBody(req, callback) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    try {
      callback(JSON.parse(body || "{}"));
    } catch (error) {
      callback({});
    }
  });
}

function resolveStaticPath(urlPath) {
  const normalized = decodeURIComponent(urlPath.split("?")[0]);

  if (normalized === "/" || normalized === "/index.html") {
    return path.join(ROOT_DIR, "index.html");
  }

  // 只允許 client/ 內檔案
  const filePath = path.join(ROOT_DIR, normalized.slice(1));
  if (!filePath.startsWith(ROOT_DIR)) {
    return null;
  }
  return filePath;
}

function serveFile(res, filePath) {
  if (!filePath || !filePath.startsWith(ROOT_DIR)) {
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

function createRequestHandler(options = {}) {
  const { port = PORT_START } = options;
  // 每局狀態保存在 server 記憶體（單一對戰）
  let matchState = null;

  return async function handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    // ---- 遊戲 API ----

    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true, service: "fpw-client-server", port });
      return;
    }

    if (req.method === "GET" && pathname === "/api/state") {
      if (!matchState) {
        sendJson(res, 200, { ok: true, state: null });
        return;
      }
      sendJson(res, 200, { ok: true, state: serializeState(matchState) });
      return;
    }

    if (req.method === "POST" && pathname === "/api/match") {
      readJsonBody(req, (payload) => {
        try {
          matchState = createMatch(payload);
          sendJson(res, 200, { ok: true, state: serializeState(matchState) });
        } catch (error) {
          sendJson(res, 500, {
            ok: false,
            error: error && error.message ? error.message : "create match failed",
          });
        }
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/select") {
      if (!matchState) {
        sendJson(res, 400, { ok: false, error: "no active match" });
        return;
      }
      readJsonBody(req, (payload) => {
        try {
          const playerId = payload.playerId;
          const selections = payload.selections || [];
          gameEngine.submitSelection(matchState, playerId, selections);
          sendJson(res, 200, { ok: true, state: serializeState(matchState) });
        } catch (error) {
          sendJson(res, 500, {
            ok: false,
            error: error && error.message ? error.message : "select failed",
          });
        }
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/facing") {
      if (!matchState) {
        sendJson(res, 400, { ok: false, error: "no active match" });
        return;
      }
      readJsonBody(req, (payload) => {
        try {
          const result = gameEngine.setFacing(
            matchState,
            payload.playerId,
            payload.facing
          );
          sendJson(res, 200, {
            ok: result.ok !== false,
            reason: result.reason || null,
            state: serializeState(matchState),
          });
        } catch (error) {
          sendJson(res, 500, {
            ok: false,
            error: error && error.message ? error.message : "set facing failed",
          });
        }
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/discard") {
      if (!matchState) {
        sendJson(res, 400, { ok: false, error: "no active match" });
        return;
      }
      readJsonBody(req, (payload) => {
        try {
          const result = gameEngine.setPendingDiscards(
            matchState,
            payload.playerId,
            payload.discards || []
          );
          sendJson(res, 200, {
            ok: result.ok !== false,
            reason: result.reason || null,
            state: serializeState(matchState),
          });
        } catch (error) {
          sendJson(res, 500, {
            ok: false,
            error: error && error.message ? error.message : "set pending discards failed",
          });
        }
      });
      return;
    }


    if (req.method === "POST" && pathname === "/api/play") {
      if (!matchState) {
        sendJson(res, 400, { ok: false, error: "no active match" });
        return;
      }
      try {
        // 先為 AI 玩家自動填選牌，再結算回合
        const aiPlayerIds = matchState.aiPlayerIds || [];
        if (aiPlayerIds.length > 0) {
          autoSelectAiPlayers(matchState, { aiPlayerIds });
        }
        gameEngine.playOneTurn(matchState);
        sendJson(res, 200, {
          ok: true,
          state: serializeState(matchState),
          events: gameEngine.takeEvents(matchState),
        });
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: error && error.message ? error.message : "play turn failed",
        });
      }
      return;
    }


    if (req.method === "POST" && pathname === "/api/reset") {
      matchState = null;
      sendJson(res, 200, { ok: true });
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

    // T4：對戰紀錄需要 combo_name，提供專案根目錄 generated/combos.json
    if (req.method === "GET" && pathname === "/generated/combos.json") {
      const combosPath = path.join(__dirname, "..", "generated", "combos.json");
      if (!fs.existsSync(combosPath)) {
        sendJson(res, 404, { ok: false, error: "combos.json not found" });
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json; charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
      });
      fs.createReadStream(combosPath).pipe(res);
      return;
    }

    // ---- 靜態檔案 ----
    const filePath = resolveStaticPath(pathname);
    serveFile(res, filePath);
  };
}

function createServer(port, options = {}) {
  const handler = createRequestHandler({ ...options, port });
  const server = http.createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error("[client-server] request error:", error);
      sendJson(res, 500, { ok: false, error: "internal server error" });
    });
  });

  // 附加 Socket.IO 多人對戰 server（Phase E）
  const socketServer = createSocketServer(server, {
    matchmakingTimeoutMs: options.matchmakingTimeoutMs,
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.log(`[client-server] port ${port} in use, trying ${port + 1}`);
      createServer(port + 1, options);
      return;
    }
    console.error("[client-server] server error:", error);
    process.exit(1);
  });

  server.socketServer = socketServer;
  return server;
}

function startServer(port = PORT_START, options = {}) {
  const server = createServer(port, options);
  server.listen(port, "127.0.0.1", () => {
    console.log(`[client-server] listening on http://localhost:${port}`);
    console.log(`[client-server] open http://localhost:${port}/`);
    console.log(`[client-server] Socket.IO multiplayer server attached`);
  });
  return server;
}


if (require.main === module) {
  startServer(PORT_START);
}

module.exports = {
  ROOT_DIR,
  PORT_START,
  createRequestHandler,
  createServer,
  startServer,
  resolveStaticPath,
  sendJson,
};
