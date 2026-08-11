# P2 — 觸控舒適度 + 動畫系統

## 目標
放大主要按鈕至 ≥44px 觸控區、手牌保留扇形但加橫向掃，並建立 server 結構化回合事件流驅動前端咭牌／token 動畫。

## 背景（與任務描述嘅落差）
任務描述引用咗呢個專案唔存在嘅檔案／類別／函數，已核對現有實作：

- 按鈕類別：`.primary-button` / `.secondary-button` / `.mini-button` / `.facing-option` / `.target-option`（`styles.css:110-142`）。現 padding `8px 14px`，mini `4px 8px`。唔係 `.btn` / `.action-btn`。
- 手牌：`.hand-fan`（`styles.css:435`）係「置中扇形」，卡寬 `180px`。唔係 `.hand-container`，亦唔係 `overflow-x:auto`。
- 冇 `BattleView.js`：實際係 `client/views/resolveAnimation.js`，只有 `playResolveAnimation()`（1.2s HP/MP 摘要 overlay）。冇 `resolveRound` / `resolveCardEffect`。
- `boardView.js` 冇 `moveToken` / `attackToken` / `defendToken` / `comboToken` / `missToken`。`renderBoard` 每次 `setState` 都 `clear()` 重建，冇可動畫嘅 persistent token 節點。
- 根本原因：server `/api/play`（`client/server.js:370`）一次過 resolve 成個回合，淨係回傳最終 serialize 後 state + 純文字 `state.log`。冇 machine-readable 回合事件流。

## 已確認決策
1. 動畫子系統：**加 server 結構化事件流（完整）**。
2. 手牌：**保留扇形 + 加橫向掃**（唔推翻 I-02-H 設計）。
3. 按鈕範圍：**主按鈕 ≥44px 高、mini ≥36px 高**。

---

## 任務 0：server 回合事件流（基礎，先做）

### 0.1 事件 schema
喺 `state.events`（array）寫入以下結構化事件（首碼 `type` 固定）：

```js
{ type: "round", round }
{ type: "regen", playerId, amount, mp }
{ type: "draw", playerId, count }
{ type: "reveal", playerId, cardId, cardType }      // 打出/揭牌（飛向中央）
{ type: "move", playerId, from:{x,y}, to:{x,y}, cardId }
{ type: "attack", attackerId, targetId, cardId, damage, block, finalDamage, miss, combo }
{ type: "defend", playerId, cardId }
{ type: "buy", playerId, cardId, shopCardId }
{ type: "recover", playerId, cardId, hp, mp }
{ type: "counter", defenderId, cardId, success, reflectedDamage }
{ type: "combo", playerId, comboId }
{ type: "facing", playerId, from, to }
{ type: "eliminate", playerId }
```

### 0.2 修改點
- `server/game/state/createInitialState.js`：加 `events: []`。
- `server/game/rules/turnEngine.js`：`resolveTurn` 開始時重置 `state.events = []`；`startRound` / `drawPhase` emit `round` / `regen` / `draw`；`resolveCardByType` 每次揭牌 emit `reveal`；`applyFacingChange` 後 emit `facing`；`resolveEliminations` 後 emit `eliminate`。
- `server/game/rules/cardResolver.js`：加 `emit(state, ev)` helper（push 到 `state.events`）。喺 `resolveAttack`（每個 target 一個 `attack` 事件，含 `miss` 當距離唔符／`finalDamage===0` 標 block 清到零）、`resolveDefense`（`defend`）、`resolveMove`（`move`，記 from/to）、`resolveBuy`（`buy`）、`resolveRecover`（`recover`）、`resolveCounter`（`counter`）各自 emit。combo 喺 `comboResolver.js` emit `combo`。
- `server/game/gameEngine.js`：加 helper `takeEvents(state)` 回傳並清空 `state.events`（避免每個 turn 之間累積／payload 膨脹）。

### 0.3 表面化
- `client/server.js` `/api/play`（line 381）：回傳 `{ ok, state, events: takeEvents(matchState) }`。
- `client/gameStore.js` `playTurn()`（line 131）：讀取 `data.events`，暫存於 `this.lastEvents` 並 `notify()`。
- 線上：`server/network/matchManager.js` `resolveTurn`（line 114 `onRoundComplete`）加 `events`；`server/network/socketServer.js` line 77 `match:round` payload 加 `events: state.events`。
- `client/socketClient.js` / `client/app.js` `bindSocketEvents`：加 `match:round` handler，用收到嘅 `events` 播動畫（local 用 `playTurn` 返回嘅 events）。

### 0.4 測試（test-first）
- 新 `tests/rules/eventStream.test.js`：用受控 scenario（move → 冇 block 攻擊命中 → 有 block 攻擊 → defend → counter → combo），`playOneTurn` 後斷言 `state.events` 包含對應 `type` 與關鍵欄位。
- 更新 `tests/rules/createInitialState.test.js`：斷言 `state.events` 係 array。
- 確認現有 resolver 測試唔因加 events 而壞。

---

## 任務 11：放大主要按鈕至 ≥44px
- `client/styles.css` `.primary-button, .secondary-button, .facing-option, .target-option`（line 110-121）：padding 改 `14px 22px`、font-size 改 `15px`，確保高度 ≥44px（可加 `min-height: 44px`）。
- `.mini-button`（line 137-141）：`min-height: 36px`、padding 改 `8px 12px`、font-size 改 `12px`，保持緊湊但可點。
- 驗證：肉眼／DevTools 檢查 topbar、結算、開始對戰、結算回合、解封、朝向、目標按鈕觸控區。

