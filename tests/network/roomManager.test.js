// tests/network/roomManager.test.js
// Phase E-01：Socket.IO 房間系統 單元測試

const {
  createRoom,
  joinRoom,
  leaveRoom,
  setCharacter,
  setReady,
  isAllReady,
  getPublicRoom,
  createRoomManager,
} = require("../../server/network/roomManager");

describe("roomManager - createRoom", () => {
  test("建立房間，房主自動加入", () => {
    const room = createRoom({
      hostId: "sock-1",
      hostName: "Alice",
      maxPlayers: 2,
    });

    expect(room.id).toBeTruthy();
    expect(room.hostId).toBe("sock-1");
    expect(room.maxPlayers).toBe(2);
    expect(room.status).toBe("waiting");
    expect(room.players).toHaveLength(1);
    expect(room.players[0].socketId).toBe("sock-1");
    expect(room.players[0].name).toBe("Alice");
  });

  test("預設 maxPlayers 為 2", () => {
    const room = createRoom({ hostId: "sock-1" });
    expect(room.maxPlayers).toBe(2);
    expect(room.mode).toBe("2p");
  });

  test("支援 3p / 4p 模式", () => {
    const room3 = createRoom({ hostId: "s", maxPlayers: 3 });
    expect(room3.mode).toBe("3p");
    const room4 = createRoom({ hostId: "s", maxPlayers: 4 });
    expect(room4.mode).toBe("4p");
  });
});

describe("roomManager - joinRoom", () => {
  test("玩家加入房間", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    const result = joinRoom(room, "sock-2", { name: "Bob" });

    expect(result.ok).toBe(true);
    expect(room.players).toHaveLength(2);
    expect(room.players[1].name).toBe("Bob");
  });

  test("房間滿了拒絕加入", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    joinRoom(room, "sock-2");
    const result = joinRoom(room, "sock-3");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("ROOM_FULL");
  });

  test("重複加入拒絕", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    const result = joinRoom(room, "sock-1");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("ALREADY_IN_ROOM");
  });

  test("對戰進行中拒絕加入", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    room.status = "playing";
    const result = joinRoom(room, "sock-2");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("ROOM_NOT_ACCEPTING");
  });
});

describe("roomManager - leaveRoom", () => {
  test("玩家離開房間", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    joinRoom(room, "sock-2");
    const result = leaveRoom(room, "sock-2");

    expect(result.ok).toBe(true);
    expect(room.players).toHaveLength(1);
  });

  test("房主離開後轉移房主", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    joinRoom(room, "sock-2");
    const result = leaveRoom(room, "sock-1");

    expect(result.ok).toBe(true);
    expect(result.hostChanged).toBe(true);
    expect(room.hostId).toBe("sock-2");
  });

  test("最後一位玩家離開後房主為 null", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    const result = leaveRoom(room, "sock-1");

    expect(result.ok).toBe(true);
    expect(room.hostId).toBe(null);
    expect(room.players).toHaveLength(0);
  });

  test("不在房間的玩家離開失敗", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    const result = leaveRoom(room, "sock-99");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("NOT_IN_ROOM");
  });
});

describe("roomManager - setCharacter / setReady / isAllReady", () => {
  test("設定角色", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    const result = setCharacter(room, "sock-1", "char_attack");

    expect(result.ok).toBe(true);
    expect(room.players[0].characterId).toBe("char_attack");
  });

  test("設定準備狀態", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    setReady(room, "sock-1", true);

    expect(room.players[0].ready).toBe(true);
  });

  test("所有玩家準備且選好角色才 isAllReady", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    joinRoom(room, "sock-2");

    // 未準備
    expect(isAllReady(room)).toBe(false);

    // 房主準備但未選角色
    setReady(room, "sock-1", true);
    expect(isAllReady(room)).toBe(false);

    // 房主選角色
    setCharacter(room, "sock-1", "char_attack");
    expect(isAllReady(room)).toBe(false);

    // 第二位玩家準備 + 選角色
    setReady(room, "sock-2", true);
    setCharacter(room, "sock-2", "char_defense");
    expect(isAllReady(room)).toBe(true);
  });

  test("少於 2 人永遠不 isAllReady", () => {
    const room = createRoom({ hostId: "sock-1", maxPlayers: 2 });
    setReady(room, "sock-1", true);
    setCharacter(room, "sock-1", "char_attack");

    expect(isAllReady(room)).toBe(false);
  });
});

describe("roomManager - getPublicRoom", () => {
  test("回傳公開狀態，不含內部資訊", () => {
    const room = createRoom({ hostId: "sock-1", hostName: "Alice", maxPlayers: 2 });
    joinRoom(room, "sock-2", { name: "Bob" });

    const pub = getPublicRoom(room);

    expect(pub.id).toBe(room.id);
    expect(pub.hostId).toBe("sock-1");
    expect(pub.playerCount).toBe(2);
    expect(pub.players).toHaveLength(2);
    expect(pub.players[0].name).toBe("Alice");
    expect(pub.players[1].name).toBe("Bob");
  });
});

describe("roomManager - createRoomManager", () => {
  test("建立 / 取得 / 刪除房間", () => {
    const manager = createRoomManager();
    const room = manager.create({ hostId: "sock-1", maxPlayers: 2 });

    expect(manager.get(room.id)).toBe(room);
    expect(manager.remove(room.id)).toBe(true);
    expect(manager.get(room.id)).toBe(null);
  });

  test("依 socketId 找玩家所在房間", () => {
    const manager = createRoomManager();
    const room = manager.create({ hostId: "sock-1", maxPlayers: 2 });
    joinRoom(room, "sock-2");

    expect(manager.findRoomBySocket("sock-2")).toBe(room);
    expect(manager.findRoomBySocket("sock-99")).toBe(null);
  });

  test("列出等待中的房間", () => {
    const manager = createRoomManager();
    const room1 = manager.create({ hostId: "sock-1", maxPlayers: 2 });
    const room2 = manager.create({ hostId: "sock-3", maxPlayers: 2 });
    room2.status = "playing";

    const waiting = manager.listWaiting();
    expect(waiting).toHaveLength(1);
    expect(waiting[0].id).toBe(room1.id);
  });
});
