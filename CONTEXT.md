# CONTEXT.md V15

---
## 1. 程式基本資料
- 名稱：Fist Palm and Weapons
- 版本：V15
- 更新日期時間：2026-08-08 00:05 HKT



- 使用技術：Node.js、CommonJS、npm、Jest、csvtojson、Chrome、VS Code、Windows 11
- 專案型態：回合制卡牌 / 角色對戰遊戲
- 文件目的：作為可頻繁更新的單一事實來源，確保規格、檔案、API、固定程式碼同格式長期一致

## 2. 目錄
1. 程式基本資料
2. 目錄
3. 程式目標
4. 已完成項目 / LOCKED 項目
5. 當前優先完成的程式碼
6. 下一個需要完成的程式碼
7. 主要檔案樹及功能
8. 共用 API 規格
9. 固定使用的程式碼
10. 更新規則

## 3. 程式目標
- 先固定核心戰鬥規則，再擴展商店、combo、角色被動、多人同步、正式 UI、AI。
- 所有規則邏輯以測試先行，確保 move、attack、defense、buy、counter、targeting、elimination 的結果可重現。
- 資料以 CSV → generated JSON 的方式驅動，避免 hardcode 散落。
- browser debug sandbox 只作 rules / scenario 驗證，不作正式遊戲 UI。
- browser 端只透過 debug API 觸發 server-side real engine，避免 browser 直接 import CommonJS engine。

## 4. 已完成項目 / LOCKED 項目
### 已完成項目
- `docs/GAME_SPEC.md`
- `data/*.csv` 資料骨架
- `scripts/build-data.js` 的 CSV → JSON build 流程
- 純 rules engine prototype
- `shared/cardLoader.js`
- data-driven `createInitialState()`
- rules / loader 單元測試
- 單一回合 debug runner（CLI）
- browser debug sandbox（server API 跑 real engine）
- `generated/*.json` 已納入版本控制
- `shopResolver` 正式化（SLICE-C-01）
- `stackResolver` 正式化（SLICE-C-02）
- `recover` 卡 resolver 正式化（SLICE-C-03）
- `facingChange` 轉向規則正式化（SLICE-C-04）
- `counterChain` 反擊連鎖完整化（SLICE-C-05）
- `targetPriority` 多目標自動規則正式化（SLICE-D-01）
- `comboResolver` 正式化（SLICE-D-02）
- `passiveResolver` characters passive 接入（SLICE-D-03）
- 多人引擎擴充（SLICE-D-04）
- Phase E 正式 UI 骨架（SLICE-E-01：client server 靜態 + 遊戲 API、index.html、gameStore、layout、app、styles）
- Phase E 正式 UI 視圖（SLICE-E-02：board / hand / selected / log / shop / target / facing / resolve / result）
- `tests/rules/shopResolver.test.js`
- `tests/rules/stackResolver.test.js`
- `tests/rules/recoverResolver.test.js`
- `tests/rules/facingChangeResolver.test.js`
- `tests/rules/counterChainResolver.test.js`
- `tests/rules/targetPriorityResolver.test.js`
- `tests/rules/comboResolver.test.js`
- `tests/rules/passiveResolver.test.js`
- `tests/rules/multiplayerEngine.test.js`
- Phase F AI 與部署（SLICE-F-01：`ai_profiles` 接入 + AI decision + local run scripts + integration / e2e tests + deployment flow）
- `server/game/ai/aiDecision.js`：AI decision making（依 profile 權重選牌 / 目標 / 移動 / 購買）
- `server/game/ai/aiMatch.js`：AI 對戰 runner（autoSelectAiPlayers / runAiMatch）
- `scripts/run-ai-match.js`：AI 對戰 CLI runner
- `tests/ai/aiDecision.test.js`：AI decision 單元測試
- `tests/ai/aiMatch.e2e.test.js`：AI 對戰 integration / e2e 測試
- `Dockerfile` / `docker-compose.yml`：部署映像與容器
- `docs/DEPLOYMENT.md`：部署流程文件

