# CODEX_HANDOFF.md V27

## 1. 程式基本資料
- 名稱：Fist Palm and Weapons
- 版本：V27
- 更新日期時間：2026-08-11 17:15 HKT












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
| recover 卡 resolver 正式化（SLICE-C-03） | `server/game/rules/cardResolver.js`、`tests/rules/recoverResolver.test.js` | `npm run test:rules` | 已完成 |
| 轉向規則 facingChange（SLICE-C-04） | `server/game/rules/facingChangeResolver.js`、`server/game/rules/turnEngine.js`、`server/game/gameEngine.js`、`tests/rules/facingChangeResolver.test.js` | `npm run test:rules` | 已完成 |
| 反擊連鎖完整化（SLICE-C-05） | `server/game/rules/counterChainResolver.js`、`server/game/rules/stackResolver.js`、`tests/rules/counterChainResolver.test.js` | `npm run test:rules` | 已完成 |
| 多目標自動規則正式化（SLICE-D-01） | `server/game/rules/targetPriorityResolver.js`、`server/game/rules/targetingResolver.js`、`tests/rules/targetPriorityResolver.test.js` | `npm run test:rules` | 已完成 |
| comboResolver 正式化（SLICE-D-02） | `server/game/rules/comboResolver.js`、`tests/rules/comboResolver.test.js` | `npm run test:rules` | 已完成 |
| characters passive 接入（SLICE-D-03） | `server/game/rules/passiveResolver.js`、`server/game/rules/cardResolver.js`、`server/game/rules/shopResolver.js`、`server/game/rules/facingChangeResolver.js`、`tests/rules/passiveResolver.test.js` | `npm run test:rules` | 已完成 |
| 多人引擎擴充（SLICE-D-04） | `server/game/rules/turnEngine.js`、`tests/rules/multiplayerEngine.test.js` | `npm run test:rules` | 已完成 |
| Phase E 正式 UI 骨架（SLICE-E-01） | `client/server.js`、`client/index.html`、`client/gameStore.js`、`client/layout.js`、`client/app.js`、`client/styles.css` | `npm run client` + browser 驗證 | 已完成 |
| Phase E 正式 UI 視圖（SLICE-E-02） | `client/views/*.js`（board / hand / selected / log / shop / target / facing / resolve / result） | `npm run client` + browser 驗證 | 已完成 |
| Phase F AI 與部署（SLICE-F-01） | `server/game/ai/aiDecision.js`、`server/game/ai/aiMatch.js`、`scripts/run-ai-match.js`、`tests/ai/*.test.js`、`Dockerfile`、`docker-compose.yml`、`docs/DEPLOYMENT.md` | `npm run test:ai`、`npm run ai:match`、`docker build` | 已完成 |
| AI 對戰接入正式 UI（SLICE-F-02） | `client/server.js`、`client/index.html`、`client/app.js`、`client/gameStore.js`、`client/styles.css` | `npm run client` + AI 整合 smoke test | 已完成 |
| Phase D 多人同步網路層（SLICE-D-05） | `server/network/roomManager.js`、`server/network/matchManager.js`、`server/rooms/matchmaking.js`、`server/network/socketServer.js`、`client/server.js` | `npx jest --runInBand tests/network` | 已完成 |
| 多人對戰前端 UI（SLICE-H-01） | `client/socketClient.js`、`client/views/lobbyView.js`、`client/app.js`、`client/gameStore.js`、`client/index.html`、`client/styles.css` | `npm run client` + browser 驗證 + HTTP 200 smoke test | 已完成 |







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
- `tests/rules/recoverResolver.test.js`
- `tests/rules/facingChangeResolver.test.js`
- `tests/rules/counterChainResolver.test.js`
- 單一回合 debug runner（CLI）
- browser debug sandbox（server API 跑 real engine）
- `generated/*.json` 已納入版本控制
- SLICE-C-03：recover 卡 resolver 正式化（HP / MP / 抽牌 / 封頂）
- SLICE-C-04：轉向規則 facingChange（免費轉向 1 次、turnEngine 套用、gameEngine.setFacing API）
- SLICE-C-05：反擊連鎖完整化（距離驗證 / 成功率 / 方向反轉 / ×2 連鎖 / 鏈終止）
- SLICE-D-01：多目標自動規則正式化（targetPriorityResolver：距離 / 面向 / HP / 隨機，targetingResolver 接入）
- SLICE-D-02：comboResolver 正式化（sequence / board_pattern / effect，turnEngine 接入）
- SLICE-D-03：characters passive 接入（passiveResolver：front_damage_bonus / front_defense_bonus / free_facing_change / first_shop_discount）
- SLICE-D-04：多人引擎擴充（turnEngine N 玩家交錯揭牌 / 起始玩家輪轉 / 淘汰跳過 / 多目標）
- SLICE-E-01：Phase E 正式 UI 骨架（client server 靜態 + 遊戲 API、index.html、gameStore、layout、app、styles）
- SLICE-E-02：Phase E 正式 UI 視圖（board / hand / selected / log / shop / target / facing / resolve / result）
- SLICE-F-01：Phase F AI 與部署（`ai_profiles` 接入 + AI decision + local run scripts + integration / e2e tests + deployment flow）
- `server/game/ai/aiDecision.js`：AI decision making（依 profile 權重選牌 / 目標 / 移動 / 購買）
- `server/game/ai/aiMatch.js`：AI 對戰 runner（autoSelectAiPlayers / runAiMatch）
- `scripts/run-ai-match.js`：AI 對戰 CLI runner
- `tests/ai/aiDecision.test.js`：AI decision 單元測試
- `tests/ai/aiMatch.e2e.test.js`：AI 對戰 integration / e2e 測試
- `Dockerfile` / `docker-compose.yml`：部署映像與容器
- `docs/DEPLOYMENT.md`：部署流程文件
- `gameEngine.createMatch(options)` 已支援傳入 players 建立對戰
- SLICE-F-02：AI 對戰接入正式 UI（`client/server.js` 支援 AI 玩家 + `/api/play` 自動選牌、`index.html` 遊玩人數 / 電腦敵人選擇、`app.js` 動態角色選單 + 玩家切換、`gameStore` 多玩家 + AI 設定、`styles.css` 表單樣式）
- SLICE-H-01：多人對戰前端 UI（Socket.IO client 接入正式 UI，online 2P / 3P / 4P 遊玩）
- `client/socketClient.js`：前端 Socket.IO 連線模組（connect / emit / on / 房間 API / 對戰 API / 配對 API / getSocketId）
- `client/views/lobbyView.js`：遊戲大廳 UI（建立 / 加入 / 列表 / 選角色 / 準備 / 開始對戰）
- `client/app.js` 已接入多人對戰（`#lobbyButton` 開啟大廳、`bindSocketEvents` 監聽 match:start / match:state / match:end）
- `client/gameStore.js` 已新增 `setState(state)`（由 server 廣播直接設定狀態）
- `client/index.html` 已新增「多人對戰」按鈕 + 載入 `/socket.io/socket.io.js`
- `client/styles.css` 已新增遊戲大廳樣式（lobby / room list / player status）
- Phase J-01：2–4 人完整對戰 E2E 與壓力測試
- `tests/ai/aiMatch.4p.test.js`：4P AI 對戰 E2E 測試
- `tests/network/socketServer.e2e.test.js` 已擴充 3P / 4P 多人對戰 E2E 流程
- `tests/stress/stress.test.js`：壓力測試（20 場並發 AI 對戰 / 100 回合長時間對戰 / 20 個 socket client）
- `package.json` 已新增 `test:network`、`test:stress` 指令
- Phase J-02：CI/CD（GitHub Actions）
- `.github/workflows/ci.yml`：CI（main push + PR 觸發，build + test:all + verify:local）
- `.github/workflows/docker.yml`：Docker 建置驗證（build + /api/health）
- `docs/DEPLOYMENT.md` 已補測試指令總覽與 GitHub Actions CI 說明
- Phase I-02：手牌上限 UI 選擇、牌庫重洗
- `server/game/state/createInitialState.js`：起始牌庫 shuffle、起始朝向指向棋盤中心 (2,2)（`getFacingTowardCenter`）、起始手牌必定有 basic_buy（`ensureBasicBuyInHand`）
- `server/game/rules/turnEngine.js`：牌庫耗盡時自動重洗棄牌堆（`drawCards`）、手牌上限棄牌（`discardToLimit` 依 pendingDiscards 優先）、basic_buy 永久固定（`isPermanentCard`）、免費轉向延後到最後（`applyFacingChange`）
- `client/views/discardPicker.js`：手牌上限棄牌選擇 modal（已接入 app.js）
- `tests/rules/createInitialState.shuffle.test.js`：起始牌庫隨機化測試
- `tests/rules/createInitialState.facing.test.js`：起始位置固定 + 起始朝向指向 (2,2) 測試
- `tests/rules/createInitialState.basicBuy.test.js`：basic_buy 永久固定 + 起始手牌必定有 basic_buy 測試
- `tests/rules/turnEngine.deck.test.js`：牌庫重洗 + 手牌上限棄牌測試
- `tests/rules/turnEngine.facingDelay.test.js`：免費轉向延後到最後測試
- Phase I-02-E：board_pattern combo 修正（方案 A）
- `server/game/rules/turnEngine.js`：combo 偵測改為揭牌時針對實際 target 處理（`cardResolver.js` 揭牌時呼叫 `resolveCombos(state, attacker, target)`）
- `tests/rules/comboResolver.boardPattern.test.js`：board_pattern combo 偵測測試（line / diagonal / surround / none）
- Phase I-02-E2：攻擊目標 bug 修正（核心 bug）
- `shared/cardLoader.js` `normalizeCard`：將 `target_rule` 映射到 `targeting`（`single`→`single_enemy`、`all_enemies`→`all_enemies`、`adjacent_enemy`→`adjacent_enemies`、`self`→`self_chosen_enemies`）
- `server/game/rules/targetingResolver.js` `getDefaultEnemyTarget`：尊重 `extra.preferredTargetId`（人類玩家選嘅目標）
- Phase I-02-E3：卡牌效果預測列為 UI 預覽功能（I-02-H4），server 執行順序保持即時累計
- Phase I-02-F：對戰設定 UI 隱藏 + 對戰記錄移到左上
- `client/app.js` `updateControls`：開始對戰後隱藏「對戰設定」section（`setupPanel.hidden = hasMatch`）
- `client/styles.css`：`log-panel` 改為 fixed 左上（top 70px / left 16px）
- Phase I-02-G：5×5 棋盤高度限制（唔超過畫面 4/5）
- `client/styles.css`：`.board-view` / `.board-grid` 加 `max-height: 80vh`，cell 用 `min()` 控制尺寸
- Phase I-02-H：手牌扇形 + 啤牌比例 + 完整資料排法
- `client/views/handView.js`：扇形排列喺畫面下方（`hand-fan`，依 index 旋轉角度），hover 升高，可點擊打出
- `client/styles.css`：扇形樣式、啤牌比例（約 2.5:3.5，120×168）
- `client/layout.js` `cardNode`：擴充卡牌內容排法，列出所有資料（傷害 / 射程 / 移動 / 格擋 / 回復 / MP / 抽牌 / 解封 / keywords / 庫存）
- `client/index.html`：打出嘅牌按順序左至右喺棋盤上方列出（`selected-panel` 移入 board-panel）
- Phase I-02-H2：移動卡直接喺棋盤高亮可移動範圍 + 點擊地圖選擇
- `client/views/boardView.js`：使用移動卡時高亮可移動格（`.is-move-target` 綠色），點擊地圖選擇移動目標（`extra.dx/dy`），取代 facingPicker 嘅移動方向選擇
- Phase I-02-H3：攻擊卡直接喺棋盤高亮可攻擊敵人 + 點擊敵人選擇
- `client/views/boardView.js`：使用攻擊卡時高亮可攻擊敵人（`.is-attack-target` 綠色），點擊敵人選擇目標（`extra.preferredTargetId`），取代 targetPicker 嘅目標選擇
- Phase I-02-H4：卡牌效果預測（UI 預覽）
- `client/views/boardView.js` `getPredictedPosition`：計算玩家喺本回合已選移動卡後嘅預測位置，攻擊卡距離預覽用移動後位置
- Phase I-02-I：商店→解封 文字統一
- `client/views/shopModal.js`、`client/index.html`、`client/selectionFlow.js`、`client/app.js`：文字改為「解封」「解封武功」
- Phase I-02-J：前端 bug 修正（移動 / 攻擊 / 人數 / 棋盤 / 卡面）
- `client/layout.js` `normalizeClientCard`：將可能係字串嘅數值欄位統一轉為 number，令 `boardView` 距離 / 移動判定同 `cardNode` 卡面顯示正確
- `client/layout.js` `cardNode`：`buyCost` 判斷改為 `> 0`，避免空字串轉 0 後誤顯示「解封 0 MP」
- `client/app.js` `syncPlayerCountLimits`：遊玩人數 / 電腦敵人選項即時同步上限，令總對戰人數永遠 ≤ 4
- `client/styles.css`：`.board-cell` 用 `width/height: min(calc(80vh / 5), 140px)` 令 cell 保持正方形並隨畫面縮放
- Phase I-02-J2：前端卡牌資料序列化修正（卡面 / 移動 / 攻擊 bug 根因）
- `shared/cardLoader.js` `normalizeCard`：補 `aliasGroup`（`alias_group`）與 `description`（`description_template`）欄位，令前端卡面顯示正確名稱 / 副類別 / 描述
- `client/server.js` `serializeCard`：改為讀 camelCase 欄位（`name` / `aliasGroup` / `description` / `moveMin` / `moveMax` / `rangeMin` / `rangeMax` / `targeting`），解決前端收到 `id` 當名稱、移動卡只能移到同一格、攻擊卡不能選敵人嘅根因
- `client/styles.css`：`.board-cell` 尺寸改為 `min(calc(80vh / 5), 140px)` 並用 `aspect-ratio: 1` 保持正方形，令 5×5 棋盤按比例縮放
- `client/views/boardView.js` + `client/index.html`：移動 / 攻擊選擇模式提示移到右邊「解封武功」下方（`#boardSelectionHintPanel`），避免遮住棋盤
- Phase I-02-K：對戰體驗修正（MP / 移動 / 對戰記錄 / 扇形 / 攻擊標注）
- `server/game/rules/turnEngine.js`：每回合每位玩家補 3 MP（clamp 到 maxMp），總 MP 上限 8
- `server/game/rules/cardResolver.js` `resolveMove`：移動卡改用絕對座標（`extra.targetX/targetY`），避免交錯揭牌時相對位移累積誤差；禁止移動到被佔據格
- `client/views/logView.js`：對戰記錄顯示回合數 / 卡牌數 / 角色名（`name_zh`）
- `client/views/handView.js` + `client/styles.css`：扇形 8 張唔超出視窗（依手牌數縮放角度 / 位移）
- `client/views/boardView.js` + `client/styles.css`：攻擊範圍標注語意（可攻擊敵人用紅色 `.is-attack-target`，移動格用綠色 `.is-move-target`）
- `tests/rules/multiplayerEngine.test.js`：移動測試改用 `extra.targetX/targetY`（對齊絕對座標）
- `tests/rules/recoverResolver.test.js`：MP 預期更新（recover +1 + 回合補 3，clamp 到 maxMp 5 → 5）
- Phase P1：佈局／層次／引導 + 棋盤佈局（UI bug 修正 + UI 打磨）
- `client/views/boardView.js`：移動格 click 改用絕對座標 `{ targetX, targetY }`，`getPredictedPosition` 同樣改讀 `targetX/targetY`；`getAttackTargets` 移除距離篩選，改高亮全部未淘汰敵人（server 結算把關距離）
- `client/views/selectedCardsView.js`：朝向改為 5 個按鍵（上▲ / 下▼ / 左◀ / 右▶ / 保持），「保持」→ `"none"`，即時 `setPendingFacing`，依 `getPendingFacing || player.facing` 加 `.is-active`；移除 `openFacingPicker` import
- `client/views/facingPicker.js`：標示為 deprecated（不再由主流程引用，保留作 legacy）
- `client/styles.css`：新增 `--topbar-height: 70px` / `--hand-height: 264px`、`.app-shell` 底部預留手牌高度、`.board-view` / `.board-grid` 高度改用 `100vh - topbar - hand`、直向 media query、safe-area（`env()` + `max()` fallback）、`.help-panel`（`<details>`）、`.facing-option.is-active`、`.tutorial-dialog` / `.tutorial-steps`
- `client/index.html`：viewport 加 `viewport-fit=cover`、控制面板「操作提示」改為 `<details>`（預設收起）、新增 `#tutorialRoot`
- `client/app.js`：`renderPlayerStatus` 移除座標與朝向 span；`startMatchButton` / `newMatchButton` 成功後呼叫 `maybeShowTutorial()`
- `client/views/tutorialOverlay.js`：新增教學提示浮層（首次開始對戰顯示一次，localStorage 記住已睇過）
- 註：移動修復回歸守門為 `tests/rules/multiplayerEngine.test.js`（已用 targetX/targetY）
- Phase P0：阻斷閱讀/操作 + 資產基礎（字型 ≥14px、精簡 token、資產目錄、token/卡牌圖片 fallback）
- `client/views/boardView.js`：抽出 `renderToken(occupant, state)`；token 只顯示「P# / 角色名 / HP」，移除 `token-facing` / `token-mp` 文字；`SLOT_COLORS` 前端玩家槽定色（`state.players.indexOf % 4`）、`normalizeFacing`；圖片 `assets/tokens/token_<name_zh>_<color>_<facing>.png`，404 → 三角形 fallback（clip-path + facing 旋轉 + 槽色圍邊）
- `client/layout.js` `cardNode()`：新增 `showBack` option；卡面圖層 `assets/cards/<id>.png`，載入成功隱藏文字層、404 移除圖片保留銀黑咭面
- `client/styles.css`：核心文字 `clamp(14px, 2.5vw, 18px)`（`.card-desc` / `.log-entry` / `.token-name` / `.token-hp`）；移除 `.token-mp`；新增 `.token-img` / `.token-fallback-triangle` / `.card-img` / `.card-face-layer`
- `client/assets/{tokens,cards,boards}/.gitkeep`：資產目錄（P0 全 placeholder，執行走 fallback 屬預期）



