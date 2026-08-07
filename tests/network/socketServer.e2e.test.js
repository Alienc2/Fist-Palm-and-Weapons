// tests/network/socketServer.e2e.test.js
// Phase E：Socket.IO 多人對戰 E2E 測試
// 測試完整流程：建立房間 → 加入 → 選角色 → 準備 → 開始對戰 → 同步選牌 → 回合解析

const http = require("node:http");
const { io: Client } = require("socket.io-client");
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

  // 包裝 emit 成 Promise（支援 ack）
  function emit(event, payload) {
    return new Promise((resolve) => {
      client.emit(event, payload, (response) => resolve(response));
    });
  }

  return { client, emit, name };
}

// 等待事件（可選 predicate 過濾）
function waitForEvent(client, event, predicate = null, timeoutMs = 2000) {
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


describe("socketServer - 多人對戰 E2E", () => {
  let server;
  let port;
  let alice;
  let bob;

  beforeAll(async () => {
    const result = await createTestServer();
    server = result;
    port = result.port;
  });

  afterAll(() => {
    if (alice) alice.client.close();
    if (bob) bob.client.close();
    server.httpServer.close();
  });

  test("完整流程：建立房間 → 加入 → 準備 → 開始 → 選牌 → 回合", async () => {
    alice = createClient(port, "Alice");
    bob = createClient(port, "Bob");

    await Promise.all([
      new Promise((resolve) => alice.client.on("connect", resolve)),
      new Promise((resolve) => bob.client.on("connect", resolve)),
    ]);

    // 1. Alice 建立房間
    const createResult = await alice.emit("room:create", {
      name: "Alice",
      maxPlayers: 2,
      mode: "2p",
    });
    expect(createResult.ok).toBe(true);
    const roomId = createResult.room.id;

    // 2. Bob 加入房間
    const joinResult = await bob.emit("room:join", {
      roomId,
      name: "Bob",
    });
    expect(joinResult.ok).toBe(true);
    expect(joinResult.room.playerCount).toBe(2);

    // 3. 設定角色
    await alice.emit("room:setCharacter", { characterId: "char_attack" });
    await bob.emit("room:setCharacter", { characterId: "char_defense" });

    // 4. 設定準備
    await alice.emit("room:setReady", { ready: true });
    await bob.emit("room:setReady", { ready: true });

    // 5. 開始對戰（Alice 是房主）
    // 先設定 match:start 監聽器（事件在 ack 前同步觸發）
    const matchStartPromise = waitForEvent(alice.client, "match:start");
    const startResult = await alice.emit("room:start");
    expect(startResult.ok).toBe(true);
    expect(startResult.matchId).toBeTruthy();

    // 6. 等待 match:start 事件
    const matchStart = await matchStartPromise;
    expect(matchStart.matchId).toBeTruthy();
    expect(matchStart.state.players).toHaveLength(2);


    // 7. 同步選牌：Alice 選攻擊牌
    const alicePlayer = matchStart.state.players.find((p) => p.id === alice.client.id);
    const attackCard = alicePlayer.hand.find((c) => c.type === "attack");
    const selectResult = await alice.emit("match:select", {
      selections: [{ card: attackCard, extra: {} }],
    });
    expect(selectResult.ok).toBe(true);
    expect(selectResult.allSubmitted).toBe(false);

    // 8. Bob 選防禦牌（最後一位，觸發回合解析）
    // 先設定 match:state 監聽器，過濾出回合解析後的狀態（round >= 2）
    // 注意：Bob 的 submitSelection 會先廣播 round=1 的狀態，resolveTurn 才廣播 round=2
    const stateUpdatePromise = waitForEvent(
      alice.client,
      "match:state",
      (data) => data.round >= 2
    );
    const bobPlayer = matchStart.state.players.find((p) => p.id === bob.client.id);
    const defenseCard = bobPlayer.hand.find((c) => c.type === "defense");
    const bobSelectResult = await bob.emit("match:select", {
      selections: [{ card: defenseCard, extra: {} }],
    });
    expect(bobSelectResult.ok).toBe(true);
    expect(bobSelectResult.allSubmitted).toBe(true);

    // 9. 等待 match:state 廣播（回合已解析）
    const stateUpdate = await stateUpdatePromise;
    expect(stateUpdate.round).toBeGreaterThanOrEqual(2);


  });

  test("配對系統：2 人配對成功", async () => {
    const c1 = createClient(port, "P1");
    const c2 = createClient(port, "P2");

    await Promise.all([
      new Promise((resolve) => c1.client.on("connect", resolve)),
      new Promise((resolve) => c2.client.on("connect", resolve)),
    ]);

    // 監聽 match:found
    const foundPromise = waitForEvent(c1.client, "match:found");

    await c1.emit("matchmaking:enqueue", { name: "P1", mode: "2p" });
    const result = await c2.emit("matchmaking:enqueue", { name: "P2", mode: "2p" });

    expect(result.ok).toBe(true);
    expect(result.matched).toBeTruthy();

    const found = await foundPromise;
    expect(found.roomId).toBeTruthy();

    c1.client.close();
    c2.client.close();
  });

  test("配對系統：人數不足不配對", async () => {
    const c1 = createClient(port, "Solo");

    await new Promise((resolve) => c1.client.on("connect", resolve));

    const result = await c1.emit("matchmaking:enqueue", { name: "Solo", mode: "2p" });
    expect(result.ok).toBe(true);
    expect(result.matched).toBeNull();

    // 清理
    await c1.emit("matchmaking:dequeue");
    c1.client.close();
  });
});
