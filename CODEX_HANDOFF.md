# CODEX_HANDOFF.md V6

## 專案名稱
Fist Palm and Weapons

## 目前狀態
專案目前已完成：
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

目前最新驗證結果（2026-07-16）：
- `npm run build:data` 通過 [1]
- `npm run test:rules` 通過 [1]
- Test Suites: 5 passed, 5 total [1]
- Tests: 57 passed, 57 total [1]
- browser sandbox 已成功運行 3 個 scenario，並已從 stub / direct adapter 過渡到 debug API 路線 [1][2]

## 當前階段
Phase B：資料正式接入 engine  
Phase C：規則 contract 收口與 debug runner  
Phase D（早期）：本地 browser debug sandbox（單回合、server-api-real-engine）

狀態：Phase B checkpoint 1 已通過驗證，single-turn CLI runner 與 browser sandbox 已能對齊基本 scenario。SLICE-40E 已將 browser sandbox 主流程收口為「browser → debug API → Node server → real game engine」，不再依賴 browser direct import CommonJS engine。[1][2]

## 今次完成內容

### 1. Phase A 已完成的 rules correctness
已完成並有測試保護：
- 曼哈頓距離
- facing front / side / back 修正
- 攻擊命中時的防禦殘留
- 距離不符時不觸發防禦殘留
- move 合法 / 非法步數
- buy 基本 log
- advanced edge KO
- counter deterministic success rate
- advantage 真正依 defender / revealed subtype 生效
- resolveTurn 多張牌交錯揭牌順序

### 2. Phase B 已完成的資料接入
已建立：
- `shared/cardLoader.js`
- `tests/rules/cardLoader.test.js`

已接入：
- `generated/cards.json`
- `generated/characters.json`
- `generated/keywords.json`
- `generated/ai_profiles.json`
- `generated/combos.json`

已完成：
- card / character 最小 validator
- 由 generated data 建立 starter deck
- `createInitialState()` 由角色資料初始化 HP / MP / 手牌數
- 將 hardcoded prototype deck 逐步過渡為 data-driven initialization
- generated data 已重新納入版本控制，避免交接環境缺檔 [1][2]

### 3. Phase C / SLICE-36 合約收口
已將 rules layer consolidate 成單一 internal payload contract：

- Authoritative selection item：
  ```js
  {
    card: { ...cardData },
    extra: { ...optionalInputs }
  }
  ```
- Authoritative resolver signature：
  ```js
  resolver(state, player, card, extra)
  ```

Current resolver usage：
- `resolveAttack(state, attacker, card, extra = {}, incomingDeclaredTargetSet = null)`
- `resolveDefense(state, player, card, extra = {})`
- `resolveMove(state, player, card, extra = {})`
- `resolveBuy(state, player, card, extra = {})`

Authoritative extra payloads：
- Attack：
  ```js
  {
    preferredTargetId?: string,
    retargetInstruction?: { toTargetId: string }
  }
  ```
- Move：
  ```js
  { dx: number, dy: number }
  ```
- Buy：
  ```js
  { shopCardId: string }
  ```
- Defense：
  ```js
  {}
  ```

Deprecated payload shapes（不要再用）：
- `moveDecision`
- `retargetToId`
- `selectedShopCardId`
- `to.x / to.y` for move
- `card.extra`
- resolver-specific ad hoc payload shapes [1][2]

### 4. SLICE-37 / 38 單回合 CLI debug runner
- `scripts/run-single-turn.js` 建立 single-turn debug entrypoint
- 支援 scenarios：
  - `move-vs-defense`
  - `attack-vs-attack`
  - `buy-vs-idle`
- CLI workflow：
  1. `node .\scripts\build-data.js`
  2. `node .\scripts\run-single-turn.js <scenario>`
  3. 或使用 npm script：`npm run debug:turn:*`
- browser sandbox 與 CLI runner 目前都以同一組 scenario 概念對照 rules 行為 [1][2]

### 5. SLICE-40C Browser sandbox（API-only adapter 收口）
新建立：
- `server/game/debug/browser-sandbox.html`
- `server/game/debug/browser-sandbox.js`
- `server/game/debug/browser-api-adapter.js`
- `server/game/debug/scenarios.js`
- `server/game/debug/browser-debug-server.js`

設計意圖：
- 使用 API-only adapter：
  - `GET /api/health` → `fetchHealth()`
  - `GET /api/scenarios` → `fetchScenarios()`
- sandbox 頁面顯示：
  - initial state snapshot
  - P1 / P2 selection
  - final state snapshot
  - log / error 區塊