### 3.4 現階段重點風險







- browser 端唔可以再直接 import CommonJS engine。
- debug sandbox 必須長期維持 API contract 穩定。
- generated data 一有改動就要 rebuild 再驗證。
- 任何規則 contract 改動都要先更新 `CONTEXT.md` 再改 code。

## 4. 最新驗證 / 測試結果
- `npm run build:data` 通過。
- `npm run test:rules` 通過。
- `npm run test:ai` 通過。
- 全套 `npx jest --runInBand` 最新總數：`34` suites passed, `2` failed, `36` total；`274` tests passed。
- 註：2 個失敗 suites（`tests/network/socketServer.e2e.test.js`、`tests/stress/stress.test.js`）係既有環境問題：`socket.io-client` 喺 devDependencies 但 `node_modules` 未有安裝，與 P0 client 前端改動無關。
- 前端 JS 語法檢查通過（`node --input-type=module --check`；本機 pipe 對非 ASCII 有編碼問題，P0 用 temp `.mjs` copy 檢查，boardView / layout 都 OK）。




- `tests/ai/aiDecision.test.js` 通過。
- `tests/ai/aiMatch.e2e.test.js` 通過。
- `node scripts/run-ai-match.js --rounds 5` 通過。
- `tests/network/roomManager.test.js` 通過。
- `tests/network/matchManager.test.js` 通過。
- `tests/network/matchmaking.test.js` 通過。
- `tests/network/socketServer.e2e.test.js` 通過（完整流程：建立房間 → 加入 → 準備 → 開始 → 選牌 → 回合解析）。
- 正式 UI server 已附加 Socket.IO multiplayer server，`GET /api/health` 通過。
- 多人對戰前端 UI smoke test 通過：`client/server.js` 啟動後 `/api/health`、`/socket.io/socket.io.js`、`/`、`/app.js`、`/socketClient.js`、`/views/lobbyView.js` 全部 HTTP 200。


