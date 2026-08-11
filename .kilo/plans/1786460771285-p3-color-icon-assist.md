# P3 — 色彩／輔助：任務 9 + 任務 10

目標：提升 `--text-muted` 對比至 ≥4.5:1，並為卡牌類型與角色 token 加入圖示輔助。

## 事實澄清（與任務描述差異）
- 任務寫嘅 `views/CardView.js` 並唔存在。卡牌 DOM 渲染喺 `client/layout.js` 嘅 `cardNode()`（含 `.card-type` span）。圖示加喺呢度。
- token 渲染喺 `client/views/boardView.js` 嘅 `renderToken()`（fallback 三角形 body：`.token-char` + `.token-hp`）。
- 決策（已確認）：token 只加 ❤️（HP），**唔重加 MP / ⚡**，維持 P0「精簡棋盤資訊」決定。因此任務 10 嘅 ⚡ 明確 out of scope。

## 任務 9 — `--text-muted` 對比
檔案：`client/styles.css`

- 深色主題（`:root`，第 10 行）：`--text-muted: #8b93a3` → `#a0a8b8`。
  - 對比驗算：#a0a8b8 對背景 #0f1115 ≈ **7.9:1**（≥4.5 ✓）。
- 淺色主題（`html[data-theme="light"]`，第 30 行）：現值 `#5c6675` 對背景 #f4f6fa ≈ **5.37:1**，已達標。**保持不變**（避免無謂改動）。
- 呢個變數由多處使用（`.card-header`、`.card-subtype`、log 等），單點改動即全體生效。

### 驗證（任務 9）
- 手動 / script 對比度檢查：#a0a8b8 對 #0f1115 ≥4.5:1、#5c6675 對 #f4f6fa ≥4.5:1。
- 可用簡單 Node script 或線上對比工具（如 WebAIM Contrast Checker）核對。
- 視覺 smoke：啟動 `npm run client`，確認深色主題下 muted 文字（卡 header / subtype / log）清晰可讀。

## 任務 10 — 圖示輔助

### 10a. 卡牌類型圖示
檔案：`client/layout.js`（`cardNode()`）+ `client/styles.css`

- 喺 `cardNode()` 加 icon map：
  - attack → `⚔️`、defense → `🛡️`、move → `➤`、buy → `🛒`、recover → `❤️`、counter → `🔄`；未知 type 唔加 icon（維持原 label）。
- `.card-type` span（第 178 行）文字由 `typeLabel` 改為 `${icon} ${typeLabel}`（icon 有值時），保留原有 11px `--text-muted` 樣式。
- styles.css：`<span class="card-type">` 已由 `.card-header` 提供樣式，無需新增 CSS（若要 icon 同 label 分隔可用 `letter-spacing`，非必要）。

### 10b. token 圖示（只加 HP ❤️）
檔案：`client/views/boardView.js`（`renderToken()` fallback）

- fallback body 中 `.token-hp`（第 189–191 行）文字由 `HP ${hp}/${maxHp}` 改為 `❤️ ${hp}/${maxHp}`（加入 heart icon，維持 `.token-hp` 紅色樣式）。
- 唔重加 MP 文字，唔加 ⚡（已確認 out of scope）。
- 注意：唔好喺冇 `fallback`（圖片成功載入）路徑加 icon；維持圖片路徑優先。

### 驗證（任務 10）
- 卡牌：handView / selectedCardsView / shopModal 三處共用 `cardNode()`，確認各 type 卡面 header 出現對應 icon 且文字無破版（icon 用 emoji，不需外部資產）。
- token：對戰時用 fallback（P0 資產為 placeholder）確認 token 顯示 ❤️ + HP；圖片成功載入時唔顯示 icon 屬預期。
- 前端 JS 語法檢查：temp `.mjs` copy 後 `node --check`（沿用現有做法）。
- 全套測試：`npx jest --runInBand` 應維持全綠（此改動只觸及 client DOM 渲染，無 engine / rules 變動）。

## 影響檔案
- `client/styles.css`（對比 + 可能 icon 微調）
- `client/layout.js`（卡牌 icon）
- `client/views/boardView.js`（token ❤️）

## 風險
- emoji 喺 Windows Chrome 全正常顯示；個別 platform font 差異僅影響外觀，不影響功能。
- 冇改任何 server / rules / generated data，回歸風險低。

## 下一步
由 implementation-capable agent 執行上述 2 個任務，跑指定驗證後更新 `CONTEXT.md`（版本 V29、完成項目、測試結果）與 `CODEX_HANDOFF.md`。