## 任務 12：手牌保留扇形＋加橫向掃
- `.hand-fan`（`styles.css:435`）：改為可用滑鼠／觸控橫向掃 — `overflow-x: auto; justify-content: flex-start;`（或保留 `center` 但加 scroll），卡寬由 `180px` 改為 `clamp(120px, 18vw, 160px)`，高按比例（約 `width*1.4`）。`hand-fan .card` 改用新尺寸。
- 確保最小可點寬高 ≥44px、唔遮棋盤（維持現有 `.app-shell` / `.hand-panel` 高度預留）。
- `client/views/handView.js`：確認扇形角度 / `--fan-index` 計算喺可捲動 container 下仍正常；hover 升高保留。
- 驗證：8 張手牌可橫向滑動、卡面完整、冇遮擋棋盤、扇形視覺保留。

## 任務 13：咭牌飛向中央動畫（reveal）
- `client/views/resolveAnimation.js`：`playResolveAnimation({ round, players, events })`。
- 每個 `reveal` 事件：由手牌位置（畫面下方）spawn 一張卡，CSS transition/animation 飛向棋盤中央，完結後 fade。
- 順序執行（await 每步），全部事件播完先出最終 HP/MP 摘要 overlay（保留現有結尾）。
- 驗證：連續 reveal 依序飛向中央、流暢冇卡頓。

## 任務 14：Token 移動動畫
- `client/views/boardView.js`：加 module-level `tokenCache = new Map()`（playerId → 節點）同 `lastPositions`。
- `renderBoard`：若 cache 有該 player 節點且位置改變 → 重用節點，加 CSS transition 移去新格，transitionend 後清 transition；位置冇變 → 重用；新 player → 建立。新對戰／`reset` 時清 `tokenCache`。
- 加 `getTokenEl(playerId)` 供任務 15/16 用。
- `client/styles.css`：token 用 absolute/grid 定位 + `transition: transform 0.35s ease`。
- 驗證：move 事件後 token 由原格平滑移到新格。

## 任務 15：Token 攻擊動畫
- `boardView.js`：加 `playTokenAction(playerId, action)`（action ∈ attack/defend/combo/miss）：喺對應 token 元素加 `token-anim-<action>` class，`animationend` 後移除。
- 每個 `attack` 事件 → 對 attacker 播 `tokenAttack`；非 miss 時同時對 target 播受擊（可共用 `tokenMiss` 或 `tokenHit`）。
- `client/styles.css`：`@keyframes tokenAttack` — 向後 1/3 格 → 向前至目標前（transform translate 兩段）。token 位置用 grid，向「前」方向由 facing 決定。
- 驗證：攻擊動作流暢、方向正確。

## 任務 16：Token 防禦／連擊／Miss 動畫
- `boardView.js`：`defend` 事件 → `tokenDefend`；`combo` 事件 → `tokenCombo`；`attack` 且 `miss`／`finalDamage===0` → `tokenMiss`。
- `client/styles.css`：`@keyframes tokenDefend`（護盾脈衝）、`@keyframes tokenCombo`（閃光/旋轉）、`@keyframes tokenMiss`（閃動/抖動）。
- 驗證：各動作動畫正確觸發並還原。

## 任務 17：咭牌飛向目標動畫（attack）
- `resolveAnimation.js`：每個 `attack` 事件由棋盤週邊（attacker 方向）spawn 卡，縮小並飛向 target token 位置；命中時顯示傷害數字 popup（`-N`）。
- 與任務 13 共用 spawn 卡 helper，事件順序執行。
- 驗證：卡縮小飛向目標正確、傷害數字顯示、冇卡頓。

---

## 順序依賴
0（server event stream + test）→ 11 → 12（純 CSS，可平行）→ 13 → 17 → 14 → 15 → 16。13/17 依賴 0；14/15/16 依賴 0 同 14 嘅 token 持久化基建。

## 驗證
- `npm run build:data`（若 generated 有改）。
- `npm run test:rules`（含新 `eventStream.test.js`）。
- `npx jest --runInBand` 全套（已知 `socketServer.e2e` / `stress` 係既有環境失敗，與今次改動無關）。
- 前端 JS 語法檢查：`node --input-type=module --check`（非 ASCII 用 temp `.mjs` copy）。
- `npm run client` 手動 smoke：局部（AI 對戰）同多人（lobby）各一回合，確認按鈕觸控、手牌掃動、咭牌飛向中央/目標、token 移動/攻擊/防禦/連擊/Miss 動畫。

## 風險
- 動畫時序同 server 事件順序必須一致；事件亂序會令動畫錯位 → 用受控 scenario 測試鎖定順序。
- `renderBoard` 全重建 vs token cache 混用易出 stale 節點 → reset/新對戰必須清 cache。
- 動畫加入唔可拖慢 `/api/play` 主流程；動畫純 client，server 只加 events 生成。
- 連續多卡（交錯揭牌）動畫要排隊，避免同時 spawn 過多 → 用順序 queue + 簡短每步時間。

## 交接狀態
- CODEX_HANDOFF.md 是否已更新：未（實作後更新）
- 本次修改檔案：實作後填
- 測試結果：待實作
- 目前風險：見上
- 下一個最安全任務：任務 0（server event stream + `eventStream.test.js`）