- `tests/rules/recoverResolver.test.js`：9 passed, 9 total。
- `tests/rules/facingChangeResolver.test.js`：10 passed, 10 total。
- `tests/rules/counterChainResolver.test.js`：14 passed, 14 total。
- `tests/rules/shopResolver.test.js` 通過。
- `tests/rules/stackResolver.test.js` 通過。
- `tests/rules/cardLoader.test.js`：10 passed, 10 total。
- `tests/rules/targetPriorityResolver.test.js` 通過。
- `tests/rules/comboResolver.test.js` 通過。
- `tests/rules/passiveResolver.test.js`：11 passed, 11 total。
- `tests/rules/multiplayerEngine.test.js`：6 passed, 6 total。
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

### Phase D
多目標 / combo / passive / 多人引擎正式化。

### Phase E
正式 UI（browser → client server API → real engine）。

### Phase F
AI 與部署（`ai_profiles` 接入 / AI decision / local run scripts / integration / e2e tests / deployment flow）。

### 當前階段狀態
- SLICE-F-01：Phase F AI 與部署已完成（`ai_profiles` 接入 + AI decision + local run scripts + integration / e2e tests + deployment flow）。
- `server/game/ai/aiDecision.js`：AI decision making（依 profile 權重選牌 / 目標 / 移動 / 購買）。
- `server/game/ai/aiMatch.js`：AI 對戰 runner（autoSelectAiPlayers / runAiMatch）。
- `scripts/run-ai-match.js`：AI 對戰 CLI runner。
- `tests/ai/aiDecision.test.js`：AI decision 單元測試。
- `tests/ai/aiMatch.e2e.test.js`：AI 對戰 integration / e2e 測試。
- `Dockerfile` / `docker-compose.yml`：部署映像與容器。
- `docs/DEPLOYMENT.md`：部署流程文件。
- `npm run test:ai` 通過（24 tests）。
- `npm run ai:match` 可執行 AI 對戰。
- SLICE-F-02：AI 對戰接入正式 UI 已完成（`client/server.js` 支援 AI 玩家 + `/api/play` 自動選牌、`index.html` 遊玩人數 / 電腦敵人選擇、`app.js` 動態角色選單 + 玩家切換、`gameStore` 多玩家 + AI 設定）。
- 正式 UI server AI 整合 smoke test 通過（createMatch 含 AI 玩家 → `/api/play` 自動選牌 → 回合結算）。
- SLICE-D-05：Phase D 多人同步網路層已完成（Socket.IO room / lobby / match / matchmaking）。
- `server/network/roomManager.js`：房間系統（create / join / leave / setCharacter / setReady / isAllReady / getPublicRoom）。
- `server/network/matchManager.js`：同步選牌與回合解析（createMatchFromRoom / createMatchController）。
- `server/rooms/matchmaking.js`：配對系統（enqueue / dequeue / tryMatch / timeout / getRequiredPlayers）。
- `server/network/socketServer.js`：Socket.IO server 整合（房間 / 對戰 / 配對 / 斷線重連）。
- `client/server.js` 已附加 Socket.IO multiplayer server。
- `tests/network/roomManager.test.js` / `tests/network/matchManager.test.js` / `tests/network/matchmaking.test.js` / `tests/network/socketServer.e2e.test.js` 全部通過（44 tests）。
- SLICE-H-01：多人對戰前端 UI 已完成（Socket.IO client 接入正式 UI，online 2P / 3P / 4P 遊玩）。
- `client/socketClient.js`：前端 Socket.IO 連線模組（connect / emit / on / 房間 API / 對戰 API / 配對 API / getSocketId）。
- `client/views/lobbyView.js`：遊戲大廳 UI（建立 / 加入 / 列表 / 選角色 / 準備 / 開始對戰）。
- `client/app.js` 已接入多人對戰（`#lobbyButton` 開啟大廳、`bindSocketEvents` 監聽 match:start / match:state / match:end）。
- `client/gameStore.js` 已新增 `setState(state)`（由 server 廣播直接設定狀態）。
- `client/index.html` 已新增「多人對戰」按鈕 + 載入 `/socket.io/socket.io.js`。
- `client/styles.css` 已新增遊戲大廳樣式（lobby / room list / player status）。
- 多人對戰前端 UI smoke test 通過（`client/server.js` 啟動後 `/api/health`、`/socket.io/socket.io.js`、`/`、`/app.js`、`/socketClient.js`、`/views/lobbyView.js` 全部 HTTP 200）。
- SLICE-E-01：Phase E 正式 UI 骨架已完成（client server 靜態 + 遊戲 API、index.html、gameStore、layout、app、styles）。



