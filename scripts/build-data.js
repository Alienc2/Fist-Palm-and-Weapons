// scripts/build-data.js
// CommonJS 版 CSV → JSON build script

const fs = require("fs");
const path = require("path");
const csv = require("csvtojson");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const OUTPUT_DIR = path.join(ROOT_DIR, "generated");

const FILES = [
  { csv: "cards.csv", json: "cards.json" },
  { csv: "characters.csv", json: "characters.json" },
  { csv: "keywords.csv", json: "keywords.json" },
  { csv: "ai_profiles.csv", json: "ai_profiles.json" },
  { csv: "combos.csv", json: "combos.json" },
];

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`[build-data] 建立 generated 目錄：${OUTPUT_DIR}`);
  }
}

async function convertCsvToJson(csvPath, jsonPath) {
  if (!fs.existsSync(csvPath)) {
    console.warn(`[build-data] 找唔到 CSV 檔案：${csvPath}（會輸出空陣列）`);
    fs.writeFileSync(jsonPath, "[]", "utf-8");
    return;
  }

  console.log(`[build-data] 讀取：${csvPath}`);
  const rows = await csv().fromFile(csvPath);
  console.log(`[build-data] 讀取完成，共 ${rows.length} 行，輸出：${jsonPath}`);

  const jsonString = JSON.stringify(rows, null, 2);
  fs.writeFileSync(jsonPath, jsonString, "utf-8");
}

async function main() {
  console.log("[build-data] 開始 CSV → JSON build");

  ensureOutputDir();

  for (const file of FILES) {
    const csvPath = path.join(DATA_DIR, file.csv);
    const jsonPath = path.join(OUTPUT_DIR, file.json);
    try {
      await convertCsvToJson(csvPath, jsonPath);
    } catch (err) {
      console.error(`[build-data] 轉換失敗：${file.csv}`, err);
    }
  }

  console.log("[build-data] 完成全部轉換");
}

main().catch((err) => {
  console.error("[build-data] 重大錯誤：", err);
  process.exit(1);
});