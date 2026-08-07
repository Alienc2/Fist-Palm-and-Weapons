// tests/ai/aiMatch.e2e.test.js
// Phase F：AI 對戰 integration / e2e 測試
// 驗證 AI decision 接入 gameEngine 後，能完整跑完一場對戰。

const { runAiMatch, autoSelectAiPlayers, isAiPlayer } = require("../../server/game/ai/aiMatch");
const gameEngine = require("../../server/game/gameEngine");

describe("isAiPlayer", () => {
  test("判斷玩家是否為 AI 控制", () => {
    const player = { id: "P1" };
    expect(isAiPlayer(player, ["P1", "P2"])).toBe(true);
    expect(isAiPlayer(player, ["P2"])).toBe(false);
  });
});

describe("autoSelectAiPlayers", () => {
  test("為 AI 玩家自動填選牌，人類玩家不受影響", () => {
    const state = gameEngine.createMatch({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
        { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense" },
      ],
    });

    // 先手動為人類玩家 P1 填選牌
    const p1 = state.players.find((p) => p.id === "P1");
    const p1Card = p1.hand[0];
    gameEngine.submitSelection(state, "P1", [{ card: p1Card, extra: {} }]);

    // 只讓 P2 由 AI 控制
    autoSelectAiPlayers(state, {
      aiPlayerIds: ["P2"],
      rng: () => 0.01,
      maxCards: 1,
    });

    const p2 = state.players.find((p) => p.id === "P2");
    expect(p2.selectedCards.length).toBeGreaterThanOrEqual(1);
    expect(p2.selectedCards[0].card).toBeTruthy();
  });
});

describe("runAiMatch", () => {
  test("AI vs AI 對戰能完整跑完並產生勝負或達到最大回合", () => {
    const result = runAiMatch({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack", aiProfileId: "ai_normal" },
        { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense", aiProfileId: "ai_normal" },
      ],
      maxRounds: 10,
      rng: () => 0.5,
      maxCards: 1,
    });

    expect(result.state).toBeTruthy();
    expect(result.rounds).toBeGreaterThanOrEqual(1);
    expect(result.rounds).toBeLessThanOrEqual(10);
    expect(Array.isArray(result.roundLog)).toBe(true);
    expect(result.roundLog.length).toBe(result.rounds);

    // 勝負：要嘛有 winner，要嘛達到最大回合
    if (result.winner) {
      expect(["P1", "P2"]).toContain(result.winner);
    }
  });

  test("對戰結束時，存活玩家數不多於 1（或達到最大回合）", () => {
    const result = runAiMatch({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack", aiProfileId: "ai_normal" },
        { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense", aiProfileId: "ai_normal" },
      ],
      maxRounds: 5,
      rng: () => 0.5,
      maxCards: 1,
    });

    const alive = result.state.players.filter((p) => !p.isEliminated);
    // 若未達最大回合，存活玩家應 <= 1
    if (result.rounds < 5) {
      expect(alive.length).toBeLessThanOrEqual(1);
    }
  });

  test("3P AI 對戰能完整跑完", () => {
    const result = runAiMatch({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack", aiProfileId: "ai_normal" },
        { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense", aiProfileId: "ai_normal" },
        { id: "P3", position: { x: 1, y: 3 }, characterId: "char_move", aiProfileId: "ai_normal" },
      ],
      maxRounds: 8,
      rng: () => 0.5,
      maxCards: 1,
    });

    expect(result.state.players.length).toBe(3);
    expect(result.rounds).toBeGreaterThanOrEqual(1);
    expect(result.rounds).toBeLessThanOrEqual(8);
  });

  test("onRound 回呼會被呼叫", () => {
    let callCount = 0;
    const result = runAiMatch({
      players: [
        { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack", aiProfileId: "ai_normal" },
        { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense", aiProfileId: "ai_normal" },
      ],
      maxRounds: 3,
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
