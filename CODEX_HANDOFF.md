# CODEX_HANDOFF.md V11

## 1. 程式基本資料
- 名稱：Fist Palm and Weapons
- 版本：V11
- 更新日期時間：2026-08-03 18:52 HKT
- 使用技術：Node.js、CommonJS、npm、Jest、csvtojson、Chrome、VS Code、Windows 11
- 程式類型：回合制卡牌 / 角色對戰遊戲
- 文件目的：作為交接、進度、驗證、階段規劃的固定入口，方便後續頻繁更新仍保持同一格式

## 2. 目錄
1. 程式基本資料
2. 目錄
3. 目前專案進度 / 狀態
4. 最新驗證 / 測試結果
5. 當前階段
6. 計劃中的後續 1–10 個階段
7. 與 CONTEXT.md 對齊的檔案樹 / 共用 API / 固定程式碼
8. 更新規則

## 3. 目前專案進度 / 狀態

### 3.1 進度總覽
| 功能 | 主要修改檔案 | 驗證方式 | 是否已完成 |
|---|---|---|---|
| 規格文件與核心玩法定義 | `docs/GAME_SPEC.md` | 人工審閱 | 已完成 |
| CSV → JSON build 流程 | `scripts/build-data.js` | `npm run build:data` | 已完成 |
| 資料載入與驗證 | `shared/cardLoader.js` | `tests/rules/cardLoader.test.js` | 已完成 |
| Phase B：46-3B validator 覆蓋 | `shared/cardLoader.js`、`tests/rules/cardLoader.test.js` | `npx jest --runInBand tests/rules/cardLoader.test.js` | 已完成 |
| 初始狀態建立 | `server/game/state/createInitialState.js` | `npm run test:rules` | 已完成 |
| starter deck 組裝規則（SLICE-46-3A） | `server/game/state/createInitialState.js`、`tests/rules/createInitialState.starterDeck.test.js` | `npx jest --runInBand tests/rules/createInitialState.starterDeck.test.js`、`npm run test:rules` | 已完成 |
| 核心 rules engine | `server/game/rules/*.js` | `tests/rules/gameEngine.test.js` | 已完成 |
| shopResolver 正式化（SLICE-C-01） | `server/game/rules/shopResolver.js`、`tests/rules/shopResolver.test.js` | `npm run test:rules` | 已完成 |
| stackResolver 正式化（SLICE-C-02） | `server/game/rules/stackResolver.js`、`tests/rules/stackResolver.test.js` | `npm run test:rules` | 已完成 |
| 單一回合 CLI debug runner | `scripts/run-single-turn.js` | `npm run debug:turn:*` | 已完成 |
| browser debug sandbox | `server/game/debug/*` | browser 手動驗證 / debug API | 已完成 |
| browser sandbox 改走 debug API 路線 | `server/game/debug/browser-api-adapter.js`、`server/game/debug/browser-debug-server.js`、`server/game/debug/browser-sandbox.js` | browser + server 端驗證 | 已完成 |
| `/api/run-scenario` server-side real engine | `server/game/debug/browser-debug-server.js` | API 回應驗證 | 已完成 |
| generated data 回復版本控制 | `generated/*.json` | repo 檢查 | 已完成 |

### 3.2 已完成但必須鎖定的部份
以下內容後續更新時不能隨意改，改動前要先同使用者確認：
- `docs/GAME_SPEC.md` 的核心規則。
- Rules API Contract。
- `generated/*.json` 作為資料來源的單一事實來源。
- `server/game/debug/browser-debug-server.js` 的 `/api/run-scenario` contract。
- `browser-sandbox.js` 只透過 API adapter 呼叫 scenario，不直接 import engine。
- move log expectation 必須由 `initial position + extra.dx + extra.dy` 推導。
- `browser-engine-adapter.js` 只可作 legacy / deprecated experiment / reference，不可重回主流程。
- shared scenario JSON 必須作為 browser / server / CLI 的 single source of truth。