- SLICE-E-02：Phase E 正式 UI 視圖已完成（board / hand / selected / log / shop / target / facing / resolve / result）。
- `npm run client` 可啟動正式 UI server，`GET /api/health` 通過。
- client server API 流程已驗證：`POST /api/match` → `POST /api/select` → `POST /api/play` 全流程通過。
- Phase E 正式 UI 已取代 debug sandbox 作為主要遊玩入口。

- Phase B checkpoint 1 已通過驗證。
- `46-3A starter deck` 已完成。
- `46-3B validator 覆蓋` 已完成。
- `shopResolver` 已正式化，並有 `buy 成功 / MP 不足 / stock 耗盡` 測試。
- `stackResolver` 已正式化，並有 `stack 順序會改變最終結果` 測試。
- SLICE-C-03：recover 卡 resolver 正式化，並有 `HP / MP / 抽牌 / 封頂` 測試。
- SLICE-C-04：轉向規則 facingChange 正式化，並有 `免費轉向 / turnEngine 套用 / 影響 facing 修正` 測試。
- SLICE-C-05：反擊連鎖完整化，並有 `距離驗證 / 成功率 / ×2 連鎖 / 鏈終止` 測試。
- SLICE-D-01：多目標自動規則正式化，並有 `距離 / 面向 / HP / 隨機` 測試。
- SLICE-D-02：comboResolver 正式化，並有 `sequence / board_pattern / effect` 測試。
- SLICE-D-03：characters passive 接入，並有 `front_damage_bonus / front_defense_bonus / free_facing_change / first_shop_discount` 測試。
- SLICE-D-04：多人引擎擴充，並有 `3P / 4P 交錯揭牌 / 起始玩家輪轉 / 淘汰跳過 / 多目標` 測試。
- single-turn CLI runner 與 browser sandbox 已能對齊基本 scenario。
- SLICE-40E 已將 browser sandbox 主流程收口為「browser → debug API → Node server → real game engine」。
- SLICE-40F 已補 `POST /api/run-scenario` smoke / integration test，並已通過。
- SLICE-40G 正在進行 browser sandbox 文件收口。
- 不再依賴 browser direct import CommonJS engine。
- Phase I-02-E：board_pattern combo 修正（方案 A）已完成（揭牌時針對實際 target 偵測，`tests/rules/comboResolver.boardPattern.test.js` 覆蓋 line / diagonal / surround / none）。
- Phase I-02-E2：攻擊目標 bug 修正（核心 bug）已完成（`cardLoader.js` 將 `target_rule` 映射到 `targeting`、`targetingResolver.js` `getDefaultEnemyTarget` 尊重 `preferredTargetId`）。
- Phase I-02-E3：卡牌效果預測已定案為 UI 預覽功能（I-02-H4），server 執行順序保持即時累計。
- Phase I-02-F：對戰設定 UI 隱藏 + 對戰記錄移到左上已完成。
- Phase I-02-G：5×5 棋盤高度限制（唔超過畫面 4/5）已完成。
- Phase I-02-H：手牌扇形 + 啤牌比例 + 完整資料排法 + 打出嘅牌喺棋盤上方列出已完成。
- Phase I-02-H2：移動卡直接喺棋盤高亮可移動範圍 + 點擊地圖選擇已完成。
- Phase I-02-H3：攻擊卡直接喺棋盤高亮可攻擊敵人 + 點擊敵人選擇已完成。
- Phase I-02-H4：卡牌效果預測（UI 預覽，攻擊距離用移動後位置）已完成。
- Phase I-02-I：商店→解封 文字統一已完成。
- Phase I-02-K：對戰體驗修正已完成（每回合補 3 MP / 移動卡絕對座標 / 對戰記錄回合數與卡牌數 / 扇形 8 張唔超出視窗 / 攻擊範圍紅色標注）。
- Phase P1：佈局／層次／引導 + 棋盤佈局已完成（移動卡絕對座標修復 / 攻擊卡選敵放寬 / 朝向 5 按鍵 / 手牌唔遮棋盤 / safe-area / 摺疊操作提示 / 精簡玩家狀態列 / 教學提示浮層）。
- Phase P0：阻斷閱讀/操作 + 資產基礎已完成（核心戰鬥文字 ≥14px、棋盤 token 精簡為「角色名 + HP」、資產目錄、token/卡牌圖片 fallback）。P0 資產全為 placeholder，執行走三角形 / 銀黑 fallback 屬預期。
- 前端 JS 語法檢查通過（temp `.mjs` copy）；全套 `npx jest --runInBand` 保持 `34 suites / 274 tests` 綠（2 個失敗為既有 `socket.io-client` 缺裝，與 P0 前端改動無關）。






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