- 路徑收口：
  - browser 入口：`http://localhost:<port>/server/game/debug/browser-sandbox.html`
  - static root：`server/game/debug/*`
  - scenarios source：`server/game/debug/scenarios.js` [1][2]

### 6. SLICE-40D real-engine adapter 錯誤確認
- 曾新增 / 保留 `server/game/debug/browser-engine-adapter.js`，嘗試在 browser 端 dynamic import `../gameEngine.js`。
- 已實測 browser direct import CommonJS engine 會出現 `ReferenceError: require is not defined`。
- `browser-sandbox.js` 一度以 stub fallback 防止 UI 卡死，並於 error 區顯示 adapter 錯誤。
- 此 slice 的主要價值係確認 direct browser import 現有 CommonJS engine 並不可行，後續正式路線應改由 Node debug server 代跑 engine。[1][2]

### 7. SLICE-40E Browser sandbox via debug API（authoritative）
已完成的正式收口方向：
- `server/game/debug/browser-api-adapter.js` 新增 `runScenario(scenarioName)`。
- browser 改以 `POST /api/run-scenario`、`Content-Type: application/json`、body `{ "scenarioName": "..." }` 呼叫 debug server。
- `server/game/debug/browser-sandbox.js` 移除 direct engine adapter import，改為只經 API adapter 呼叫 `runScenario()`。
- `handleRun()` 先跑 API；成功時 render real engine result，並顯示 `Adapter mode: server-api-real-engine`。
- API 出錯時，才 fallback 到 `runScenarioStub(scenario)`，並顯示 `Adapter mode: stub (api-error)`。
- `init()` 移除 `getAdapterStatus()` 額外檢查，只保留 health / scenarios API 初始化，避免 page load 時再次觸發 direct engine import。
- `server/game/debug/browser-debug-server.js` 已補 `POST /api/run-scenario` endpoint，令 browser API call 可以在 server side 用 real game engine 跑 scenario，再回傳 sandbox 需要的 result shape。[1]

### 8. 共用 scenario source 與 server-side runner
已完成：
- 新增共用 scenario JSON 資料檔，將 `move-vs-defense`、`attack-vs-attack`、`buy-vs-idle` payload 拆出，方便 CommonJS server 直接讀取同一份資料。
- 瀏覽器端 `scenarios.js` 改為 re-export 共用 scenario data。
- debug server 直接 `require` 真實 game engine、共用 scenario data、`generated/cards.json`，不再用 `vm` 轉換 ES module scenario source。
- 已實作 `hydrateSelection(state, scenarioSelection)`：先由現有 match state 的 player `hand` / `deck` / `discard` / `shop` 搵 card；若找不到，會 fallback 到 `generated/cards.json`。
- 已實作真實 engine scenario runner：建立 match、保留 `initialState`、提交 P1 / P2 selection、執行 `playOneTurn(state)`，再回傳指定 JSON shape。[1]

### 9. `/api/run-scenario` contract
成功 response shape：
```json
{
  "ok": true,
  "adapterMode": "server-api-real-engine",
  "scenario": { "name": "move-vs-defense", "description": "..." },
  "initialState": { "...": "..." },
  "p1Selection": [ ... ],
  "p2Selection": [ ... ],
  "finalState": { "...": "..." },
  "log": [ "..." ],
  "error": null
}
```

錯誤行為：
- invalid JSON / payload format → `400`
- unknown scenario → `404`
- engine runtime error → `500`

另已補 `readJsonBody(req)` helper，帶 body size 限制，驗證 request body 必須係 `{ "scenarioName": "move-vs-defense" }` 呢類格式。[1]

### 10. Git checkpoints
已記錄的最新相關 git checkpoint：
- `737b1b1`：補回 `generated/*.json`，修復 generated data 版本控制 [1]
- `3fcfb74`：`Add real-engine scenario API route` [1]
- `4baded7`：`Route browser sandbox scenarios through debug API` [1]

### 11. 已修正問題
- debug server 原本用錯 `ROOT_DIR` / `debug` 路徑，現已統一指向 repo root + `server/game/debug`。[2]
- browser sandbox 曾誤導成優先 real engine adapter；現已正式收口為 debug API 主流程。[1][2]
- browser direct import CommonJS engine 導致 `require is not defined`，現已以 server-side engine route 取代。[1]

## 目前測試覆蓋
- `npm run build:data` → 通過 [1]
- `npm run test:rules` → 5 suites, 57 tests 全部通過 [1]
- CLI debug runner scenarios 已手動驗證 [1][2]
- browser sandbox 已成功運行 3 個 scenario [1]
- browser sandbox 已切換為 debug API 跑 real engine，再由 UI render 結果 [1]

## 建議下一步（最安全順序）

