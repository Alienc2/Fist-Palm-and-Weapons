# CODEX_HANDOFF.md V3

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

目前最新驗證結果：
- `npm run test:rules`
- Test Suites: 2 passed, 2 total
- Tests: 22 passed, 22 total

## 當前階段
Phase B：資料正式接入 engine  
狀態：Checkpoint 1 已通過驗證，可繼續向資料驅動化收口，或開始下一個系統 slice。

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

### 3. 已修正的 Phase B 問題
資料正式接入後，曾出現兩類問題，現已修正：

#### 問題 A：舊測試依賴起手手牌內容
舊測試用 `p1.hand.find(...)` / `p2.hand.find(...)` 依賴抽到指定 card type。  
由於現在改成 generated data + character hand size，初始手牌不可再假設固定內容，因此測試已改為使用明確測試 card object。

#### 問題 B：舊測試寫死 prototype card id
舊測試假設 card id 是 `basic_punch` / `basic_guard`。  
實際 generated data 內是 `basic_punch_1` / `basic_guard_1` 等具體 id，因此測試已改為檢查：
- id pattern
- card type
- starter deck 類別覆蓋

#### 問題 C：無效選牌導致 turnEngine 直接炸掉
已在 `turnEngine.js` 加最小防呆，遇到 `!cardEntry || !cardEntry.card` 時會寫 log 並跳過，而非直接拋錯。

## 目前測試覆蓋（22 項）

