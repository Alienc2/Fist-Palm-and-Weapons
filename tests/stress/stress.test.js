// tests/stress/stress.test.js
// Phase J-01：壓力測試
// 驗證系統在並發對戰、長時間回合、大量 socket client 下穩定運行。
// 規模採保守設定（CI 友善，目標 1–2 分鐘內完成）：
//   - 並發 AI 對戰：20 場
//   - 長時間對戰：100 回合
//   - socket client：20 個

const http = require("node:http");
const { io: Client } = require("socket.io-client");
const { runAiMatch } = require("../../server/game/ai/aiMatch");
const { createSocketServer } = require("../../server/network/socketServer");

// 建立測試 server（隨機 port）
function createTestServer() {
  const httpServer = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  });

  const socketServer = createSocketServer(httpServer, {
    matchmakingTimeoutMs: 500,
  });

  return new Promise((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => {
      const port = httpServer.address().port;
      resolve({ httpServer, socketServer, port });
    });
  });
}

// 建立測試 client
function createClient(port, name) {
  const client = Client(`http://127.0.0.1:${port}`, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });

  function emit(event, payload) {
    return new Promise((resolve) => {
      client.emit(event, payload, (response) => resolve(response));
    });
  }

  return { client, emit, name };
}

// 等待事件（可選 predicate 過濾）
function waitForEvent(client, event, predicate = null, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off(event, handler);
      reject(new Error(`timeout waiting for ${event}`));
    }, timeoutMs);

    function handler(data) {
      if (predicate && !predicate(data)) return;
      clearTimeout(timer);
      resolve(data);
    }

    client.on(event, handler);
  });
}

describe("壓力測試 - 並發 AI 對戰", () => {
  test("20 場 AI 對戰並發執行，全部能完成且無例外", () => {
    const matches = Array.from({ length: 20 }, (_, i) => {
      return runAiMatch({
        players: [
          { id: `P1_${i}`, position: { x: 1, y: 1 }, characterId: "char_attack", aiProfileId: "ai_normal" },
          { id: `P2_${i}`, position: { x: 3, y: 3 }, characterId: "char_defense", aiProfileId: "ai_normal" },
        ],
        maxRounds: 10,
        rng: () => 0.5,
        maxCards: 1,
      });
    });

    expect(matches.length).toBe(20);
    for (const result of matches) {
      expect(result.state).toBeTruthy();
      expect(result.rounds).toBeGreaterThanOrEqual(1);
      expect(result.rounds).toBeLessThanOrEqual(10);
      // 勝負：要嘛有 winner，要嘛達到最大回合
      if (result.winner) {
        expect(result.winner).toMatch(/^P[12]_/);
      }
    }
  });
});

describe("壓力測試 - 長時間對戰", () => {
  test("單場 100 回合對戰能穩定推進", () => {
    const result = runAiMatch({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack", aiProfileId: "ai_normal" },
        { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense", aiProfileId: "ai_normal" },
      ],
      maxRounds: 100,
      rng: () => 0.5,
      maxCards: 1,
    });

    expect(result.state).toBeTruthy();
    expect(result.rounds).toBeGreaterThanOrEqual(1);
    expect(result.rounds).toBeLessThanOrEqual(100);
    expect(result.roundLog.length).toBe(result.rounds);

    // 每回合狀態都有效
    for (const round of result.roundLog) {
      for (const p of round.players) {
        expect(p.hp).toBeGreaterThanOrEqual(0);
        expect(p.mp).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("壓力測試 - 大量 socket client", () => {
  let server;
  let port;

  beforeAll(async () => {
    const result = await createTestServer();
    server = result;
    port = result.port;
  });

  afterAll(() => {
    server.httpServer.close();
  });

  test("20 個 client 並發連線並建立/加入房間", async () => {
    const clients = Array.from({ length: 20 }, (_, i) => createClient(port, `C${i}`));

    // 全部連線
    await Promise.all(
      clients.map((c) => new Promise((resolve) => c.client.on("connect", resolve)))
    );

    try {
      // 房主建立 4P 房間
      const host = clients[0];
      const createResult = await host.emit("room:create", {
        name: host.name,
        maxPlayers: 4,
        mode: "4p",
      });
      expect(createResult.ok).toBe(true);
      const roomId = createResult.room.id;

      // 其餘 3 位加入（湊滿 4P）
      const joinResults = await Promise.all(
        clients.slice(1, 4).map((c) => c.emit("room:join", { roomId, name: c.name }))
      );
      for (const r of joinResults) {
        expect(r.ok).toBe(true);
      }

      // 其餘 client 各自建立自己的房間
      const createOthers = await Promise.all(
        clients.slice(4).map((c) => c.emit("room:create", { name: c.name, maxPlayers: 2, mode: "2p" }))
      );
      for (const r of createOthers) {
        expect(r.ok).toBe(true);
      }
    } finally {
      clients.forEach((c) => c.client.close());
    }
  });

  test("20 個 client 並發配對，能正確配對成對", async () => {
    const clients = Array.from({ length: 20 }, (_, i) => createClient(port, `M${i}`));

    await Promise.all(
      clients.map((c) => new Promise((resolve) => c.client.on("connect", resolve)))
    );

    try {
      // 監聽所有 client 的 match:found
      const foundPromises = clients.map((c) =>
        waitForEvent(c.client, "match:found").catch(() => null)
      );

      // 全部同時加入 2p 配對佇列
      await Promise.all(
        clients.map((c) => c.emit("matchmaking:enqueue", { name: c.name, mode: "2p" }))
      );

      // 等待配對結果（20 人 → 10 對）
      const found = await Promise.all(foundPromises);
      const matchedCount = found.filter((f) => f && f.roomId).length;
      expect(matchedCount).toBe(20);
    } finally {
      clients.forEach((c) => c.client.close());
    }
  });
});