### 3.3 現階段已完成的內容
- `docs/GAME_SPEC.md`
- `data/*.csv` 資料骨架
- `scripts/build-data.js` 的 CSV → JSON build 流程
- 純 rules engine prototype
- `shared/cardLoader.js`
- data-driven `createInitialState()`
- Phase B：`46-3A starter deck` 已完成
- Phase B：`46-3B validator 覆蓋` 已完成
- `Default_Card_Set` validator 已補齊
- `No_of_Cards_in_Hand` validator 已補齊
- generated data contract 已收緊
- `validateCard` 已重新匯出供單元測試使用
- `normalizeCard()` 已對齊 loader contract，保留 `definitionId`
- starter deck 已按 `Default_Card_Set` / `ALL` / `No_of_Cards_in_Hand` 組裝
- starter deck 空結果已加入 fail-fast 保護
- rules / loader 單元測試
- `tests/rules/createInitialState.starterDeck.test.js`
- `tests/rules/shopResolver.test.js`
- `tests/rules/stackResolver.test.js`
- 單一回合 debug runner（CLI）
- browser debug sandbox（server API 跑 real engine）
- `generated/*.json` 已納入版本控制

### 3.4 現階段重點風險
- browser 端唔可以再直接 import CommonJS engine。
- debug sandbox 必須長期維持 API contract 穩定。
- generated data 一有改動就要 rebuild 再驗證。
- 任何規則 contract 改動都要先更新 `CONTEXT.md` 再改 code。

## 4. 最新驗證 / 測試結果
- `npm run build:data` 通過。
- `npm run test:rules` 通過。
- `tests/rules` 最新總數：`9` suites passed, `78` tests passed。
- `tests/rules/shopResolver.test.js` 通過。
- `tests/rules/stackResolver.test.js` 通過。
- `tests/rules/cardLoader.test.js`：10 passed, 10 total。
- `cardLoader authoritative data contract` 全部通過。
- `cardLoader validator` 全部通過。
- `Default_Card_Set` / `No_of_Cards_in_Hand` validator 測試已覆蓋。
- browser sandbox 已成功運行 3 個 scenario。
- browser sandbox 已切換為 debug API 跑 real engine，再由 UI render 結果。
- CLI debug runner scenarios 已手動驗證。
- `tests/debug/browser-debug-server.test.js` 通過。
- `POST /api/run-scenario` smoke / integration test 已驗證：
  - valid scenario → `200`
  - unknown scenario → `404`
  - invalid body → `400`

## 5. 當前階段
### Phase B
資料正式接入 engine。

### Phase C
規則 contract 收口與 debug runner。

### Phase D（早期）
本地 browser debug sandbox（單回合、server-api-real-engine）。

### 當前階段狀態
- Phase B checkpoint 1 已通過驗證。
- `46-3A starter deck` 已完成。
- `46-3B validator 覆蓋` 已完成。
- `shopResolver` 已正式化，並有 `buy 成功 / MP 不足 / stock 耗盡` 測試。
- `stackResolver` 已正式化，並有 `stack 順序會改變最終結果` 測試。
- single-turn CLI runner 與 browser sandbox 已能對齊基本 scenario。
- SLICE-40E 已將 browser sandbox 主流程收口為「browser → debug API → Node server → real game engine」。
- SLICE-40F 已補 `POST /api/run-scenario` smoke / integration test，並已通過。
- SLICE-40G 正在進行 browser sandbox 文件收口。
- 不再依賴 browser direct import CommonJS engine。

## 6. 計劃中的後續 1–10 個階段

### 1. Phase B 收口：`46-3B validator 覆蓋`
- 為 `Default_Card_Set` 補 validator 覆蓋
- 為 `No_of_Cards_in_Hand` 補 validator 覆蓋
- 收緊 generated data contract
- 保持 `npm run test:rules` 全綠

### 2. Phase B 收口：data initialization edge-case tests
- starter deck 空結果
- character lookup fallback
- invalid generated data fail-fast
- initial hand / deck 邊界條件

### 3. `keywords` / `combos` / `ai_profiles` loader 接口整理
- loader interface 對齊
- normalization 補齊
- 後續 AI / combo 接入前先收口資料入口
- data initialization edge-case tests
- `keywords` / `combos` / `ai_profiles` loader 接口整理
- `createInitialState()` 與 loader contract 再對齊驗證
- 全套 `npm run test:rules` 再確認最新總數

### 4. Phase C 擴充
- `shopResolver`
- 真正 buy / MP / stock 流程
- `stackResolver`
- `comboResolver`

### 5. targeting / retargeting 正式化
- target picker
- retarget 重新選擇
- attack 選擇流程一致化

### 6. elimination 正式化
- KO / removal flow
- death / discard / cleanup
- log 與 state 統一

