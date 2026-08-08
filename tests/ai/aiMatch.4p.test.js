// tests/ai/aiMatch.4p.test.js
// Phase J-01：4P AI 對戰 E2E 測試
// 驗證 runAiMatch 在 4 人規模下能完整跑完，並正確判定勝負、推進回合、處理淘汰。

const { runAiMatch } = require("../../server/game/ai/aiMatch");

// 4 位玩家設定（不同角色）
const FOUR_PLAYERS = [
  { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack", aiProfileId: "ai_normal" },
  { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense", aiProfileId: "ai_normal" },
  { id: "P3", position: { x: 1, y: 3 }, characterId: "char_move", aiProfileId: "ai_normal" },
  { id: "P4", position: { x: 3, y: 1 }, characterId: "char_balanced", aiProfileId: "ai_normal" },
];

describe("runAiMatch - 4P 對戰", () => {
  test("4P AI 對戰能完整跑完並產生結果", () => {
    const result = runAiMatch({
      players: FOUR_PLAYERS,
      maxRounds: 10,
      rng: () => 0.5,
      maxCards: 1,
    });

    expect(result.state).toBeTruthy();
    expect(result.state.players.length).toBe(4);
    expect(result.rounds).toBeGreaterThanOrEqual(1);
    expect(result.rounds).toBeLessThanOrEqual(10);
    expect(Array.isArray(result.roundLog)).toBe(true);
    expect(result.roundLog.length).toBe(result.rounds);

    // 勝負：要嘛有 winner，要嘛達到最大回合
    if (result.winner) {
      expect(["P1", "P2", "P3", "P4"]).toContain(result.winner);
    }
  });

  test("4P 對戰結束時，存活玩家數不多於 1（或達到最大回合）", () => {
    const result = runAiMatch({
      players: FOUR_PLAYERS,
      maxRounds: 8,
      rng: () => 0.5,
      maxCards: 1,
    });

    const alive = result.state.players.filter((p) => !p.isEliminated);
    // 若未達最大回合，存活玩家應 <= 1
    if (result.rounds < 8) {
      expect(alive.length).toBeLessThanOrEqual(1);
    }
  });

  test("4P 對戰每回合所有玩家狀態都有效（HP/MP/位置）", () => {
    const result = runAiMatch({
      players: FOUR_PLAYERS,
      maxRounds: 6,
      rng: () => 0.5,
      maxCards: 1,
    });

    for (const round of result.roundLog) {
      expect(round.players.length).toBe(4);
      for (const p of round.players) {
        expect(p.hp).toBeGreaterThanOrEqual(0);
        expect(p.mp).toBeGreaterThanOrEqual(0);
        expect(p.position).toBeTruthy();
        expect(typeof p.isEliminated).toBe("boolean");
      }
    }
  });

  test("4P 對戰 onRound 回呼會被呼叫且次數等於回合數", () => {
    let callCount = 0;
    const result = runAiMatch({
      players: FOUR_PLAYERS,
      maxRounds: 5,
      rng: () => 0.5,
      maxCards: 1,
      onRound: () => {
        callCount += 1;
      },
    });

    expect(callCount).toBe(result.rounds);
    expect(callCount).toBeGreaterThanOrEqual(1);
  });
});