### 已驗證結果
- `npm run build:data` 通過
- `npm run test:rules` 通過
- `npm run test:ai` 通過
- 全套 `npx jest --runInBand`：`Test Suites: 21 passed, 21 total`
- `Tests: 183 passed, 183 total`
- `tests/ai/aiDecision.test.js`：通過
- `tests/ai/aiMatch.e2e.test.js`：通過
- `node scripts/run-ai-match.js --rounds 5` 通過
- `tests/rules/recoverResolver.test.js`：9 passed, 9 total
- `tests/rules/facingChangeResolver.test.js`：10 passed, 10 total
- `tests/rules/counterChainResolver.test.js`：14 passed, 14 total
- `tests/rules/cardLoader.test.js`：10 passed, 10 total
- `tests/rules/passiveResolver.test.js`：11 passed, 11 total
- `tests/rules/multiplayerEngine.test.js`：6 passed, 6 total
- `tests/rules/shopResolver.test.js` 通過
- `tests/rules/stackResolver.test.js` 通過
- `tests/rules/targetPriorityResolver.test.js` 通過
- `tests/rules/comboResolver.test.js` 通過



- browser sandbox 已成功運行 3 個 scenario
- `tests/debug/browser-debug-server.test.js` 通過
- `POST /api/run-scenario` smoke / integration test 已驗證：
  - valid scenario → `200`
  - unknown scenario → `404`
  - invalid body → `400`

### LOCKED 項目（改動前先確認）
以下項目後續更新時不能隨意改，需先跟你確認：
- `docs/GAME_SPEC.md` 的核心規則定義
- Rules API Contract 的 selection item / resolver signature / extra payload 格式
- `generated/*.json` 作為資料來源的單一事實來源
- `server/game/debug/browser-debug-server.js` 的 `/api/run-scenario` contract
- `browser-sandbox.js` 只透過 API adapter 呼叫 scenario，不直接 import engine
- move log expectation 以 `initial position + extra.dx + extra.dy` 推導
- `browser-engine-adapter.js` 只可作 legacy / deprecated experiment / reference，不可重回主流程

### Scenario source of truth
shared scenario JSON 係 browser / server / CLI 的 single source of truth。  
`server/game/debug/scenarios.js` 只負責 re-export 或包裝，不應再次手寫另一份 payload。  
任何 scenario payload 改動，必須先改 shared JSON source，再同步驗證 CLI runner、debug API、browser sandbox。

### SLICE-46-3A starter deck 組裝規則
- 已完成 starter deck 組裝規則測試與收口。
- starter deck 依 `Default_Card_Set`、`ALL`、`No_of_Cards_in_Hand` 決定組裝內容。
- 空字串 starter set 視為不使用；`ALL` 視為通用。
- starter deck 為空時必須 fail-fast。
- `tests/rules/createInitialState.starterDeck.test.js` 已納入 rules 測試覆蓋。

## 5. 當前優先完成的程式碼
### P0
- Phase D 已收口：多目標 / combo / passive / 多人引擎正式化。
- Phase E 正式 UI 已完成（SLICE-E-01 骨架 + SLICE-E-02 視圖）。
- Phase F AI 與部署已完成（SLICE-F-01：`ai_profiles` 接入 + AI decision + local run scripts + integration / e2e tests + deployment flow）。
- 全套 `npx jest --runInBand` 已達 `21 suites / 183 tests` 全綠。
- `npm run client` 正式 UI server 已可啟動，`/api/health` 通過。
- `npm run ai:match` AI 對戰 CLI 已可執行。

### P1
- Phase D 多人同步（Socket.IO room / lobby / match）
- Phase E 正式 UI 後續打磨（選牌流程 UX / 動畫 / 商店 / 結果 overlay 細節）

## 6. 下一個需要完成的程式碼
- Phase D 多人同步（online 2P / 3P / 4P）
- Phase E 正式 UI 後續打磨（選牌流程 UX / 動畫 / 商店 / 結果 overlay 細節）
- AI 對戰接入正式 UI（可選 AI 對手）



