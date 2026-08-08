// tests/rules/createInitialState.facing.test.js
// Phase I-02-B：起始位置固定 + 起始朝向向住 (2,2) 測試
// 驗證：
//   1. 起始位置固定為 P1(1,1)、P2(3,3)、P3(3,1)、P4(1,3)
//   2. 起始朝向指向棋盤中心 (2,2)

const { createInitialState } = require("../../server/game/state/createInitialState");

describe("起始位置固定", () => {
  test("4P 起始位置固定", () => {
    const state = createInitialState({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
        { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense" },
        { id: "P3", position: { x: 3, y: 1 }, characterId: "char_move" },
        { id: "P4", position: { x: 1, y: 3 }, characterId: "char_balanced" },
      ],
    });

    const positions = Object.fromEntries(
      state.players.map((p) => [p.id, `${p.position.x},${p.position.y}`])
    );
    expect(positions).toEqual({
      P1: "1,1",
      P2: "3,3",
      P3: "3,1",
      P4: "1,3",
    });
  });
});

describe("起始朝向指向 (2,2)", () => {
  test("P1(1,1) 面向下（指向中心）", () => {
    const state = createInitialState({
      players: [{ id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" }],
    });
    expect(state.players[0].facing).toBe("down");
  });

  test("P2(3,3) 面向上（指向中心）", () => {
    const state = createInitialState({
      players: [{ id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense" }],
    });
    expect(state.players[0].facing).toBe("up");
  });

  test("P3(3,1) 面向下（指向中心）", () => {
    const state = createInitialState({
      players: [{ id: "P3", position: { x: 3, y: 1 }, characterId: "char_move" }],
    });
    expect(state.players[0].facing).toBe("down");
  });

  test("P4(1,3) 面向上（指向中心）", () => {
    const state = createInitialState({
      players: [{ id: "P4", position: { x: 1, y: 3 }, characterId: "char_balanced" }],
    });
    expect(state.players[0].facing).toBe("up");
  });
});