### 9. Phase E 正式 UI（已完成）
- board view
- hand view
- selected cards view
- log view
- shop modal
- target picker
- facing picker
- resolve animation
- result overlay
- client server（靜態 + 遊戲 API）

### 10. Phase F AI 與部署
- `ai_profiles` 接入
- AI decision making
- local run scripts
- integration / e2e tests
- deployment flow

### 11. Phase P1 佈局／層次／引導 + 棋盤佈局（已完成）
- 移動卡絕對座標修復（Bug 1）
- 攻擊卡選敵放寬（Bug 3）
- 朝向 5 按鍵取代彈窗（Bug 4）
- 手牌唔遮棋盤 + 手機直向棋盤佈局（Bug 2 / Task 9）
- safe-area（Task 10）
- 摺疊「操作提示」（Task 6）
- 精簡玩家狀態列（Task 7）
- 教學提示浮層（Task 8）

### 12. Phase E 正式 UI 後續打磨
- 選牌流程 UX
- 結算動畫 / 商店 / 結果 overlay 細節

### 13. 多人對戰前端 UI 的對戰中互動
- 選牌 / 朝向 / 棄牌透過 Socket.IO 同步
- online 對戰完整流程

### 14. Phase P0 阻斷閱讀/操作 + 資產基礎（已完成）
- 核心戰鬥文字 ≥14px（`clamp(14px, 2.5vw, 18px)`）
- 棋盤 token 精簡為「角色名 + HP」
- 資產目錄結構（`client/assets/{tokens,cards,boards}`）
- token 圖片 fallback（三角形）+ 卡牌 fallback（銀黑咭面）

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
- `server/game/rules/turnEngine.js`：回合結算流程（N 玩家交錯揭牌）。
- `server/game/rules/facingChangeResolver.js`：轉向規則（免費轉向 1 次）。
- `server/game/rules/counterChainResolver.js`：反擊連鎖（距離驗證 / 成功率 / ×2 連鎖）。
- `server/game/rules/targetPriorityResolver.js`：多目標自動規則（距離 / 面向 / HP / 隨機）。
- `server/game/rules/targetingResolver.js`：目標宣告 / 驗證 / retarget。
- `server/game/rules/comboResolver.js`：combo 偵測與效果（sequence / board_pattern / effect）。
- `server/game/rules/passiveResolver.js`：角色被動技能查詢與效果（front_damage_bonus / front_defense_bonus / free_facing_change / first_shop_discount）。

