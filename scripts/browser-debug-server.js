const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PORT_START = Number(process.env.PORT || 3001);

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
  const scenariosPath = path.join(ROOT_DIR, "debug", "scenarios.js");
  const source = fs.readFileSync(scenariosPath, "utf8");
  const names = [];
  const regex = /"([^"]+)":\s*{/g;
  let match;
  while ((match = regex.exec(source))) {
    names.push(match[1]);
  }
  return names;
}

function resolveStaticPath(urlPath) {
  const normalized = decodeURIComponent(urlPath.split("?")[0]);
  if (normalized === "/") {
    return path.join(ROOT_DIR, "debug", "browser-sandbox.html");
  }
  if (normalized.startsWith("/debug/")) {
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
  const server = http.createServer((req, res) => {
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
    console.log(`[debug-server] open http://localhost:${port}/server/game/debug/browser-sandbox.html`);
  });
}

createServer(PORT_START);