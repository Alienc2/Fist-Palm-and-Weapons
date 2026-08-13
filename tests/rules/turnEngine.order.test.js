// tests/rules/turnEngine.order.test.js
// T6：驗證 N 玩家交錯揭牌順序依 startingPlayerIndex 輪轉（P1→P2→P3→P4），
// 每人每次一張，全部揭完先進入下一輪。執行順序會寫入 state.log（「X 使用 ...」）。

const { createMatch, submitSelection, playOneTurn } = require("../../server/game/gameEngine");

function defenseCard(id) {
  return { id, type: "defense", subtype: "guard", blockValue: 3 };
}

// 由 state.log 抽出「X 使用 ...」執行順序（player id 序列）
function extractPlayOrder(state) {
  return state.log
    .filter((msg) => /^P\d+ 使用 /.test(msg))
    .map((msg) => msg.split(" ")[0]);
}

describe("交錯揭牌執行順序（T6）", () => {
  test("4 名玩家各出 2 張：P1→P2→P3→P4→P1→P2→P3→P4", () => {
    const state = createMatch({
      players: [
        { id: "P1", position: { x: 0, y: 0 }, characterId: "char_attack" },
        { id: "P2", position: { x: 4, y: 4 }, characterId: "char_defense" },
        { id: "P3", position: { x: 0, y: 4 }, characterId: "char_move" },
        { id: "P4", position: { x: 4, y: 0 }, characterId: "char_balanced" },
      ],
    });

    for (const p of state.players) {
      submitSelection(state, p.id, [
        { card: defenseCard(`d_${p.id}_1`) },
        { card: defenseCard(`d_${p.id}_2`) },
      ]);
    }

    playOneTurn(state);

    expect(extractPlayOrder(state)).toEqual([
      "P1", "P2", "P3", "P4",
      "P1", "P2", "P3", "P4",
    ]);
  });

  test("startingPlayerIndex 輪轉：由 P3 開始", () => {
    const state = createMatch({
      startingPlayerIndex: 2,
      players: [
        { id: "P1", position: { x: 0, y: 0 }, characterId: "char_attack" },
        { id: "P2", position: { x: 4, y: 4 }, characterId: "char_defense" },
        { id: "P3", position: { x: 0, y: 4 }, characterId: "char_move" },
        { id: "P4", position: { x: 4, y: 0 }, characterId: "char_balanced" },
      ],
    });

    for (const p of state.players) {
      submitSelection(state, p.id, [
        { card: defenseCard(`d_${p.id}_1`) },
        { card: defenseCard(`d_${p.id}_2`) },
      ]);
    }

    playOneTurn(state);

    // turnOrder = [P1,P2,P3,P4]，startIndex=2 → [P3,P4,P1,P2]
    expect(extractPlayOrder(state)).toEqual([
      "P3", "P4", "P1", "P2",
      "P3", "P4", "P1", "P2",
    ]);
  });
});