### 7. characters passive 接入
- passive trigger
- subtype interaction
- 角色技能與 resolver 對齊

### 8. Phase D 多人同步
- Socket.IO room / lobby / match
- online 2P
- online 3P / 4P

### 9. Phase E 正式 UI
- board view
- hand view
- selected cards view
- log view
- shop modal
- target picker
- facing picker
- resolve animation

### 10. Phase F AI 與部署
- `ai_profiles` 接入
- AI decision making
- local run scripts
- integration / e2e tests
- deployment flow

## 7. 與 CONTEXT.md 對齊的檔案樹 / 共用 API / 固定程式碼
### 7.1 檔案樹與主要功能
#### 文件
- `docs/GAME_SPEC.md`：正式玩法規格。
- `CODEX_HANDOFF.md`：交接狀態、階段規劃、驗證結果。
- `CONTEXT.md`：專案當前事實、檔案樹、API、固定程式碼。

#### 資料層
- `data/cards.csv`：卡牌來源資料。
- `data/characters.csv`：角色來源資料。
- `data/keywords.csv`：關鍵字資料。
- `data/ai_profiles.csv`：AI 資料。
- `data/combos.csv`：combo 資料。
- `generated/cards.json`：生成後卡牌資料。
- `generated/characters.json`：生成後角色資料。
- `generated/keywords.json`：生成後關鍵字資料。
- `generated/ai_profiles.json`：生成後 AI 資料。
- `generated/combos.json`：生成後 combo 資料。

#### 載入層
- `shared/cardLoader.js`：CSV / JSON 資料載入與最小驗證。

#### 引擎層
- `server/game/gameEngine.js`：遊戲引擎入口。
- `server/game/state/createInitialState.js`：初始狀態建立。
- `server/game/rules/distance.js`：距離規則。
- `server/game/rules/facing.js`：面向修正。
- `server/game/rules/advantage.js`：advantage / disadvantage。
- `server/game/rules/cardResolver.js`：卡牌 resolver。
- `server/game/rules/turnEngine.js`：回合結算流程。

#### Debug / Sandbox 層
- `server/game/debug/browser-sandbox.html`：browser debug sandbox UI。
- `server/game/debug/browser-sandbox.js`：sandbox UI 行為與 result render。
- `server/game/debug/browser-api-adapter.js`：browser → debug API 的 HTTP adapter。
- `server/game/debug/browser-debug-server.js`：debug API server / real engine runner。
- `server/game/debug/scenarios.js`：scenario 資料 re-export / 共用入口。

#### 測試層
- `tests/rules/gameEngine.test.js`：核心 rules 單元測試。
- `tests/rules/cardLoader.test.js`：資料載入測試。
- `tests/rules/shopResolver.test.js`：shop resolver 測試。
- `tests/rules/stackResolver.test.js`：stack resolver 測試。

### 7.2 共用 API
#### Rules API Contract
Selection item：
```js
{
  card: { ...cardData },
  extra: { ...optionalInputs }
}
```

Resolver signature：
```js
resolver(state, player, card, extra)
```

Current resolver usage：
- `resolveAttack(state, attacker, card, extra = {}, incomingDeclaredTargetSet = null)`
- `resolveDefense(state, player, card, extra = {})`
- `resolveMove(state, player, card, extra = {})`
- `resolveBuy(state, player, card, extra = {})`

Attack extra：
```js
{
  preferredTargetId?: string,
  retargetInstruction?: { toTargetId: string }
}
```

Move extra：
```js
{ dx: number, dy: number }
```

Buy extra：
```js
{ shopCardId: string }
```

Defense extra：
```js
{}
```

#### Debug API Contract
`GET /api/health`：檢查 debug server 是否正常與 port 資訊。

`GET /api/scenarios`：回傳可用 scenario 名單。

`POST /api/run-scenario`：由 server side 用 real engine 跑 scenario，回傳 sandbox 需要嘅 result shape。

## 8. 更新規則
- 每次更新只改變：版本、更新日期時間、完成項目、優先事項、下一步、測試結果、檔案樹說明。
- 任何 LOCKED 項目要改動前，先同使用者確認。
- 若規格改動，先改 `docs/GAME_SPEC.md`，再改 test，再改 code。
- 重大 slice 完成後，更新 `CODEX_HANDOFF.md` 同 `CONTEXT.md`。
- 保持相同 heading 編號與順序，避免未來自動化或人工 review 時格式漂移。