### 1. 先補 `POST /api/run-scenario` 測試
- 補最少 integration / smoke test：
  - valid scenario → `200`
  - unknown scenario → `404`
  - invalid body → `400`
- 測試要在 VS Code PowerShell 可重現，避免只靠手動 browser 點擊驗證。[1]

### 2. 將 browser sandbox 文件正式對齊新架構
- `CONTEXT.md` 標記 Browser Debug Sandbox architecture 已改成 `server-api-real-engine`。
- 明文標示 `browser-engine-adapter.js` 屬 legacy / deprecated experiment，不再作主流程。
- 明文標示 shared scenario JSON 為 single source of truth。[1]

### 3. 回到 Phase B / Phase C 主線
- starter deck 組裝規則
- validator 覆蓋
- data initialization edge-case tests
- `keywords` / `combos` / `ai_profiles` loader 接口
- shopResolver / stackResolver / comboResolver
- targeting / elimination / passive 收口 [1][2]

### 4. 之後再進 Phase D 正式 UI
- Socket.IO room / match lifecycle
- board / hand / log UI（正式遊戲界面，而唔係 debug sandbox）
- online 2P / 3P / 4P
- AI [1][2]facing picker
- resolve animation

#### Phase F：AI 與部署
- `ai_profiles` 接入
- AI decision making
- local run scripts
- integration / e2e tests
- deployment flow

## 工作規則
- 規則或資料模型有重大改動前，先對照 `docs/GAME_SPEC.md`
- 重要修改先補測試，再補功能
- 每完成重要 slice，更新 `CODEX_HANDOFF.md` 與 `CONTEXT.md`
- 若規格要改，先改 spec，再改 test，再改 code [1]

## Rules API Contract (authoritative)

### Selection item
All player selections must use:

```js
{
  card: { ...cardData },
  extra: { ...optionalInputs }
}
```

### Resolver signatures
All card resolvers use:

```js
resolver(state, player, card, extra)
```

Current signatures:
- resolveAttack(state, attacker, card, extra = {}, incomingDeclaredTargetSet = null)
- resolveDefense(state, player, card, extra = {})
- resolveMove(state, player, card, extra = {})
- resolveBuy(state, player, card, extra = {}) [1][2]

### extra payloads
#### Attack
```js
{
  preferredTargetId?: string,
  retargetInstruction?: {
    toTargetId: string
  }
}
```

#### Move
```js
{
  dx: number,
  dy: number
}
```

#### Buy
```js
{
  shopCardId: string
}
```

#### Defense
```js
{}
```

### Deprecated payload shapes
Do not use:
- retargetToId
- moveDecision
- moveDecision.dx / moveDecision.dy
- selectedShopCardId
- to.x / to.y for move
- card.extra
- resolver-specific ad hoc payload shapes [1][2]

### Stack boundary
Currently only:
- attack
- counter

go through stackResolver.

Currently these resolve immediately:
- defense
- move
- buy [1][2]

### Test expectation note
For move-related logs, expected coordinates must be derived from:
- initial position
- extra.dx
- extra.dy

Do not hardcode legacy coordinates copied from pre-consolidation payloads.[1]

## FIX-36 contract consolidation (2026-07-14)

Rules layer has been consolidated to a single internal payload contract.

### Authoritative selection item
```js
{
  card: { ...cardData },
  extra: { ...optionalInputs }
}
```

### Authoritative resolver signature
```js
resolver(state, player, card, extra)
```

Current resolver usage:
- resolveAttack(state, attacker, card, extra = {}, incomingDeclaredTargetSet = null)
- resolveDefense(state, player, card, extra = {})
- resolveMove(state, player, card, extra = {})
- resolveBuy(state, player, card, extra = {})

### Authoritative extra payloads
#### Attack
```js
{
  preferredTargetId?: string,
  retargetInstruction?: {
    toTargetId: string
  }
}
```

#### Move
```js
{
  dx: number,
  dy: number
}
```

#### Buy
```js
{
  shopCardId: string
}
```

#### Defense
```js
{}
```

### Deprecated payload shapes
Do not use:
- moveDecision
- retargetToId
- selectedShopCardId
- to.x / to.y for move
- card.extra
- resolver-specific ad hoc payload shapes

### Stack boundary
Currently these go through stackResolver:
- attack
- counter

Currently these resolve immediately:
- defense
- move
- buy

### Validation
Verified by:
- `npx jest --runInBand tests/rules/gameEngine.test.js -t "move 規則"`
- `npx jest --runInBand tests/rules/gameEngine.test.js -t "resolveTurn 交錯揭牌順序"`
- `npm run test:rules`

Result:
- 5 / 5 suites passed
- 57 / 57 tests passed [1]