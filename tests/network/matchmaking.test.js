// tests/network/matchmaking.test.js
// Phase E-03：Matchmaking 配對系統 單元測試

const { createMatchmaking, getRequiredPlayers } = require("../../server/rooms/matchmaking");

describe("matchmaking - getRequiredPlayers", () => {
  test("2p / 3p / 4p 模式所需人數", () => {
    expect(getRequiredPlayers("2p")).toBe(2);
    expect(getRequiredPlayers("3p")).toBe(3);
    expect(getRequiredPlayers("4p")).toBe(4);
    expect(getRequiredPlayers("unknown")).toBe(2);
  });
});

describe("matchmaking - enqueue / dequeue", () => {
  test("玩家加入佇列", () => {
    const mm = createMatchmaking({ timeoutMs: 1000 });
    const result = mm.enqueue("sock-1", { name: "Alice", mode: "2p" });

    expect(result.ok).toBe(true);
    expect(result.requiredPlayers).toBe(2);
    expect(result.position).toBe(1);
    expect(mm.getQueueSize()).toBe(1);
  });

  test("重複加入拒絕", () => {
    const mm = createMatchmaking({ timeoutMs: 1000 });
    mm.enqueue("sock-1", { mode: "2p" });
    const result = mm.enqueue("sock-1", { mode: "2p" });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("ALREADY_IN_QUEUE");
  });

  test("玩家離開佇列", () => {
    const mm = createMatchmaking({ timeoutMs: 1000 });
    mm.enqueue("sock-1", { mode: "2p" });
    const result = mm.dequeue("sock-1");

    expect(result.ok).toBe(true);
    expect(mm.getQueueSize()).toBe(0);
  });

  test("離開不在佇列的玩家失敗", () => {
    const mm = createMatchmaking({ timeoutMs: 1000 });
    const result = mm.dequeue("sock-99");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("NOT_IN_QUEUE");
  });
});

describe("matchmaking - tryMatch", () => {
  test("2 人配對成功", () => {
    const matchedRooms = [];
    const mm = createMatchmaking({
      timeoutMs: 1000,
      onMatchFound: (room, players) => matchedRooms.push({ room, players }),
    });

    mm.enqueue("sock-1", { name: "Alice", mode: "2p" });
    const result = mm.enqueue("sock-2", { name: "Bob", mode: "2p" });

    // 第二位加入時觸發配對
    expect(result.matched).toBeTruthy();
    expect(matchedRooms).toHaveLength(1);
    expect(matchedRooms[0].room.players).toHaveLength(2);
    expect(matchedRooms[0].room.hostId).toBe("sock-1");
    expect(mm.getQueueSize()).toBe(0);
  });

  test("3 人配對成功", () => {
    const matchedRooms = [];
    const mm = createMatchmaking({
      timeoutMs: 1000,
      onMatchFound: (room, players) => matchedRooms.push({ room, players }),
    });

    mm.enqueue("sock-1", { name: "A", mode: "3p" });
    mm.enqueue("sock-2", { name: "B", mode: "3p" });
    const result = mm.enqueue("sock-3", { name: "C", mode: "3p" });

    expect(result.matched).toBeTruthy();
    expect(matchedRooms[0].room.players).toHaveLength(3);
    expect(mm.getQueueSize()).toBe(0);
  });

  test("4 人配對成功", () => {
    const matchedRooms = [];
    const mm = createMatchmaking({
      timeoutMs: 1000,
      onMatchFound: (room, players) => matchedRooms.push({ room, players }),
    });

    mm.enqueue("sock-1", { name: "A", mode: "4p" });
    mm.enqueue("sock-2", { name: "B", mode: "4p" });
    mm.enqueue("sock-3", { name: "C", mode: "4p" });
    const result = mm.enqueue("sock-4", { name: "D", mode: "4p" });

    expect(result.matched).toBeTruthy();
    expect(matchedRooms[0].room.players).toHaveLength(4);
    expect(mm.getQueueSize()).toBe(0);
  });

  test("人數不足不配對", () => {
    const matchedRooms = [];
    const mm = createMatchmaking({
      timeoutMs: 1000,
      onMatchFound: (room, players) => matchedRooms.push({ room, players }),
    });

    const result = mm.enqueue("sock-1", { name: "A", mode: "2p" });

    expect(result.matched).toBeNull();
    expect(matchedRooms).toHaveLength(0);
    expect(mm.getQueueSize()).toBe(1);
  });

  test("不同模式不互相配對", () => {
    const matchedRooms = [];
    const mm = createMatchmaking({
      timeoutMs: 1000,
      onMatchFound: (room, players) => matchedRooms.push({ room, players }),
    });

    mm.enqueue("sock-1", { name: "A", mode: "2p" });
    const result = mm.enqueue("sock-2", { name: "B", mode: "3p" });

    expect(result.matched).toBeNull();
    expect(matchedRooms).toHaveLength(0);
    expect(mm.getQueueSize()).toBe(2);
  });
});

describe("matchmaking - timeout", () => {
  test("等待超時觸發 onTimeout", (done) => {
    const timedOut = [];
    const mm = createMatchmaking({
      timeoutMs: 50,
      onTimeout: (entry) => timedOut.push(entry),
    });

    mm.enqueue("sock-1", { name: "A", mode: "2p" });

    setTimeout(() => {
      expect(timedOut).toHaveLength(1);
      expect(timedOut[0].socketId).toBe("sock-1");
      expect(mm.getQueueSize()).toBe(0);
      done();
    }, 100);
  });
});

describe("matchmaking - queue status", () => {
  test("取得佇列狀態", () => {
    const mm = createMatchmaking({ timeoutMs: 1000 });
    // 使用不同模式避免自動配對
    mm.enqueue("sock-1", { name: "Alice", mode: "2p" });
    mm.enqueue("sock-2", { name: "Bob", mode: "3p" });

    const status = mm.getQueueStatus();
    expect(status).toHaveLength(2);
    expect(status[0].name).toBe("Alice");
    expect(status[1].name).toBe("Bob");
  });

  test("取得佇列位置", () => {
    const mm = createMatchmaking({ timeoutMs: 1000 });
    // 使用不同模式避免自動配對
    mm.enqueue("sock-1", { mode: "2p" });
    mm.enqueue("sock-2", { mode: "3p" });

    expect(mm.getQueuePosition("sock-1")).toBe(1);
    expect(mm.getQueuePosition("sock-2")).toBe(2);
    expect(mm.getQueuePosition("sock-99")).toBe(-1);
  });
});


