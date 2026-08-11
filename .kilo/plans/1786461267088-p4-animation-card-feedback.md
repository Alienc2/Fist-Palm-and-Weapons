# P4 動畫／愉悅 — 任務 11 + 任務 12 計劃

## 目標
兩項純前端 UI 打磨，不改 server 規則邏輯、不改資料。屬 Phase P4「動畫／愉悅」。
重點：只做最小改動、沿用現有 class 命名慣例、以 browser 實測為驗收依據。

## 檔案名稱對照（任務描述與實際檔案不同，已映射）
- 任務 11 的 `views/CardView.js` → 實際卡牌渲染係 `client/layout.js` 的 `cardNode()`（共用於 handView / selectedCardsView / shopModal）。CSS 係 `client/styles.css`。
- 任務 12 的 `views/BattleView.js` 中 `renderBattleResult` → 實際回合結算摘要係 `client/views/resolveAnimation.js` 的 `showSummary()`（動畫播完後出 HP/MP 摘要 overlay）。

## 現況（已完成嘅部分，避免重做）
- `cardNode()`（client/layout.js:144）已透過 `selected: true` 選項喺 `class` 加入 `.is-selected`，並喺 re-render 時反映。即「點擊後選中」已存在。
- `.card.is-selected` 樣式已存在（styles.css:499）。
- `.card:hover:not(.is-disabled)` 已有 `transform: translateY(-2px)`（styles.css:495）。
- `.hand-fan .card:hover:not(.is-disabled)` 用扇形 transform 覆蓋（styles.css:464），因此全局 `.card:hover` 嘅 scale 對佢唔會生效。
- `resolveAnimation.js` `showSummary()` 只顯示每玩家 `HP x/y MP x/y`。

## 決定（已同用戶確認）
- 任務 12：行動摘要用「逐事件逐行列出」，每行一條中文摘要，附喺 HP/MP 摘要之上。
- 任務 11：hover scale(1.05) 應用於**所有卡牌**（全局 `.card:hover` + 手牌扇形 `.hand-fan .card:hover` 同步加入 scale）。選中沿用現有 `.is-selected`，唔另加 press 動畫。

---

## 任務 11 — 選牌回饋動畫

### 改動 1：`client/styles.css`
1. `.card:hover:not(.is-disabled)`（styles.css:495）
   - 現況：`transform: translateY(-2px);`
   - 改為：`transform: translateY(-2px) scale(1.05);`
   - 保留 `border-color: var(--accent);` 與 `transition: transform 0.12s` 唔變（scale 已含喺 transition）。
2. `.hand-fan .card:hover:not(.is-disabled)`（styles.css:464）
   - 現況：`transform: rotate(var(--fan-angle, 0deg)) translateY(-36px) scale(var(--card-scale, 1));`
   - 改為：`... translateY(-36px) scale(calc(var(--card-scale, 1) * 1.05));`
   - 理由：直接寫 `scale(1.05)` 會忽略扇形 `--card-scale`（8 張以上收細嘅卡），改用 `calc(var(--card-scale, 1) * 1.05)` 保留收細比例。

### 改動 2：`client/layout.js` 的 `cardNode()`
- 唔需要改 code：`selected` 參數已加入 `.is-selected` class。確認即可。
- 若想加「點擊後持續 scale」作額外回饋（可選、唔必須）：於 `cardNode()` 內，當 `onClick` 被呼叫時，可對 node 做 `classList.add('is-picked')` 並喺 `client/styles.css` 加 `.card.is-picked { transform: scale(1.05); }`。此為選項，預設唔做，保持最小改動。

### 驗證（任務 11）
- 啟動正式 UI：`npm run client`
- Chrome 開 `/`，開始對戰：
  - 手牌 hover 卡牌 → 卡牌升高 + 微放大（scale ≈ 1.05，8 張以上仍按 `--card-scale` 收細後再放大）。
  - 點擊手牌卡牌 → 卡牌飛到上方「打出」區並顯示 `.is-selected` 高亮邊框。
  - 上方 selected-list / 商店 / 棄牌列表 hover → 同樣有 scale(1.05) 回饋。
  - 確認 hover 動畫流暢、無跳格（transition 0.12s–0.15s）。
- 語法檢查：`layout.js` / `handView.js` copy 做 temp `.mjs`，`node --check`（沿用 CONTEXT 既有做法）。

---