## 7. 主要檔案樹及每個檔案的主要功能
### 文件
- `docs/GAME_SPEC.md`：正式玩法規格
- `CODEX_HANDOFF.md`：交接狀態與下一步
- `CONTEXT.md`：本文件，專案當前事實與規範

### 資料層
- `data/cards.csv`：卡牌來源資料
- `data/characters.csv`：角色來源資料
- `data/keywords.csv`：關鍵字資料
- `data/ai_profiles.csv`：AI 資料
- `data/combos.csv`：combo 資料
- `generated/cards.json`：生成後卡牌資料
- `generated/characters.json`：生成後角色資料
- `generated/keywords.json`：生成後關鍵字資料
- `generated/ai_profiles.json`：生成後 AI 資料
- `generated/combos.json`：生成後 combo 資料

### 載入層
- `shared/cardLoader.js`：CSV / JSON 資料載入與最小驗證

### 引擎層
- `server/game/gameEngine.js`：遊戲引擎入口
- `server/game/state/createInitialState.js`：初始狀態建立
- `server/game/rules/distance.js`：距離規則
- `server/game/rules/facing.js`：面向修正
- `server/game/rules/advantage.js`：advantage / disadvantage
- `server/game/rules/cardResolver.js`：卡牌 resolver
- `server/game/rules/turnEngine.js`：回合結算流程（N 玩家交錯揭牌）
- `server/game/rules/shopResolver.js`：商店購買 / MP / stock 流程
- `server/game/rules/stackResolver.js`：stack 累積 / 清算流程
- `server/game/rules/facingChangeResolver.js`：轉向規則（免費轉向 1 次）
- `server/game/rules/counterChainResolver.js`：反擊連鎖（距離驗證 / 成功率 / ×2 連鎖）
- `server/game/rules/targetPriorityResolver.js`：多目標自動規則（距離 / 面向 / HP / 隨機）
- `server/game/rules/targetingResolver.js`：目標宣告 / 驗證 / retarget
- `server/game/rules/comboResolver.js`：combo 偵測與效果（sequence / board_pattern / effect）
- `server/game/rules/passiveResolver.js`：角色被動技能查詢與效果（front_damage_bonus / front_defense_bonus / free_facing_change / first_shop_discount）

### AI 層（Phase F）
- `server/game/ai/aiDecision.js`：AI decision making（依 profile 權重選牌 / 目標 / 移動 / 購買）
- `server/game/ai/aiMatch.js`：AI 對戰 runner（autoSelectAiPlayers / runAiMatch）
- `scripts/run-ai-match.js`：AI 對戰 CLI runner

### 部署層（Phase F）
- `Dockerfile`：正式 UI server 映像
- `docker-compose.yml`：一鍵啟動容器
- `docs/DEPLOYMENT.md`：部署流程文件

### Debug / Sandbox 層

- `server/game/debug/browser-sandbox.html`：browser debug sandbox UI
- `server/game/debug/browser-sandbox.js`：sandbox UI 行為與 result render
- `server/game/debug/browser-api-adapter.js`：browser → debug API 的 HTTP adapter
- `server/game/debug/browser-debug-server.js`：debug API server / real engine runner
- `server/game/debug/scenarios.js`：scenario 資料 re-export / 共用入口