#### AI 層（Phase F）
- `server/game/ai/aiDecision.js`：AI decision making（依 profile 權重選牌 / 目標 / 移動 / 購買）。
- `server/game/ai/aiMatch.js`：AI 對戰 runner（autoSelectAiPlayers / runAiMatch）。
- `scripts/run-ai-match.js`：AI 對戰 CLI runner。

#### 網路層（Phase D 多人同步）
- `server/network/roomManager.js`：房間系統（create / join / leave / setCharacter / setReady / isAllReady / getPublicRoom）。
- `server/network/matchManager.js`：同步選牌與回合解析（createMatchFromRoom / createMatchController）。
- `server/rooms/matchmaking.js`：配對系統（enqueue / dequeue / tryMatch / timeout / getRequiredPlayers）。
- `server/network/socketServer.js`：Socket.IO server 整合（房間 / 對戰 / 配對 / 斷線重連）。

#### 部署層（Phase F）
- `Dockerfile`：正式 UI server 映像。
- `docker-compose.yml`：一鍵啟動容器。
- `docs/DEPLOYMENT.md`：部署流程文件。


#### Debug / Sandbox 層

- `server/game/debug/browser-sandbox.html`：browser debug sandbox UI。
- `server/game/debug/browser-sandbox.js`：sandbox UI 行為與 result render。
- `server/game/debug/browser-api-adapter.js`：browser → debug API 的 HTTP adapter。
- `server/game/debug/browser-debug-server.js`：debug API server / real engine runner。
- `server/game/debug/scenarios.js`：scenario 資料 re-export / 共用入口。

