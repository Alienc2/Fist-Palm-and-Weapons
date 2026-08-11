# P0 — 阻斷閱讀/操作 + 資產基礎

## 目標
提升核心戰鬥文字至可讀大小（≥14px）、精簡棋盤 token、建立資產目錄，並為 token 與卡牌加入圖片 fallback，確保資產未齊全時 UI 仍可讀可用。

## 實際檔案對照（重要修正）
- 計劃原文寫「`BoardView.js` 中 `renderToken`」「`CardView.js` 中 `renderCard`」，但實際：
  - token 係**內聯**喺 `client/views/boardView.js` `renderBoard()` 第 161–176 行，**冇獨立 `renderToken` 函數**。需先抽出來再改。
  - 卡牌渲染係 `client/layout.js` `cardNode()`（第 144–200 行），**冇 `CardView.js` / `renderCard`**。
- `.card-name` 已經係 `clamp(14px, 2.5vw, 18px)`（styles.css:465），**唔使改**，只需驗證。
- `renderPlayerStatus`（app.js:70，`#playerStatus`）**已經顯示 MP 與朝向**，故 Task 2 只需從棋盤 token 移除該兩項，無需新增狀態列邏輯。
- 靜態服務 `client/server.js` `resolveStaticPath` 可 serve 任何 `client/` 下檔案，`client/assets/...` 唔使改 server。
- 卡牌 id 係 `basic_punch_1` / `basic_move_1` …（非 `card_attack_01`）；角色 `characterName` 已被 loader 正常化為 `name_zh`（破軍/玄武/飛翎/無鋒），`player.characterName` 經 `serializePlayer`（server.js:52）送到前端。
- 引擎 `tokenColor` 實際已由 `characters.csv` 的 `token_color` 正常化，但本計劃**唔用**佢做圖片色；顏色改由前端玩家槽定色（見下方決策）。

## 已確認決策
1. **Token 圖片命名**：`token_<name_zh>_<color>_<facing>.png`
   - `<name_zh>`＝玩家角色 `characterName`（破軍/玄武/飛翎/無鋒）
   - `<color>`＝前端玩家槽色（P1→red、P2→blue、P3→green、P4→yellow）
   - `<facing>`＝`up`/`down`/`left`/`right`
   - 例：`assets/tokens/token_破軍_red_up.png`
2. **顏色來源**：前端玩家槽定色，唔改引擎。用 `state.players` 嘅 index 映射 `["red","blue","green","yellow"]`。token 圍邊色亦由呢個槽色驅動（取代依家 `occupant.tokenColor || "gray"` 嘅 gray 兜底）。
3. **Token fallback**：圖片 404 → 三角形（CSS `clip-path`，依 `facing` 旋轉）+ 角色名 `characterName` + `HP x/y`，外框用槽色。Task 2「移除朝向」只移除朝向**文字**；朝向改由三角形/圖片方向視覺呈現。
4. **卡牌命名**：面 = `assets/cards/<card.id>.png`（如 `basic_punch_1.png`）；背 = `assets/cards/card_back_default.png`。
5. **卡牌 fallback**：`cardNode` 嘗試載入卡面圖；失敗 → 現有銀黑色咭面 + 文字（即現時 `cardNode` 內容）。卡背經 `showBack` option 提供能力，但**現時冇任何 view 用到**（手牌/棄牌都顯示正面），故卡背只建資產契約 + 小 helper，唔加新 UI 行為。
6. **P0 資產全部為 placeholder**：目錄內只放 `.gitkeep`，冇真圖。故執行後所有 token 都會走三角形 fallback、所有卡牌都會走銀黑 fallback——呢個係預期行為，亦係測試重點。

## 執行順序（依依賴，非原文次序）
> 原文 Task 1 喺 Task 2 前，但 Task 2 會移除 `.token-mp`，故 Task 2 必須先做，再改字型，避免做白工。

### Task 2（先）— 精簡棋盤 token 為「角色名 + HP」
- `client/views/boardView.js` `renderBoard()` 第 161–176 行 token 區塊：
  - 移除 `el("div",{class:"token-facing", ...})`（第 169–172 行）
  - 移除 `el("div",{class:"token-mp", ...})`（第 174 行）
  - 保留 `token-name`（`occupant.id`）、`token-char`（`characterName`）、`token-hp`
  - 顏色 class 改由玩家槽色驅動（見 Task 4 統一處理，此步可先只移除文字）
- 同時更新 styles.css：移除 `.token-mp` 定義（styles.css:365–367）。