### Client 正式 UI 層（Phase E）
- `client/server.js`：正式 UI server（靜態檔案 + 遊戲 API：`/api/health`、`/api/match`、`/api/select`、`/api/play`、`/api/reset`）
- `client/index.html`：正式 UI 入口頁面
- `client/app.js`：正式 UI 主程式（事件綁定 / 選牌流程 / 結算動畫 / 結果 overlay）
- `client/gameStore.js`：前端狀態 store（create / select / play / reset / subscribe）
- `client/layout.js`：DOM helper（el / qs / clear / modal / cardNode）
- `client/styles.css`：正式 UI 樣式（dark / light 主題）
- `client/views/boardView.js`：5×5 地圖 + 角色 token + 朝向
- `client/views/handView.js`：手牌顯示與選牌
- `client/views/selectedCardsView.js`：本回合選牌 / 移除 / 朝向設定
- `client/views/logView.js`：對戰紀錄
- `client/views/shopModal.js`：商店 modal
- `client/views/targetPicker.js`：攻擊目標選擇 modal
- `client/views/facingPicker.js`：朝向選擇 modal
- `client/views/resolveAnimation.js`：回合結算過場動畫
- `client/views/resultOverlay.js`：對戰結果 overlay

### 測試層
- `tests/rules/gameEngine.test.js`：核心 rules 單元測試
- `tests/rules/cardLoader.test.js`：資料載入測試
- `tests/rules/createInitialState.test.js`：初始狀態測試
- `tests/rules/createInitialState.starterDeck.test.js`：starter deck 組裝測試
- `tests/rules/shopResolver.test.js`：商店買入流程測試
- `tests/rules/stackResolver.test.js`：stack 解析測試
- `tests/rules/recoverResolver.test.js`：recover 卡 resolver 測試
- `tests/rules/facingChangeResolver.test.js`：轉向規則測試
- `tests/rules/counterChainResolver.test.js`：反擊連鎖測試
- `tests/rules/targetingResolver.test.js`：targeting 測試
- `tests/rules/eliminationResolver.test.js`：elimination 測試
- `tests/rules/targetPriorityResolver.test.js`：多目標自動規則測試
- `tests/rules/comboResolver.test.js`：combo resolver 測試
- `tests/rules/passiveResolver.test.js`：角色被動技能測試
- `tests/rules/multiplayerEngine.test.js`：多人引擎（3P / 4P）測試



## 8. 各檔案需要共用的 API
### Rules API Contract（authoritative）
#### Selection item
```js
{
  card: { ...cardData },
  extra: { ...optionalInputs }
}
```

#### Resolver signature
```js
resolver(state, player, card, extra)
```

#### Current resolver usage
- `resolveAttack(state, attacker, card, extra = {}, incomingDeclaredTargetSet = null)`
- `resolveDefense(state, player, card, extra = {})`
- `resolveMove(state, player, card, extra = {})`
- `resolveBuy(state, player, card, extra = {})`

#### Attack extra
```js
{
  preferredTargetId?: string,
  retargetInstruction?: { toTargetId: string }
}
```

#### Move extra
```js
{ dx: number, dy: number }
```

#### Buy extra
```js
{ shopCardId: string }
```

#### Defense extra
```js
{}
```

### Debug API Contract
#### GET /api/health
用途：檢查 debug server 是否正常與 port 資訊。

#### GET /api/scenarios
用途：回傳可用 scenario 名單。

#### POST /api/run-scenario
用途：由 server side 用 real engine 跑 scenario，回傳 sandbox 需要嘅 result shape。

Request body：
```json
{ "scenarioName": "move-vs-defense" }
```

Response shape：
```js
{
  ok: true,
  adapterMode: "server-api-real-engine",
  scenario,
  initialState,
  p1Selection,
  p2Selection,
  finalState,
  log,
  error: null
}
```

### Scenario source contract
- browser / server / CLI 必須共用同一份 scenario 概念。
- `server/game/debug/scenarios.js` 只可作 re-export / 包裝。
- scenario 名稱要與 `move-vs-defense`、`attack-vs-attack`、`buy-vs-idle` 對齊。

### AI API Contract（Phase F）
#### `aiDecision.js`
- `decideSelection(state, player, profile, options)`：依 profile 權重選牌，回傳 `[{ card, extra }]`。
- `decideTarget(state, player, profile, options)`：依 profile 權重選目標，回傳 `targetId`。
- `decideMove(state, player, profile, options)`：依 profile 權重選移動，回傳 `{ dx, dy }`。
- `decideBuy(state, player, profile, options)`：依 profile 權重選購買，回傳 `{ shopCardId }`。
- `getProfile(profileId)`：由 `generated/ai_profiles.json` 取得 profile。