## 任務 12 — 結算動畫加入行動摘要

### 改動：`client/views/resolveAnimation.js`
喺 `showSummary(round, players)`（約 line 150）新增「本回合行動摘要」區塊，顯示喺 title 之後、HP/MP 摘要之前。

1. 修改 `playResolveAnimation({ round, players, events })`（line 176）：將 `events` 傳入 `showSummary`。
   - 現況：`await showSummary(round, players || []);`
   - 改為：`await showSummary(round, players || [], events || []);`
2. 修改 `showSummary` signature 為 `showSummary(round, players, events = [])`。
3. 喺 `showSummary` 內新增 `buildActionSummary(events)` helper，將事件轉為逐行中文摘要，格式建議：
   - `attack`：`<attackerId> 出【<cardLabel>】命中 <targetId>，造成 <finalDamage> 傷害`；`miss:true` 時改為 `…攻擊 <targetId>，但落空`；`block>0` 時可附 `（格擋 <block>）`。
   - `move`：`<playerId> 移動到 (<to.x>,<to.y>)`
   - `defend`：`<playerId> 使用防禦【<cardLabel>】`
   - `buy`：`<playerId> 解封商店卡【<shopCardId>】`
   - `recover`：`<playerId> 回復`
   - `combo`：`<playerId> 觸發 combo【<comboId>】`
   - `counter`：`<playerId> 反擊`
   - `regen`：`<playerId> 回復 <amount> MP`
   - `draw`：`<playerId> 抽 <count> 張`
   - `eliminate`：`<playerId> 被淘汰`
   - `reveal` / `round` / `facing`：唔列（太多噪音），或 `reveal` 省略。
   - `<cardLabel>` 可直接重用現有 `label(cardId)`（line 40，取 id 最後一段）。
   - 玩家顯示名用 `players.find(p => p.id === <id>)` 的 `characterName`（若搵到）；搵唔到時退回 `playerId`。
4. DOM：建立 `el("div", { class: "resolve-actions" })`，內含標題 `el("div", { class: "resolve-actions-title", text: "本回合行動摘要" })`，再逐行 `el("div", { class: "resolve-action", text: line })`。`events` 為空時唔顯示此區塊。

### 新增 CSS（`client/styles.css`）
喺 `.resolve-summary` 相關區域附近新增：
```css
.resolve-actions {
  margin-bottom: 10px;
  text-align: left;
}
.resolve-actions-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.resolve-action {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}
```
- 若 action 行數多，可加 `max-height` + `overflow-y: auto` 防止 overlay 過長遮屏（建議 `max-height: 30vh; overflow-y: auto;`）。

### 驗證（任務 12）
- 啟動正式 UI `npm run client`，開始對戰並結算一回合：
  - 動畫播放完成後，overlay 顯示「第 N 回合結算」，其下先係「本回合行動摘要」逐行，再係每玩家 HP/MP。
  - 摘要內容同畫面動畫一致（例如玩家移動後，摘要有「移動到 (x,y)」；攻擊命中後有對應行）。
  - 無事件／事件為空時唔顯示摘要區塊。
  - 觸發 counter / combo / 淘汰（多人對戰）時對應行正確。
- 語法檢查：`resolveAnimation.js` copy 做 temp `.mjs`，`node --check`。

---

## 風險／注意
- `.hand-fan .card:hover` 的 `transform` 同時含 rotate + translateY + scale，改動需保留其他兩項，只改 scale 部分（用 `calc`）。
- `showSummary` 依賴 `events`；`playResolveAnimation` 由 `client/app.js` 呼叫（傳入 `{ round, players, events }`），確認呼叫端已傳 `events`（Phase P2 已接入，`match:round` 帶 events）。唔使改 app.js。
- 純前端改動，`npx jest --runInBand` 應維持全綠（唔受影響）；為保險可跑一次確認無誤。

## 影響檔案
- `client/styles.css`（任務 11 hover scale + 任務 12 summary CSS）
- `client/views/resolveAnimation.js`（任務 12：showSummary 加行動摘要）
- 可選：`client/layout.js`（任務 11，僅當決定加 `.is-picked`；預設唔改）

## 測試方法
- 無前端單元測試基建（tests/ 只有 Node 後端測試，唔覆蓋 styles/layout/resolveAnimation）。
- 驗收以 browser 實測 + 前端 JS `node --check` 語法檢查為準（見各任務驗證段）。
