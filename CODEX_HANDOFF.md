# CODEX_HANDOFF.md V4

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
- browser debug sandbox（API-only adapter）

目前最新驗證結果：
- `npm run test:rules`
- Test Suites: 5 passed, 5 total
- Tests: 57 passed, 57 total

## 當前階段
Phase B：資料正式接入 engine  
Phase C：規則 contract 收口與 debug runner  
Phase D（早期）：本地 browser debug sandbox（單回合、API-only）

狀態：Phase B checkpoint 1 已通過驗證，single-turn CLI runner 與 browser sandbox 已能對齊基本 scenario。

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

已完成：
- card / character 最小 validator
- 由 generated data 建立 starter deck
- `createInitialState()` 由角色資料初始化 HP / MP / 手牌數
- 將 hardcoded prototype deck 逐步過渡為 data-driven initialization

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
- resolver-specific ad hoc payload shapes

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
- sandbox 頁面只顯示：
  - initial state snapshot
  - P1 / P2 selection
  - final state snapshot（暫時可用 stub 或未連 engine）
  - log / error 區塊
- 今個 slice 不嘗試直接從 browser 連 `gameEngine.js`，real engine adapter 暫時停用，避免多條路線混合。

路徑收口：
- browser 入口：
  - `http://localhost:<port>/server/game/debug/browser-sandbox.html`
- static root：
  - `server/game/debug/*`
- scenarios source：
  - `server/game/debug/scenarios.js`

### 6. 已修正問題
- debug server 原本用錯 `ROOT_DIR` / `debug` 路徑，現已統一指向 repo root + `server/game/debug`。
- browser sandbox Status 文案由「prefer real engine adapter」改為明確說明「API-only adapter」，避免誤導 slice 意圖。

## 目前測試覆蓋
- `npm run test:rules` → 5 suites, 57 tests 全部通過
- CLI debug runner scenarios 已手動驗證
- browser sandbox API health / scenarios 已可正確顯示

## 建議下一步（最安全順序）

### Phase C 後續
- shopResolver / stackResolver / comboResolver 擴規則層
- targeting / elimination / passive 收口

### Phase D：多人與 UI
- Socket.IO room / match lifecycle
- board / hand / log UI（正式遊戲界面，而唔係 debug sandbox）
- online 2P / 3P / 4P
- AI

## 下次工作前建議先讀
1. `CONTEXT.md`
2. `CODEX_HANDOFF.md`
3. `docs/GAME_SPEC.md`
4. `server/game/rules/*.js`
5. `tests/rules/gameEngine.test.js`
6. `server/game/debug/*`（browser sandbox）

## 常用指令
```powershell
node scripts/build-data.js
npm run test:rules
npm run debug:turn:move
npm run debug:browser
```