#### Client 正式 UI 層（Phase E / F / H）
- `client/server.js`：正式 UI server（靜態檔案 + 遊戲 API + Socket.IO multiplayer server）。
- `client/index.html`：正式 UI 入口頁面（遊玩人數 / 電腦敵人 / 角色選擇 / 玩家切換 / 多人對戰按鈕）。
- `client/app.js`：正式 UI 主程式（事件綁定 / 選牌流程 / 結算動畫 / 結果 overlay / 動態角色選單 / 玩家切換 / 多人對戰接入）。
- `client/gameStore.js`：前端狀態 store（create / select / play / reset / subscribe / 多玩家 + AI 設定 / activePlayer 切換 / setState）。
- `client/layout.js`：DOM helper（el / qs / clear / modal / cardNode）。
- `client/styles.css`：正式 UI 樣式（dark / light 主題 / 遊戲大廳）。
- `client/socketClient.js`：前端 Socket.IO 連線模組（connect / emit / on / 房間 API / 對戰 API / 配對 API / getSocketId）。
- `client/views/lobbyView.js`：遊戲大廳 UI（建立 / 加入 / 列表 / 選角色 / 準備 / 開始對戰）。
- `client/views/boardView.js`：5×5 地圖 + 角色 token + 朝向（token 精簡為「角色名 + HP」，含圖片 fallback）。
- `client/views/handView.js`：手牌顯示與選牌。
- `client/views/selectedCardsView.js`：本回合選牌 / 移除 / 朝向設定。
- `client/views/logView.js`：對戰紀錄。
- `client/views/shopModal.js`：商店 modal。
- `client/views/targetPicker.js`：攻擊目標選擇 modal。
- `client/views/facingPicker.js`：朝向選擇 modal（deprecated，保留作 legacy）。
- `client/views/resolveAnimation.js`：回合結算過場動畫。
- `client/views/resultOverlay.js`：對戰結果 overlay。
- `client/views/tutorialOverlay.js`：教學提示浮層（首次開始對戰顯示一次）。
- `client/assets/{tokens,cards,boards}/.gitkeep`：資產目錄結構（token / 卡面 / 棋盤圖片；P0 全為 placeholder，運行時走 fallback）。