#### `aiMatch.js`
- `isAiPlayer(player, aiPlayerIds)`：判斷玩家是否由 AI 控制。
- `autoSelectAiPlayers(state, options)`：為 AI 玩家自動填選牌。
- `runAiMatch(options)`：跑完整 AI 對戰，回傳 `{ state, rounds, roundLog, winner }`。

#### `run-ai-match.js`（CLI）
- `--rounds N`：最大回合數。
- `--players P1:char_attack:ai_normal,P2:char_defense:ai_normal`：指定玩家 / 角色 / AI profile。

## 9. 需要固定使用的程式碼

### Selection item 固定格式
```js
{
  card: { ...cardData },
  extra: { ...optionalInputs }
}
```

### Move 固定格式
```js
{ dx: number, dy: number }
```

### Buy 固定格式
```js
{ shopCardId: string }
```

### Attack 固定格式
```js
{
  preferredTargetId?: string,
  retargetInstruction?: { toTargetId: string }
}
```

### Defense 固定格式
```js
{}
```

### 必用 helper / 行為
- `hydrateSelection(state, scenarioSelection)`：server side 由現有 state 或 generated cards 補回 card 物件。
- `readJsonBody(req)`：debug server 讀 request body 時必須驗證 JSON 與 size limit。
- `renderResult(result)`：browser sandbox 顯示 initial / p1 / p2 / final / log / error。
- `setStatus(type, text)`：browser sandbox 狀態統一顯示。

### 不可自行改動的固定習慣
- move log expectation 一律由起始座標與 `dx / dy` 推導。
- browser 端不直接 import CommonJS engine。
- real engine 只可經 debug server API 呼叫。
- generated data 變更後，先 rebuild 再驗證。

### 主流程
authoritative flow（current production debug path）：

```text
browser-sandbox.js
  -> browser-api-adapter.js
  -> POST /api/run-scenario
  -> browser-debug-server.js
  -> server-side real game engine
  -> JSON result
  -> browser render
```

browser sandbox 現時 authoritative adapter mode 係 `server-api-real-engine`。  

### Legacy / deprecated 路線
以下路線現時不應再作主流程：
- browser direct import `gameEngine.js`
- `browser-engine-adapter.js` 作為 primary adapter
- 在 browser 端直接執行 CommonJS engine

`browser-engine-adapter.js` 現時只應標示為 legacy / deprecated experiment / debugging reference。  
除非另開新 slice、先改 spec、再補 test、最後改 code，否則不可重回主流程。

### SLICE-41 authoritative data contract

#### generated data
以下 generated data 現已列為 authoritative input：
- `generated/cards.json`
- `generated/characters.json`
- `generated/keywords.json`
- `generated/combos.json`
- `generated/ai_profiles.json`

#### loader
`shared/cardLoader.js` 必須負責：
- validation
- normalization
- id lookup
- generated data snapshot

#### state initialization
`server/game/state/createInitialState.js` 必須：
- 只從 authoritative generated data 建立角色、起始手牌、牌庫、商店
- 為每張卡建立 `instanceId` 與 `definitionId`
- 建立 `stack`、`eliminatedPlayers`、`shop.stockByCardId` 等正式欄位

#### build validation
`scripts/build-data.js` build 完後必須即時呼叫 generated data validation；validation 失敗時 build 要直接 fail。

## 10. 更新規則
- 每次更新只改變：版本、更新日期時間、完成項目、優先事項、下一步、測試結果、檔案樹說明。
- 任何 LOCKED 項目要改動前，先同使用者確認。
- 若規格改動，先改 `docs/GAME_SPEC.md`，再改 test，再改 code。
- 重大 slice 完成後，更新 `CODEX_HANDOFF.md` 同本文件。
- 保持相同 heading 編號與順序，避免未來自動化或人工 review 時格式漂移。