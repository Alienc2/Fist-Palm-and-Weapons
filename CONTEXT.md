# CONTEXT.md

---
project_name: Fist Palm and Weapons
version: V7
authoritative_status: active
updated_at_hkt: 2026-07-16 18:08
target_stack: Node.js / CommonJS / npm / Jest / csvtojson / Chrome / VS Code / Windows 11
---

## 1. 程式基本資料
- 名稱：Fist Palm and Weapons
- 版本：V7
- 更新日期時間：2026-07-16 18:08 HKT
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

### 已驗證結果
- `npm run build:data` 通過
- `npm run test:rules` 通過
- Test Suites: 5 passed, 5 total
- Tests: 57 passed, 57 total
- browser sandbox 已成功運行 3 個 scenario

### LOCKED 項目（改動前先確認）
以下項目後續更新時不能隨意改，需先跟你確認：
- `docs/GAME_SPEC.md` 的核心規則定義
- Rules API Contract 的 selection item / resolver signature / extra payload 格式
- `generated/*.json` 作為資料來源的單一事實來源
- `server/game/debug/browser-debug-server.js` 的 `/api/run-scenario` contract
- `browser-sandbox.js` 只透過 API adapter 呼叫 scenario，不直接 import engine
- move log expectation 以 `initial position + extra.dx + extra.dy` 推導
- `browser-engine-adapter.js` 只可作 legacy / reference，不可重回主流程

## 5. 當前優先完成的程式碼
### P0
- 為 `POST /api/run-scenario` 補 smoke / integration test
- 驗證 valid scenario / unknown scenario / invalid body / engine error 的回應碼
- 確保 browser sandbox 對 API error 與 real engine result 的顯示一致

### P1
- Phase B 收口：starter deck、validator、data initialization edge-case tests
- `keywords` / `combos` / `ai_profiles` loader 接口整理

## 6. 下一個需要完成的程式碼
- shopResolver / buy / MP / stock 正式流程
- stackResolver 正式化
- comboResolver
- targeting 與 retargeting 正式化
- elimination 正式化
- characters passive 接入

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
- `server/game/rules/turnEngine.js`：回合結算流程

### Debug / Sandbox 層
- `server/game/debug/browser-sandbox.html`：browser debug sandbox UI
- `server/game/debug/browser-sandbox.js`：sandbox UI 行為與 result render
- `server/game/debug/browser-api-adapter.js`：browser → debug API 的 HTTP adapter
- `server/game/debug/browser-debug-server.js`：debug API server / real engine runner
- `server/game/debug/scenarios.js`：scenario 資料 re-export / 共用入口

### 測試層
- `tests/rules/gameEngine.test.js`：核心 rules 單元測試
- `tests/rules/cardLoader.test.js`：資料載入測試

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
- browser / server / CLI 必須共用同一份 scenario 概念
- `server/game/debug/scenarios.js` 只可作 re-export / 包裝
- scenario 名稱要與 `move-vs-defense`、`attack-vs-attack`、`buy-vs-idle` 對齊

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
- `hydrateSelection(state, scenarioSelection)`：server side 由現有 state 或 generated cards 補回 card 物件
- `readJsonBody(req)`：debug server 讀 request body 時必須驗證 JSON 與 size limit
- `renderResult(result)`：browser sandbox 顯示 initial / p1 / p2 / final / log / error
- `setStatus(type, text)`：browser sandbox 狀態統一顯示

### 不可自行改動的固定習慣
- move log expectation 一律由起始座標與 `dx / dy` 推導
- browser 端不直接 import CommonJS engine
- real engine 只可經 debug server API 呼叫
- generated data 變更後，先 rebuild 再驗證

## 10. 更新規則
- 每次更新只改變：版本、更新日期時間、完成項目、優先事項、下一步、測試結果、檔案樹說明。
- 任何 LOCKED 項目要改動前，先同使用者確認。
- 若規格改動，先改 `docs/GAME_SPEC.md`，再改 test，再改 code。
- 重大 slice 完成後，更新 `CODEX_HANDOFF.md` 同本文件。
- 保持相同 heading 編號與順序，避免未來自動化或人工 review 時格式漂移。
