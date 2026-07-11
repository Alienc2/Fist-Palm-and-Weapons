# CONTEXT.md

## 專案名稱
Fist Palm and Weapons

## 當前目標
根據 `docs/GAME_SPEC.md`，逐步建立一個可在網頁運行的回合制對戰卡牌遊戲。開發策略採用由內到外：
1. 先完成 spec
2. 再完成資料骨架
3. 再完成純 rules engine
4. 再完成測試
5. 然後才接 UI、多人連線、AI、部署

## Tech Stack（目前）
- Node.js
- CommonJS modules
- npm
- Jest
- csvtojson
- 未接前端框架
- 未接 Socket.IO（規劃中）

## 規格來源
主規格文件：
- `docs/GAME_SPEC.md`

目前規格重點包括：
- 地圖大小：5 × 5
- 座標：0-based
- 起始位置：2 至 4 人模式有固定起點
- 距離：曼哈頓距離
- 朝向：上 / 下 / 左 / 右
- 相對面向：front / side / back
- 攻擊剋制：拳剋武器、武器剋掌、掌剋拳
- 基本卡：攻擊 / 防禦 / 移動 / 購買
- 商店卡：進階攻擊 / 防禦 / 反擊 / 回復 / 高速移動
- 回合 phase：SELECT_CARDS → READY_CHECK → RESOLVE_TURN → END_TURN → DRAW_PHASE → DISCARD_TO_LIMIT → ROUND_START
- 支援多人對戰與 AI（後續）

## 已完成進度

### 1. Spec / docs
已完成：
- `docs/GAME_SPEC.md`

用途：
- 作為目前所有規則與資料設計的主要依據
- 後續 code / tests / UI 都應對照本文件實作

### 2. Data layer
已完成資料骨架檔案：
- `data/cards.csv`
- `data/characters.csv`
- `data/keywords.csv`
- `data/ai_profiles.csv`
- `data/combos.csv`

已完成 build script：
- `scripts/build-data.js`

目前可將 CSV build 成：
- `generated/cards.json`
- `generated/characters.json`
- `generated/keywords.json`
- `generated/ai_profiles.json`
- `generated/combos.json`

### 3. Rules engine（目前狀態）
已完成最小可跑版本：

#### 已有檔案
- `server/game/gameEngine.js`
- `server/game/state/createInitialState.js`
- `server/game/rules/distance.js`
- `server/game/rules/facing.js`
- `server/game/rules/advantage.js`
- `server/game/rules/cardResolver.js`
- `server/game/rules/turnEngine.js`

#### 已實作能力
- 建立簡化 match state
- 建立簡化玩家資料
- 建立簡化 card instance / basic deck
- 曼哈頓距離
- 朝向修正
- 基本 attack resolve
- 基本 defense resolve
- 防禦殘留一次性觸發
- move resolve
- buy 行為 log
- end turn / draw / discard to limit
- 起手玩家交錯揭牌的最小結構

#### 尚未完成
- 真正由 CSV / JSON 載入牌庫
- 完整 MP 消耗與驗證
- 商店購買與庫存
- 反擊完整連鎖
- 多目標
- combo
- 角色被動
- AI
- 多人同步
- UI

### 4. Tests
已完成：
- `tests/rules/gameEngine.test.js`

已通過測試項目：
1. 曼哈頓距離
2. facing 修正
3. 命中時防禦殘留觸發
4. 距離不足時不觸發防禦殘留

目前測試狀態：
- `npm run test:rules` 可通過

## 編寫策略（總編寫計劃）

### Stage 1：補完純 rules engine correctness
目標：令 engine 在不接 UI 的情況下，足以完整模擬單局規則。

接下來應完成：
- `move` 測試與非法輸入保護
- `buy` 測試與 MP 扣減
- `counter` 規則與測試
- `edge KO` 規則與測試
- `advantage` 真正按對手類型判定
- `turnEngine` 多張卡交錯揭牌測試
- hand / discard / draw 更多邊界 case

### Stage 2：資料驅動化
目標：由 hardcoded rules prototype 過渡到 data-driven engine。

要做：
- `createInitialState.js` 不再硬編牌
- 由 `generated/cards.json` 載入牌庫
- 載入 `characters.json`
- 建立 card loader / validator
- schema 驗證 CSV 欄位

### Stage 3：擴規則
目標：把 `GAME_SPEC.md` 內主要戰鬥系統補齊。

要做：
- 商店購買系統
- 高階防禦
- 高速移動
- 反擊連鎖 ×2
- 邊緣擊出場外機率
- 角色被動
- combo 系統
- 多目標 targeting

### Stage 4：多人系統
目標：server authoritative match。

要做：
- Socket.IO server
- room 管理
- match events
- lobby / room state
- online 2 人對戰
- 再擴到 3 / 4 人

### Stage 5：前端 UI
目標：讓玩家可實際操作遊戲。

要做：
- board view
- hand view
- selected cards view
- log view
- shop modal
- target picker
- facing picker
- resolve animation

### Stage 6：AI 與上線
目標：單人可玩、可部署。

要做：
- `ai_profiles.csv` 接入
- AI 評估盤面
- AI 行動選擇
- 本機啟動腳本
- 測試腳本
- 部署流程
- release checklist

## 目前風險
1. engine 仍係 prototype，未接真正資料檔
2. 規則覆蓋未完整，現在通過的 test 仍然很少
3. `advantage` 邏輯仍未完整
4. `buy` / `counter` / `combo` 尚未進入可用狀態
5. 未做 integration test
6. 未做 UI，未做多人同步

## 不應隨便修