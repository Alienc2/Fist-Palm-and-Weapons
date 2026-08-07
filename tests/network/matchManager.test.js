// tests/network/matchManager.test.js
// Phase E-02：同步選牌與回合解析 單元測試

const {
  createMatchFromRoom,
  createMatchController,
} = require("../../server/network/matchManager");

describe("matchManager - createMatchFromRoom", () => {
  test("由房間玩家建立對戰", () => {
    const roomPlayers = [
      { socketId: "sock-1", name: "Alice", characterId: "char_attack" },
      { socketId: "sock-2", name: "Bob", characterId: "char_defense" },
    ];

    const { state } = createMatchFromRoom(roomPlayers);

    expect(state.players).toHaveLength(2);
    expect(state.players[0].id).toBe("sock-1");
    expect(state.players[1].id).toBe("sock-2");
    expect(state.players[0].characterId).toBe("char_attack");
    expect(state.players[1].characterId).toBe("char_defense");
    expect(state.aiPlayerIds).toEqual([]);
    expect(state.players.every((p) => p.isAi === false)).toBe(true);
  });

  test("支援 4 人對戰", () => {
    const roomPlayers = [
      { socketId: "s1", characterId: "char_attack" },
      { socketId: "s2", characterId: "char_defense" },
      { socketId: "s3", characterId: "char_move" },
      { socketId: "s4", characterId: "char_balanced" },
    ];

    const { state } = createMatchFromRoom(roomPlayers);

    expect(state.players).toHaveLength(4);
    // 位置不重複
    const positions = state.players.map((p) => `${p.position.x},${p.position.y}`);
    expect(new Set(positions).size).toBe(4);
  });
});

describe("matchManager - createMatchController", () => {
  test("玩家提交選牌，全部提交後 allSubmitted 為 true", () => {
    const { state } = createMatchFromRoom([
      { socketId: "sock-1", characterId: "char_attack" },
      { socketId: "sock-2", characterId: "char_defense" },
    ]);
    const controller = createMatchController(state);

    // 第一位玩家選一張攻擊牌
    const p1 = state.players[0];
    const attackCard = p1.hand.find((c) => c.type === "attack");
    const result1 = controller.submitSelection("sock-1", [
      { card: attackCard, extra: {} },
    ]);

    expect(result1.ok).toBe(true);
    expect(result1.allSubmitted).toBe(false);

    // 第二位玩家選一張防禦牌
    const p2 = state.players[1];
    const defenseCard = p2.hand.find((c) => c.type === "defense");
    const result2 = controller.submitSelection("sock-2", [
      { card: defenseCard, extra: {} },
    ]);

    expect(result2.ok).toBe(true);
    expect(result2.allSubmitted).toBe(true);
  });

  test("提交不存在的玩家失敗", () => {
    const { state } = createMatchFromRoom([
      { socketId: "sock-1", characterId: "char_attack" },
      { socketId: "sock-2", characterId: "char_defense" },
    ]);
    const controller = createMatchController(state);

    const result = controller.submitSelection("sock-99", []);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("PLAYER_NOT_FOUND");
  });

  test("結算回合後清除已提交狀態", () => {
    const { state } = createMatchFromRoom([
      { socketId: "sock-1", characterId: "char_attack" },
      { socketId: "sock-2", characterId: "char_defense" },
    ]);
    const controller = createMatchController(state);

    const p1 = state.players[0];
    const p2 = state.players[1];
    const attackCard = p1.hand.find((c) => c.type === "attack");
    const defenseCard = p2.hand.find((c) => c.type === "defense");

    controller.submitSelection("sock-1", [{ card: attackCard, extra: {} }]);
    controller.submitSelection("sock-2", [{ card: defenseCard, extra: {} }]);

    const result = controller.resolveTurn();

    expect(result.ok).toBe(true);
    expect(controller.getSubmittedPlayerIds()).toHaveLength(0);
    // 回合數應增加
    expect(state.round).toBeGreaterThanOrEqual(2);
  });

  test("斷線 / 重連處理", () => {
    const { state } = createMatchFromRoom([
      { socketId: "sock-1", characterId: "char_attack" },
      { socketId: "sock-2", characterId: "char_defense" },
    ]);
    const controller = createMatchController(state);

    controller.onDisconnect("sock-1");
    expect(controller.getDisconnectedPlayerIds()).toContain("sock-1");

    controller.onReconnect("sock-1");
    expect(controller.getDisconnectedPlayerIds()).not.toContain("sock-1");
  });

  test("bindSocket 對應 socket 與 player", () => {
    const { state } = createMatchFromRoom([
      { socketId: "sock-1", characterId: "char_attack" },
      { socketId: "sock-2", characterId: "char_defense" },
    ]);
    const controller = createMatchController(state);

    controller.bindSocket("sock-1", "sock-1");
    expect(controller.getPlayerIdForSocket("sock-1")).toBe("sock-1");
    expect(controller.getSocketForPlayer("sock-1")).toBe("sock-1");
  });

  test("序列化狀態包含 hasSubmitted / isDisconnected", () => {
    const { state } = createMatchFromRoom([
      { socketId: "sock-1", characterId: "char_attack" },
      { socketId: "sock-2", characterId: "char_defense" },
    ]);
    const controller = createMatchController(state);

    const p1 = state.players[0];
    const attackCard = p1.hand.find((c) => c.type === "attack");
    controller.submitSelection("sock-1", [{ card: attackCard, extra: {} }]);
    controller.onDisconnect("sock-2");

    const serialized = controller.serialize();
    expect(serialized.players[0].hasSubmitted).toBe(true);
    expect(serialized.players[1].hasSubmitted).toBe(false);
    expect(serialized.players[1].isDisconnected).toBe(true);
  });

  test("onStateChange 在狀態變更時觸發", () => {
    const { state } = createMatchFromRoom([
      { socketId: "sock-1", characterId: "char_attack" },
      { socketId: "sock-2", characterId: "char_defense" },
    ]);
    let changeCount = 0;
    const controller = createMatchController(state, {
      onStateChange: () => changeCount++,
    });

    const p1 = state.players[0];
    const attackCard = p1.hand.find((c) => c.type === "attack");
    controller.submitSelection("sock-1", [{ card: attackCard, extra: {} }]);

    expect(changeCount).toBeGreaterThan(0);
  });
});
