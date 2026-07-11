# CODEX_HANDOFF.md V2 260712

## 專案名稱
Fist Palm and Weapons

## 當前階段
Phase A（純 rules engine 測試與 correctness）已完成目前規劃範圍，準備進入 Phase B（資料正式接入 engine）。

## 今次交接摘要
目前專案已完成：
- `docs/GAME_SPEC.md`
- `data/*.csv` 資料骨架
- `scripts/build-data.js` CSV → JSON build 流程
- 純 rules engine 最小可跑版本
- `tests/rules/gameEngine.test.js` 單元測試保護網

最新驗證結果：
- `npm run test:rules`
- Test Suites: 1 passed, 1 total
- Tests: 16 passed, 16 total

## 已完成功能（已驗證）

### 文件與資料骨架
已存在：
- `docs/GAME_SPEC.md`
- `data/cards.csv`
- `data/characters.csv`
- `data/keywords.csv`
- `data/ai_profiles.csv`
- `data/combos.csv`

### Build 流程
已完成：
- `scripts/build-data.js`
- 可將 `data/*.csv` build 到 `generated/*.json`

常用指令：
```powershell
node scripts/build-data.js
```

### 純 rules engine
已完成檔案：
- `server/game/gameEngine.js`
- `server/game/state/createInitialState.js`
- `server/game/rules/distance.js`
- `server/game/rules/facing.js`
- `server/game/rules/advantage.js`
- `server/game/rules/cardResolver.js`
- `server/game/rules/turnEngine.js`

目前 engine 已可驗證：
- 曼哈頓距離
- front / side / back facing 修正
- 基本 attack / defense
- 防禦殘留
- move 合法 / 非法步數
- buy 基本 log
- advanced edge KO
- counter 成功率（deterministic）
- advantage 真正依 defender / revealed subtype 生效
- resolveTurn 多張牌交錯揭牌順序
- draw / discard to hand limit

## 最新通過測試（16 項）
1. 曼哈頓距離：直線 1、斜線 2
2. facing：front / back / side
3. 攻擊命中時觸發防禦殘留
4. 距離不足時不觸發防禦殘留
5. 合法移動會更新位置
6. 非法移動不會更新位置
7. basic_buy 會寫入商店 log
8. advanced attack 在邊緣可擊出場外
9. counter 100% 成功率 case
10. counter 80% 成功率失敗 case
11. counter 60% 成功率失敗 case
12. advantage：拳打武器有加成
13. advantage：拳打掌有減成
14. advantage：無 defender subtype 時視為 neutral
15. resolveTurn 在先手為 P1 時交錯揭牌順序正確
16. resolveTurn 在先手為 P2 時交錯揭牌順序正確

## 已知技術債 / 限制

### 1. 仍屬 prototype data model
`createInitialState.js` 仍然用簡化 hardcoded deck / player model，未正式從 `generated/cards.json` / `generated/characters.json` 載入。

### 2. advantage 仍係過渡設計
目前依賴：
- `opponent.lastRevealedSubtype`
- `opponent.guardSubtype`
作為 defender 類型來源。
此設計可測、可用，但未必係最終模型。之後可能要升級為更清晰的：
- `lastResolvedCard`
- `currentDefenseState`
- `incomingAttackContext`

### 3. buy / shop 仍未做真正購買
目前 `resolveBuy()` 只會 log，未做：
- MP 扣減
- 庫存扣減
- 商店卡加入手牌 / 牌庫
- 共享商店狀態

### 4. counter 仍未完成完整連鎖
目前只測到成功率與單次反射，未做完整 stack / chain resolve。

### 5. 未接資料正式 schema 驗證
CSV 雖然可轉 JSON，但未有嚴格 validator 去檢查：
- 必填欄位
- subtype 合法值
- range / damage / stock 格式
- combo / AI profile 一致性

### 6. 未進入多人同步與 UI
尚未開始：
- Socket.IO rooms
- client state / board UI / hand UI
- target picker / facing picker
- AI controller
- integration tests

## 建議下一步（最安全順序）

### Phase B：資料正式接入 engine
1. 建 `shared/cardLoader.js`
2. 讀取 `generated/cards.json`
3. 取代 `createBasicDeck()`
4. 加 schema validator
5. 讀取 `generated/characters.json`
6. 將角色初始 HP / MP / 手牌數接入 `createInitialState()`

### Phase C：擴規則到規格級
1. shopResolver
2. counter stackResolver
3. comboResolver
4. targeting / 多目標
5. eliminationResolver 正式化
6. passive / characters integration

### Phase D：多人與 UI
1. Socket.IO room / match lifecycle
2. client local mock UI
3. online 2P
4. 3P / 4P
5. AI

## 下次工作前建議先讀
1. `CONTEXT.md`
2. `CODEX_HANDOFF.md`
3. `docs/GAME_SPEC.md`
4. `server/game/rules/*.js`
5. `tests/rules/gameEngine.test.js`

## 常用指令
```powershell
node scripts/build-data.js
npm run
npm run test:rules
```

## 下一個最安全任務
建立 `shared/cardLoader.js`，將 `generated/cards.json` 真正接入 `createInitialState.js`，並為卡牌欄位加入最小 validator。