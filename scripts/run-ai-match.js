// scripts/run-ai-match.js
// Phase F：local run script
// 執行一場 AI vs AI 對戰，輸出每回合摘要與最終勝負。
// 用法：
//   node scripts/run-ai-match.js
//   node scripts/run-ai-match.js --rounds 10
//   node scripts/run-ai-match.js --players P1:char_attack:ai_normal,P2:char_defense:ai_normal

const path = require("path");
const { runAiMatch } = require(path.resolve(__dirname, "../server/game/ai/aiMatch"));

function parseArgs(argv) {
  const args = { rounds: 20, players: null };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--rounds") {
      args.rounds = Number(argv[i + 1]) || 20;
      i += 1;
    } else if (arg === "--players") {
      args.players = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function parsePlayers(spec) {
  if (!spec) return null;
  return spec.split(",").map((entry, index) => {
    const [id, characterId, aiProfileId] = entry.split(":");
    const defaultPositions = [
      { x: 1, y: 1 },
      { x: 3, y: 3 },
      { x: 1, y: 3 },
      { x: 3, y: 1 },
    ];
    return {
      id: id || `P${index + 1}`,
      position: defaultPositions[index] || { x: 1, y: 1 },
      characterId: characterId || "char_attack",
      aiProfileId: aiProfileId || "ai_normal",
    };
  });
}

function printSection(title, payload) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(payload, null, 2));
}

function main() {
  const args = parseArgs(process.argv);
  const players = parsePlayers(args.players) || [
    { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack", aiProfileId: "ai_normal" },
    { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense", aiProfileId: "ai_normal" },
  ];

  console.log(`[run-ai-match] 開始 AI 對戰（最多 ${args.rounds} 回合）`);
  console.log(`[run-ai-match] 玩家：${players.map((p) => `${p.id}(${p.characterId}/${p.aiProfileId})`).join(", ")}`);

  const result = runAiMatch({
    players,
    maxRounds: args.rounds,
    onRound: (state, round) => {
      const summary = state.players.map((p) => `${p.id}:HP${p.hp}/MP${p.mp}@(${p.position.x},${p.position.y})${p.isEliminated ? "[KO]" : ""}`);
      console.log(`  回合 ${round}: ${summary.join(" | ")}`);
    },
  });

  printSection("最終結果", {
    winner: result.winner,
    rounds: result.rounds,
    players: result.state.players.map((p) => ({
      id: p.id,
      hp: p.hp,
      mp: p.mp,
      position: p.position,
      isEliminated: p.isEliminated,
    })),
  });

  if (!result.winner) {
    console.log("\n[run-ai-match] 未分出勝負（達到最大回合數）");
  } else {
    console.log(`\n[run-ai-match] 勝者：${result.winner}`);
  }
}

main();