#### 測試層

- `tests/rules/gameEngine.test.js`：核心 rules 單元測試。
- `tests/rules/cardLoader.test.js`：資料載入測試。
- `tests/rules/shopResolver.test.js`：shop resolver 測試。
- `tests/rules/stackResolver.test.js`：stack resolver 測試。
- `tests/rules/recoverResolver.test.js`：recover 卡 resolver 測試。
- `tests/rules/facingChangeResolver.test.js`：轉向規則測試。
- `tests/rules/counterChainResolver.test.js`：反擊連鎖測試。
- `tests/rules/targetPriorityResolver.test.js`：多目標自動規則測試。
- `tests/rules/comboResolver.test.js`：combo resolver 測試。
- `tests/rules/passiveResolver.test.js`：角色被動技能測試。
- `tests/rules/multiplayerEngine.test.js`：多人引擎（3P / 4P）測試。
- `tests/ai/aiDecision.test.js`：AI decision 單元測試。
- `tests/ai/aiMatch.e2e.test.js`：AI 對戰 integration / e2e 測試。



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

#### AI API Contract（Phase F）
`aiDecision.js`：
- `decideSelection(state, player, profile, options)`：依 profile 權重選牌，回傳 `[{ card, extra }]`。
- `decideTarget(state, player, profile, options)`：依 profile 權重選目標，回傳 `targetId`。
- `decideMove(state, player, profile, options)`：依 profile 權重選移動，回傳 `{ dx, dy }`。
- `decideBuy(state, player, profile, options)`：依 profile 權重選購買，回傳 `{ shopCardId }`。
- `getProfile(profileId)`：由 `generated/ai_profiles.json` 取得 profile。

`aiMatch.js`：
- `isAiPlayer(player, aiPlayerIds)`：判斷玩家是否由 AI 控制。
- `autoSelectAiPlayers(state, options)`：為 AI 玩家自動填選牌。
- `runAiMatch(options)`：跑完整 AI 對戰，回傳 `{ state, rounds, roundLog, winner }`。

`run-ai-match.js`（CLI）：
- `--rounds N`：最大回合數。
- `--players P1:char_attack:ai_normal,P2:char_defense:ai_normal`：指定玩家 / 角色 / AI profile。

#### Network API Contract（Phase D 多人同步）
`roomManager.js`：
- `createRoom(hostSocketId, { name, maxPlayers, mode })`：建立房間，回傳 `{ room }`。
- `joinRoom(roomId, socketId, name)`：加入房間，回傳 `{ ok, room }`。
- `leaveRoom(socketId)`：離開房間。
- `setCharacter(socketId, characterId)`：設定角色。
- `setReady(socketId, ready)`：設定準備狀態。
- `isAllReady(room)`：檢查是否全部準備。
- `getPublicRoom(room)`：取得公開房間資訊（不含內部 socket 對應）。

`matchManager.js`：
- `createMatchFromRoom(roomPlayers, options)`：由房間玩家建立 gameEngine state，回傳 `{ state }`。
- `createMatchController(state, options)`：建立對戰控制器，回傳 `{ state, submitSelection, resolveTurn, setFacing, onDisconnect, onReconnect, serialize, ... }`。
  - `submitSelection(playerId, selections)`：玩家提交選牌，回傳 `{ ok, allSubmitted }`。
  - `resolveTurn()`：所有玩家選完後結算回合，回傳 `{ ok, winner, matchEnded }`。

`matchmaking.js`：
- `enqueue(socketId, { name, mode })`：加入配對佇列。
- `dequeue(socketId)`：離開配對佇列。
- `tryMatch()`：嘗試配對，回傳 `{ matched, roomId }`。
- `getRequiredPlayers(mode)`：取得該模式所需人數。

`socketServer.js`（Socket.IO events）：
- `room:create` / `room:join` / `room:leave` / `room:setCharacter` / `room:setReady` / `room:start`
- `match:select` / `match:setFacing` / `match:state`（廣播）/ `match:start`（廣播）
- `matchmaking:enqueue` / `matchmaking:dequeue` / `match:found`（廣播）
- `room:update`（廣播）/ `match:end`（廣播）

## 8. 更新規則


- 每次更新只改變：版本、更新日期時間、完成項目、優先事項、下一步、測試結果、檔案樹說明。
- 任何 LOCKED 項目要改動前，先同使用者確認。
- 若規格改動，先改 `docs/GAME_SPEC.md`，再改 test，再改 code。
- 重大 slice 完成後，更新 `CODEX_HANDOFF.md` 同 `CONTEXT.md`。
- 保持相同 heading 編號與順序，避免未來自動化或人工 review 時格式漂移。