### Task 1 — 核心戰鬥文字 ≥14px（`clamp(14px, 2.5vw, 18px)`）
`client/styles.css`：
- `.card-name`：已符合，**不變**（僅驗證）。
- `.card-desc`：`clamp(13px, 2.2vw, 16px)` → `clamp(14px, 2.5vw, 18px)`（第 473–477 行）
- `.log-entry`：`12px` → `clamp(14px, 2.5vw, 18px)`（第 569–575 行）
- `.token-name`：`13px` → `clamp(14px, 2.5vw, 18px)`（第 352–355 行）
- `.token-hp`：由 `.board-token` 繼承 11px，改設 `clamp(14px, 2.5vw, 18px)`（第 362–364 行）
- `.token-mp`：因 Task 2 已移除，略過。

### Task 3 — 資產目錄結構
建立（git 唔追蹤空目錄，每個放 `.gitkeep`）：
```
client/assets/tokens/.gitkeep
client/assets/cards/.gitkeep
client/assets/boards/.gitkeep
```

### Task 4 — Token fallback 渲染
`client/views/boardView.js`：
- 抽出 `renderToken(occupant, color, index)`，由 `renderBoard()` 呼叫。
- 由 `state.players.indexOf(occupant)` 推槽色：`const SLOT_COLORS = ["red","blue","green","yellow"]; const color = SLOT_COLORS[index % 4]`。
- `facing` 段：`occupant.facing` 正常化為 `up/down/left/right`（現有 `FACING_ARROW` key 即此四值）。
- 組圖片 src：`assets/tokens/token_${occupant.characterName || occupant.id}_${color}_${facing}.png`
- 嘗試 `<img>`；`onerror` → 換成三角形 fallback：CSS `clip-path` 三角形元素（依 `facing` 旋轉），下方 `characterName` 與 `HP x/y`，容器用 `token-${color}` 圍邊色。
- 移除原內聯 token 區塊，改用 `renderToken`。
- 兜底：`characterName` 為空時用 `characterId` 或 `id` 作角色名段。

CSS 補充（`client/styles.css`）：`.token-img`、`.token-fallback-triangle`（clip-path + facing 旋轉 class 或 `transform: rotate`）、確保 cell 內唔溢出。

### Task 5 — 卡牌 fallback 渲染
`client/layout.js` `cardNode()`：
- 加入 `showBack` option：`true` → 載入 `assets/cards/card_back_default.png`，失敗 fallback 為樣式化卡背。
- 預設（卡面）：嘗試載入 `assets/cards/${c.id}.png`；失敗 → 保留現有銀黑色咭面 + 文字（即現時 child 結構）。
- 圖片容器置於卡面最底層，文字層疊其上；圖片載入成功時隱藏文字層、失敗時顯示文字層（或 `img.onerror` 時 `img.remove()` 保留文字）。

## 檔案影響清單
- `client/views/boardView.js`（Task 2、4）
- `client/layout.js`（Task 5）
- `client/styles.css`（Task 1、2、4）
- 新增 `client/assets/tokens/.gitkeep`、`client/assets/cards/.gitkeep`、`client/assets/boards/.gitkeep`（Task 3）

## 驗證方式
- 前端語法檢查（全部改動檔）：
  `node --input-type=module --check client/views/boardView.js`
  `node --input-type=module --check client/layout.js`
- 啟動 server：`npm run client`（port 4000），瀏覽器開啟。
- DevTools 裝置模擬 720×1280 與 1080×2400，開一局對戰：
  - 每格 token 只顯示「P# / 角色名 / HP」，**無** MP 與朝向文字。
  - 因資產為空，每格顯示三角形 fallback，4 色（P1 red/P2 blue/P3 green/P4 yellow）、三角形方向正確（4 方向）。
  - 卡牌顯示銀黑 fallback 咭面 + 文字；對戰記錄字體明顯 ≥14px。
  - 確認 token 內文字可讀、無溢出、棋盤唔超出畫面 4/5。
- 回歸：`npx jest --runInBand`（應維持全綠；本計劃只改 client 前端，理論上 server 測試唔受影響）。

## 已知風險 / 注意
- 冇 client 測試框架，字型與 fallback 需人手瀏覽驗證（見上）。
- 顏色依 `state.players` index，若未來玩家排序變動需重核映射。
- `.gitkeep` 令空資產目錄入 git；真實圖片放落後 fallback 會自動切到圖片，無需改 code。
- 卡背能力（`showBack`）暫無 view 使用，屬預留契約，避免過度工程。
