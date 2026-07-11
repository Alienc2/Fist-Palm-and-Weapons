# CONTEXT.md

---
status: active
updated: 2026-07-12 V2
phase: "Phase B planning"
---

## 專案名稱
Fist Palm and Weapons

## Past
專案由 `docs/GAME_SPEC.md` 驅動，開發順序刻意採用：
1. 先規格
2. 再資料骨架
3. 再純 rules engine
4. 再單元測試
5. 最後先接多人、UI、AI、部署

呢個決定係為咗先將戰鬥規則固定，避免 UI / network 把問題複雜化。

已完成的歷程：
- 建立 `GAME_SPEC.md`
- 建立 CSV 資料骨架
- 建立 CSV → JSON build script
- 建立純 rules engine prototype
- 建立 Jest 規則測試

## Current

### 專案目前狀態
目前屬於：
- rules engine prototype 已驗證
- data-driven engine 未完成
- multiplayer / UI / AI 未開始

### 當前技術棧
- Node.js
- CommonJS
- npm
- Jest
- csvtojson

### 目前主要檔案
#### 規格與文件
- `docs/GAME_SPEC.md`
- `CODEX_HANDOFF.md`
- `CONTEXT.md`

#### 資料層
- `data/cards.csv`
- `data/characters.csv`
- `data/keywords.csv`
- `data/ai_profiles.csv`
- `data/combos.csv`
- `generated/*.json`

#### 規則層
- `server/game/gameEngine.js`
- `server/game/state/createInitialState.js`
- `server/game/rules/distance.js`
- `server/game/rules/facing.js`
- `server/game/rules/advantage.js`
- `server/game/rules/cardResolver.js`
- `server/game/rules/turnEngine.js`

#### 測試層
- `tests/rules/gameEngine.test.js`

### 已完成功能
#### Build
- 可以將 CSV build 成 JSON
- `build:data` script 已可執行

#### Rules engine
- 建立簡化 match state
- 建立簡化 player / deck / hand
- 曼哈頓距離
- facing 修正
- attack / defense / move / buy 原型
- 防禦殘留
- advanced edge KO
- counter deterministic success rate
- advantage 真正依 defender / revealed subtype 生效
- resolveTurn 交錯揭牌順序

#### Testing
最新結果：
- `npm run test:rules`
- 1 suite passed
- 16 tests passed

已覆蓋：
1. distance
2. facing
3. defense persistence hit / miss
4. move valid / invalid
5. buy log
6. edge KO
7. counter deterministic cases
8. advantage strong / weak / neutral
9. resolveTurn interleaving order

### 目前未完成
- cards / characters 正式由 generated JSON 載入
- schema validator
- 商店實購 / 庫存 / MP 扣減
- 完整 counter chain
- combo
- 多目標
- 角色被動
- integration tests
- Socket.IO multiplayer
- client UI
- AI

### 目前風險
1. `createInitialState.js` 仍為 prototype
2. `lastRevealedSubtype` / `guardSubtype` 只是過渡設計
3. 規則雖有 16 個 tests，但仍主要是 unit test，未有 integration coverage
4. data layer 與 engine 未完全接通

## Future

### 下一個里程碑
完成 Phase B：資料正式接入 engine。

### Phase B 任務
1. 建立 `shared/cardLoader.js`
2. 從 `generated/cards.json` 讀卡牌
3. 取代 hardcoded `createBasicDeck()`
4. 加欄位檢查與 validator
5. 從 `generated/characters.json` 建玩家初始狀態
6. 讓 `createInitialState()` 變成真正資料驅動

### 之後里程碑
#### Phase C：擴規則
- shopResolver
- stackResolver
- comboResolver
- targeting
- characters passive
- elimination 正式化

#### Phase D：多人對戰
- Socket.IO room / lobby / match
- online 2P
- online 3P / 4P

#### Phase E：前端 UI
- board view
- hand view
- log view
- shop modal
- target picker
- facing picker
- resolve animation

#### Phase F：AI 與部署
- AI profiles
- board evaluation
- local run scripts
- integration tests
- deployment

## 工作規則
- 改規則前先對照 `docs/GAME_SPEC.md`
- 重要修改先補測試，再補功能
- 每完成重要 slice 更新 `CODEX_HANDOFF.md` 與 `CONTEXT.md`
- 若規格變更，先改 spec，再改 test，再改 code