# CODEX_HANDOFF.md

## 專案名稱
Fist Palm and Weapons

## 專案簡介
這是一個以網頁形式實作的回合制對戰卡牌遊戲專案。現階段以 `docs/GAME_SPEC.md` 為單一規格來源，先完成資料骨架、CSV → JSON build 流程，以及純規則 engine 的最小可跑版本，之後再擴充多人連線、AI、完整卡牌內容、UI 與部署。

## 目前已完成項目

### 1. 文件與資料骨架
已建立以下檔案／資料夾：
- `docs/GAME_SPEC.md`
- `data/cards.csv`
- `data/characters.csv`
- `data/keywords.csv`
- `data/ai_profiles.csv`
- `data/combos.csv`
- `scripts/build-data.js` 或 `scripts/build-data.mjs`
- `generated/`（build 輸出目錄）

### 2. CSV → JSON build 流程
已安裝 `csvtojson`。
已可透過以下指令產生 JSON：
```powershell
node scripts/build-data.js
```

目前用途：
- 將 `/data/*.csv` 轉成 `/generated/*.json`
- 供之後 client / server 共用資料

### 3. 純規則 engine（最小可跑）
已建立最小版 rules engine 與相關檔案：
- `server/game/gameEngine.js`
- `server/game/state/createInitialState.js`
- `server/game/rules/distance.js`
- `server/game/rules/facing.js`
- `server/game/rules/advantage.js`
- `server/game/rules/cardResolver.js`
- `server/game/rules/turnEngine.js`

目前 engine 能力：
- 曼哈頓距離判定
- 朝向 front / side / back 修正
- 基本攻擊
- 基本防禦與防禦殘留
- 基本移動
- 基本購買入口 log
- Draw phase
- Discard to hand limit
- 邊緣 + 進階攻擊擊出場外的簡化判定

### 4. 測試
已安裝 `jest`。
已建立測試檔：
- `tests/rules/gameEngine.test.js`

目前已通過測試：
1. 曼哈頓距離：直線 1、斜線 2
2. 朝向修正：front / back / side
3. 攻擊命中時會觸發防禦殘留
4. 距離不符時不會觸發防禦殘留

已驗證指令：
```powershell
npm run test:rules
```

最近一次測試結果：
- Test Suites: 1 passed, 1 total
- Tests: 4 passed, 4 total

## 今次已解決的重要問題

### 1. npm / package.json 問題
曾出現：
- `npm not found`
- `Missing script: test:rules`
- `Invalid package.json`

現已修正：
- Node / npm 可正常執行
- `package.json` 為合法 JSON
- `scripts.test:rules` 已加入
- `jest` 與 `csvtojson` 已安裝

### 2. 防禦殘留測試失敗 root cause
曾經 `防禦殘留觸發` 測試失敗，原因不是 engine 邏輯錯，而是測試場景下雙方距離為 4，攻擊根本未命中，`resolveAttack()` 提前因距離不符而 return。
後來已修正測試場景，將玩家距離拉近，測試成功通過。

## 目前已知限制／技術債

### 1. 卡牌資料仍未正式接入 generated JSON
目前 `createInitialState.js` 內仍使用簡化版硬編 deck。
尚未從 `generated/cards.json` 正式讀入資料。

### 2. 剋制邏輯未完全接上 defender 類型
`cardResolver.js` 內 `getAdvantageModifiers(card.subtype, card.subtype)` 目前仍屬簡化寫法，未真正以對手攻擊／防禦／反擊類型作比較。

### 3. 商店、反擊連鎖、多目標仍未完成
以下仍屬最小骨架或未實作：
- 商店實際購買與庫存扣減
- 反擊成功率完整測試
- 反擊連鎖 ×2 stack resolve
- 多目標 targeting
- Combo 解析
- AI 決策
- Socket.IO 房間與同步
- 前端 UI

### 4. 規則測試覆蓋率仍不足
現時只測到：
- 距離
- facing
- 防禦殘留
- hand limit

尚未測：
- move 合法／非法步數
- buy
- edge KO
- counter 100 / 80 / 60
- round flow 多張卡交錯解析
- advanced attack
- discard 行為細節

## 後續建議執行順序

### Phase A：補足純 rules engine 測試與 correctness
優先補測試，再補功能：
1. `move` 合法與非法步數測試
2. `buy` 基本流程測試
3. `advanced edge KO` 測試
4. `counter` 成功率與 deterministic 測試（mock `Math.random()`）
5. `advantage` 真正對 defender type / incoming type 生效
6. `resolveTurn()` 多張牌交錯揭牌測試

### Phase B：資料正式接入 engine
1. 由 `generated/cards.json` 取代 `createBasicDeck()`
2. 加欄位驗證（schema 檢查）
3. 將 `characters.json` 接入 `createInitialState()`
4. 將 `combos.json`、`ai_profiles.json` 納入預留接口

### Phase C：完整系統模組
1. `shopResolver.js`
2. `counter / stackResolver.js`
3. `targeting.js`
4. `eliminationResolver.js`
5. `comboResolver.js`

### Phase D：多人與前端
1. Socket.IO rooms
2. client game store
3. board UI / hand UI / log UI
4. local mock → online match

## 建議下次開始前先做的事
開始新任務前，先閱讀：
- `docs/GAME_SPEC.md`
- `CONTEXT.md`
- `CODEX_HANDOFF.md`
- 將要修改的 source file
- 對應 test file

## 本地開發常用指令

### Build 資料
```powershell
node scripts/build-data.js
```

### 跑規則測試
```powershell
npm run test:rules
```

### 查看 npm scripts
```powershell
npm run
```

## 下個最安全任務
優先做：
- 補 `move`、`counter`、`edge KO` 單元測試
- 修正 `advantage` 真正比較對手類型
- 將簡化 hardcoded deck 改為讀 `generated/cards.json`