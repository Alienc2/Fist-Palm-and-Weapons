# CONTEXT.md V28

---
## 1. 程式基本資料
- 名稱：Fist Palm and Weapons
- 版本：V28
- 更新日期時間：2026-08-11 21:30 HKT












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
- `shopResolver` 正式化（SLICE-C-01）
- `stackResolver` 正式化（SLICE-C-02）
- `recover` 卡 resolver 正式化（SLICE-C-03）
- `facingChange` 轉向規則正式化（SLICE-C-04）
- `counterChain` 反擊連鎖完整化（SLICE-C-05）
- `targetPriority` 多目標自動規則正式化（SLICE-D-01）
- `comboResolver` 正式化（SLICE-D-02）
- `passiveResolver` characters passive 接入（SLICE-D-03）
- 多人引擎擴充（SLICE-D-04）
- Phase E 正式 UI 骨架（SLICE-E-01：client server 靜態 + 遊戲 API、index.html、gameStore、layout、app、styles）
- Phase E 正式 UI 視圖（SLICE-E-02：board / hand / selected / log / shop / target / facing / resolve / result）
- `tests/rules/shopResolver.test.js`
- `tests/rules/stackResolver.test.js`
- `tests/rules/recoverResolver.test.js`
- `tests/rules/facingChangeResolver.test.js`
- `tests/rules/counterChainResolver.test.js`
- `tests/rules/targetPriorityResolver.test.js`
- `tests/rules/comboResolver.test.js`
- `tests/rules/passiveResolver.test.js`
- `tests/rules/multiplayerEngine.test.js`
- Phase F AI 與部署（SLICE-F-01：`ai_profiles` 接入 + AI decision + local run scripts + integration / e2e tests + deployment flow）
- `server/game/ai/aiDecision.js`：AI decision making（依 profile 權重選牌 / 目標 / 移動 / 購買）
- `server/game/ai/aiMatch.js`：AI 對戰 runner（autoSelectAiPlayers / runAiMatch）
- `scripts/run-ai-match.js`：AI 對戰 CLI runner
- `tests/ai/aiDecision.test.js`：AI decision 單元測試
- `tests/ai/aiMatch.e2e.test.js`：AI 對戰 integration / e2e 測試
- `Dockerfile` / `docker-compose.yml`：部署映像與容器
- `docs/DEPLOYMENT.md`：部署流程文件
- AI 對戰接入正式 UI（SLICE-F-02：`client/server.js` 支援 AI 玩家 + 自動選牌、`index.html` 遊玩人數 / 電腦敵人選擇、`app.js` 動態角色選單 + 玩家切換、`gameStore` 多玩家 + AI 設定）
- Phase D 多人同步網路層（SLICE-D-05：Socket.IO room / lobby / match / matchmaking）
- `server/network/roomManager.js`：房間系統（create / join / leave / setCharacter / setReady / isAllReady）
- `server/network/matchManager.js`：同步選牌與回合解析（createMatchFromRoom / createMatchController）
- `server/rooms/matchmaking.js`：配對系統（enqueue / dequeue / tryMatch / timeout）
- `server/network/socketServer.js`：Socket.IO server 整合（房間 / 對戰 / 配對 / 斷線重連）
- `client/server.js` 已附加 Socket.IO multiplayer server
- `tests/network/roomManager.test.js`：房間系統單元測試
- `tests/network/matchManager.test.js`：同步選牌單元測試
- `tests/network/matchmaking.test.js`：配對系統單元測試
- `tests/network/socketServer.e2e.test.js`：Socket.IO 多人對戰 E2E 測試
- 多人對戰前端 UI（SLICE-H-01：`client/socketClient.js` Socket.IO client 模組 + `client/views/lobbyView.js` 大廳 UI + `client/app.js` 接入 + `client/gameStore.js` setState + `client/index.html` 多人對戰按鈕 + `client/styles.css` 大廳樣式）
- `client/socketClient.js`：前端 Socket.IO 連線模組（connect / emit / on / 房間 API / 對戰 API / 配對 API / getSocketId）
- `client/views/lobbyView.js`：遊戲大廳 UI（建立 / 加入 / 列表 / 選角色 / 準備 / 開始對戰）
- `client/app.js` 已接入多人對戰（`#lobbyButton` 開啟大廳、`bindSocketEvents` 監聽 match:start / match:state / match:end）
- `client/gameStore.js` 已新增 `setState(state)`（由 server 廣播直接設定狀態）
- `client/index.html` 已新增「多人對戰」按鈕 + 載入 `/socket.io/socket.io.js`
- `client/styles.css` 已新增遊戲大廳樣式（lobby / room list / player status）
- Phase J-01 補齊：2–4 人完整對戰 E2E、壓力測試
- `tests/ai/aiMatch.4p.test.js`：4P AI 對戰 E2E 測試
- `tests/network/socketServer.e2e.test.js` 已擴充 3P / 4P 多人對戰 E2E 流程
- `tests/stress/stress.test.js`：壓力測試（20 場並發 AI 對戰 / 100 回合長時間對戰 / 20 個 socket client）
- `package.json` 已新增 `test:network`、`test:stress` 指令
- Phase J-02 補齊：CI/CD（GitHub Actions）
- `.github/workflows/ci.yml`：CI（main push + PR 觸發，build + test:all + verify:local）
- `.github/workflows/docker.yml`：Docker 建置驗證（build + /api/health）
- `docs/DEPLOYMENT.md` 已補測試指令總覽與 GitHub Actions CI 說明
- Phase I-02 優化：手牌上限 UI 選擇、牌庫重洗
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
- `client/layout.js` `normalizeClientCard`：將可能係字串嘅數值欄位（mp_cost / buy_cost / range_min / range_max / move_min / move_max / damage / block_value / hp_gain / mp_gain / draw_count）統一轉為 number，令 `boardView` 距離 / 移動判定同 `cardNode` 卡面顯示正確
- `client/layout.js` `cardNode`：`buyCost` 判斷改為 `> 0`，避免空字串轉 0 後誤顯示「解封 0 MP」
- `client/app.js` `syncPlayerCountLimits`：遊玩人數 / 電腦敵人選項即時同步上限，令總對戰人數永遠 ≤ 4（例如 humanCount=4 時 aiCount 只能 0）
- `client/styles.css`：`.board-cell` 用 `width/height: min(calc(80vh / 5), 140px)` 令 cell 保持正方形並隨畫面縮放
- Phase I-02-J2：前端卡牌資料序列化修正（卡面 / 移動 / 攻擊 bug 根因）
- `shared/cardLoader.js` `normalizeCard`：補 `aliasGroup`（`alias_group`）與 `description`（`description_template`）欄位，令前端卡面顯示正確名稱 / 副類別 / 描述
- `client/server.js` `serializeCard`：改為讀 camelCase 欄位（`name` / `aliasGroup` / `description` / `moveMin` / `moveMax` / `rangeMin` / `rangeMax` / `targeting`），解決前端收到 `id` 當名稱、移動卡只能移到同一格、攻擊卡不能選敵人嘅根因
- `client/styles.css`：`.board-cell` 尺寸改為 `min(calc(80vh / 5), 140px)` 並用 `aspect-ratio: 1` 保持正方形，令 5×5 棋盤按比例縮放
- `client/styles.css`：`.board-cell` 尺寸改為 `min(calc(80vh / 5), 140px)` 並用 `aspect-ratio: 1` 保持正方形，令 5×5 棋盤按比例縮放
- `client/views/boardView.js` + `client/index.html`：移動 / 攻擊選擇模式提示移到右邊「解封武功」下方（`#boardSelectionHintPanel`），避免遮住棋盤
- Phase I-02-K：對戰體驗修正（MP / 移動 / 對戰記錄 / 扇形 / 攻擊標注）
- `server/game/rules/cardResolver.js` `resolveMove`：移動卡改用絕對座標（`extra.targetX/targetY`），避免交錯揭牌時相對位移累積誤差；禁止移動到被佔據格
- `client/views/logView.js`：對戰記錄顯示回合數 / 卡牌數 / 角色名（`name_zh`）
- `client/views/handView.js` + `client/styles.css`：扇形 8 張唔超出視窗（依手牌數縮放角度 / 位移）
- `client/views/boardView.js` + `client/styles.css`：攻擊範圍標注語意（可攻擊敵人用紅色 `.is-attack-target`，移動格用綠色 `.is-move-target`）
- `tests/rules/multiplayerEngine.test.js`：移動測試改用 `extra.targetX/targetY`（對齊絕對座標）
- `tests/rules/recoverResolver.test.js`：MP 預期更新（recover +1 + 回合補 3，clamp 到 maxMp 5 → 5）
- Phase P1：佈局／層次／引導 + 棋盤佈局（UI bug 修正 + UI 打磨）
- `client/views/boardView.js`：移動格 click 改用絕對座標 `{ targetX, targetY }`（對齊 server `cardResolver`），`getPredictedPosition` 同樣改讀 `targetX/targetY`（唔再讀 dx/dy）
- `client/views/boardView.js` `getAttackTargets`：移除距離篩選，改高亮全部未淘汰敵人（server 結算把關距離）
- `client/views/selectedCardsView.js`：朝向改為 5 個按鍵（上▲ / 下▼ / 左◀ / 右▶ / 保持），「保持」→ `"none"`，即時 `setPendingFacing`，依 `getPendingFacing || player.facing` 加 `.is-active` 高亮；移除 `openFacingPicker` import
- `client/views/facingPicker.js`：標示為 deprecated（不再由主流程引用，保留作 legacy）
- `client/styles.css`：新增 `--topbar-height: 70px` / `--hand-height: 264px`，`.app-shell` 底部預留手牌高度、`.board-view` / `.board-grid` 高度改用 `100vh - topbar - hand`，直向 media query（棋盤置中 / 單欄 / 面板收合），`.facing-option.is-active` 高亮
- `client/styles.css`：safe-area（`.topbar` / `.hand-panel` / `.hand-view` 用 `env()` + `max()` fallback）、`.help-panel`（`<details>` 摺疊操作提示）、`.tutorial-dialog` / `.tutorial-steps`（教學浮層）
- `client/index.html`：viewport 加 `viewport-fit=cover`、控制面板「操作提示」改為 `<details>`（預設收起）、新增 `#tutorialRoot`
- `client/app.js`：`renderPlayerStatus` 移除座標與朝向 span（保留 P ID / 角色名 / HP / MP）、`startMatchButton` / `newMatchButton` 成功後呼叫 `maybeShowTutorial()`
- `client/views/tutorialOverlay.js`：新增教學提示浮層（首次開始對戰顯示一次，localStorage 記住已睇過）
- 註：移動修復回歸守門為 `tests/rules/multiplayerEngine.test.js`（已用 targetX/targetY）
- Phase P0：阻斷閱讀/操作 + 資產基礎（字型 ≥14px、精簡 token、資產目錄、token/卡牌圖片 fallback）
- `client/views/boardView.js`：抽出 `renderToken(occupant, state)`；token 只顯示「P# / 角色名 / HP」，移除 `token-facing` / `token-mp` 文字；新增 `SLOT_COLORS`（前端玩家槽定色：P1 red / P2 blue / P3 green / P4 yellow，`state.players.indexOf % 4`）、`normalizeFacing`（用 `FACING_ARROW` key 正規化）；圖片 src 為 `assets/tokens/token_<name_zh>_<color>_<facing>.png`，404 時 `onerror` → 三角形 fallback（CSS `clip-path` + 依 facing 旋轉 + 槽色圍邊 + 角色名 + HP）
- `client/layout.js` `cardNode()`：新增 `showBack` option（卡背契約，暫無 view 使用）；卡面圖層 `assets/cards/<id>.png`，圖片載入成功隱藏文字層、404 時移除圖片保留銀黑咭面 + 文字
- `client/styles.css`：核心戰鬥文字提升至 `clamp(14px, 2.5vw, 18px)`（`.card-desc` / `.log-entry` / `.token-name` / `.token-hp`，`.card-name` 原本已符合唔改）；移除 `.token-mp`；新增 `.token-img` / `.token-fallback-triangle`（`token-facing-up/down/left/right` 旋轉）/ `.card-img` / `.card-face-layer`
- `client/assets/{tokens,cards,boards}/.gitkeep`：資產目錄結構（git 追蹤空目錄；P0 資產全部為 placeholder，故執行後 token 走三角形 fallback、卡牌走銀黑 fallback 屬預期）
- 決策：token 顏色唔用引擎 `occupant.tokenColor`（CSV 為 snake_case `token_color`，實戰中常係 undefined），改由前端玩家槽 index 定色；卡牌 id 命名如 `basic_punch_1`，卡面 = `assets/cards/<id>.png`、卡背 = `card_back_default.png`
- Phase P2：觸控舒適度 + 動畫系統（server 結構化事件流 + 前端動畫）
- `server/game/state/createInitialState.js`：新增 `events: []`（回合事件流容器）
- `server/game/rules/turnEngine.js`：`resolveTurn` 開始重置 `state.events` 並 emit `round`；`startRound` emit `regen`（round>1）；`drawPhase` emit `draw`；`resolveCardByType` 每張揭牌 emit `reveal`；`applyFacingChange` 後 emit `facing`；`resolveEliminations` 後 emit `eliminate`
- `server/game/rules/cardResolver.js`：新增 `emit(state, ev)` helper；`resolveAttack` 每個 target emit `attack`（含 miss / block / finalDamage / combo）、`resolveDefense` emit `defend`、`resolveMove` emit `move`（from/to）、`resolveBuy` emit `buy`、`resolveRecover` emit `recover`
- `server/game/rules/comboResolver.js` emit `combo`；`counterChainResolver.js` emit `counter`（success / reflectedDamage）
- `server/game/gameEngine.js`：新增 `takeEvents(state)`（取回並清空 `state.events`）
- `client/server.js` `/api/play`：回傳 `{ ok, state, events: takeEvents(matchState) }`
- `client/gameStore.js`：`playTurn()` 暫存 `lastEvents`；`createMatch` / `reset` 清空
- `server/network/matchManager.js`：`resolveTurn` 取 events 並傳給 `onRoundComplete(state, events)`
- `server/network/socketServer.js`：`match:round` payload 加 `events`
- `client/app.js`：結算改用事件驅動動畫（`playResolveAnimation({ round, players, events })`）；`bindSocketEvents` 新增 `match:round` handler
- `client/views/resolveAnimation.js`：重寫為事件驅動（reveal 飛向中央 / attack 飛向目標 + 傷害 popup / move / defend / combo / counter / miss 動畫），全部事件播完先出 HP/MP 摘要 overlay
- `client/views/boardView.js`：新增 `tokenCache` + `getTokenEl` / `resetTokenCache` / `playTokenMove` / `playTokenAction`（attack / defend / combo / miss / hit / counter）
- `client/styles.css`：任務 11 主按鈕 ≥44px（mini ≥36px）；任務 12 `.hand-fan` 加橫向掃（`overflow-x:auto`）+ 卡寬 `clamp(120px,18vw,160px)`；新增 `.anim-layer` / `.anim-card` / `.anim-damage` / `.token-move` / `.token-anim-*` keyframes
- `client/views/handView.js`：`baseWidth` / `overlap` 對齊新卡寬（160 / 32）
- `tests/rules/eventStream.test.js`：新增事件流測試（move → attack → defend → buy → combo；takeEvents）
- `tests/rules/createInitialState.test.js`：斷言 `state.events` 係 array


### 已驗證結果



- `npm run build:data` 通過
- `npm run test:rules` 通過
- `npm run test:ai` 通過
- 全套 `npx jest --runInBand`：`Test Suites: 37 passed, 37 total`；`Tests: 287 passed, 287 total`（全綠，含 `tests/network/socketServer.e2e.test.js` 與 `tests/stress/stress.test.js`）
- 前端 JS 語法檢查通過（temp `.mjs` copy，`node --check`；resolveAnimation / boardView / handView / app / gameStore 全部 OK）
- `/api/play` 事件流 smoke test 通過（round, reveal, move, reveal, defend, reveal, attack, draw, draw, regen, regen）




- 正式 UI server AI 整合 smoke test 通過（createMatch 含 AI 玩家 → `/api/play` 自動選牌 → 回合結算）
- 網路層測試通過：`tests/network/roomManager.test.js`、`tests/network/matchManager.test.js`、`tests/network/matchmaking.test.js`、`tests/network/socketServer.e2e.test.js`（44 tests）
- 正式 UI server 已附加 Socket.IO multiplayer server，`GET /api/health` 通過
- 多人對戰前端 UI smoke test 通過：`client/server.js` 啟動後 `/api/health`、`/socket.io/socket.io.js`、`/`、`/app.js`、`/socketClient.js`、`/views/lobbyView.js` 全部 HTTP 200



- `tests/ai/aiDecision.test.js`：通過
- `tests/ai/aiMatch.e2e.test.js`：通過
- `node scripts/run-ai-match.js --rounds 5` 通過
- `tests/rules/recoverResolver.test.js`：9 passed, 9 total
- `tests/rules/facingChangeResolver.test.js`：10 passed, 10 total
- `tests/rules/counterChainResolver.test.js`：14 passed, 14 total
- `tests/rules/cardLoader.test.js`：10 passed, 10 total
- `tests/rules/passiveResolver.test.js`：11 passed, 11 total
- `tests/rules/multiplayerEngine.test.js`：6 passed, 6 total
- `tests/rules/shopResolver.test.js` 通過
- `tests/rules/stackResolver.test.js` 通過
- `tests/rules/targetPriorityResolver.test.js` 通過
- `tests/rules/comboResolver.test.js` 通過



- browser sandbox 已成功運行 3 個 scenario
- `tests/debug/browser-debug-server.test.js` 通過
- `POST /api/run-scenario` smoke / integration test 已驗證：
  - valid scenario → `200`
  - unknown scenario → `404`
  - invalid body → `400`

### LOCKED 項目（改動前先確認）
以下項目後續更新時不能隨意改，需先跟你確認：
- `docs/GAME_SPEC.md` 的核心規則定義
- Rules API Contract 的 selection item / resolver signature / extra payload 格式
- `generated/*.json` 作為資料來源的單一事實來源
- `server/game/debug/browser-debug-server.js` 的 `/api/run-scenario` contract
- `browser-sandbox.js` 只透過 API adapter 呼叫 scenario，不直接 import engine
- move log expectation 以 `initial position + extra.dx + extra.dy` 推導
- `browser-engine-adapter.js` 只可作 legacy / deprecated experiment / reference，不可重回主流程

### Scenario source of truth
shared scenario JSON 係 browser / server / CLI 的 single source of truth。  
`server/game/debug/scenarios.js` 只負責 re-export 或包裝，不應再次手寫另一份 payload。  
任何 scenario payload 改動，必須先改 shared JSON source，再同步驗證 CLI runner、debug API、browser sandbox。

### SLICE-46-3A starter deck 組裝規則
- 已完成 starter deck 組裝規則測試與收口。
- starter deck 依 `Default_Card_Set`、`ALL`、`No_of_Cards_in_Hand` 決定組裝內容。
- 空字串 starter set 視為不使用；`ALL` 視為通用。
- starter deck 為空時必須 fail-fast。
- `tests/rules/createInitialState.starterDeck.test.js` 已納入 rules 測試覆蓋。

## 5. 當前優先完成的程式碼
### P0
- Phase D 已收口：多目標 / combo / passive / 多人引擎正式化。
- Phase E 正式 UI 已完成（SLICE-E-01 骨架 + SLICE-E-02 視圖）。
- Phase F AI 與部署已完成（SLICE-F-01：`ai_profiles` 接入 + AI decision + local run scripts + integration / e2e tests + deployment flow）。
- AI 對戰接入正式 UI 已完成（SLICE-F-02：正式 UI 可選遊玩人數 / 電腦敵人，`/api/play` 自動為 AI 玩家選牌）。
- Phase D 多人同步網路層已完成（SLICE-D-05：Socket.IO room / lobby / match / matchmaking）。
- 多人對戰前端 UI 已完成（SLICE-H-01：Socket.IO client 接入正式 UI，online 2P / 3P / 4P 遊玩）。
- Phase I-02 優化已完成：手牌上限 UI 選擇（discardPicker）、牌庫重洗（drawCards 重洗棄牌堆）、起始牌庫 shuffle、起始朝向指向中心、basic_buy 永久固定、免費轉向延後到最後。
- Phase I-02-E 已完成：board_pattern combo 修正（方案 A，揭牌時針對實際 target 偵測）。
- Phase I-02-E2 已完成：攻擊目標 bug 修正（`target_rule` 映射到 `targeting`、`getDefaultEnemyTarget` 尊重 `preferredTargetId`）。
- Phase I-02-E3 已定案：卡牌效果預測列為 UI 預覽功能（I-02-H4），server 執行順序保持即時累計。
- Phase I-02-F 已完成：對戰設定 UI 隱藏 + 對戰記錄移到左上。
- Phase I-02-G 已完成：5×5 棋盤高度限制（唔超過畫面 4/5）。
- Phase I-02-H 已完成：手牌扇形 + 啤牌比例 + 完整資料排法 + 打出嘅牌喺棋盤上方列出。
- Phase I-02-H2 已完成：移動卡直接喺棋盤高亮可移動範圍 + 點擊地圖選擇。
- Phase I-02-H3 已完成：攻擊卡直接喺棋盤高亮可攻擊敵人 + 點擊敵人選擇。
- Phase I-02-H4 已完成：卡牌效果預測（UI 預覽，攻擊距離用移動後位置）。
- Phase I-02-I 已完成：商店→解封 文字統一。
- Phase I-02-K 已完成：對戰體驗修正（每回合補 3 MP / 移動卡絕對座標 / 對戰記錄回合數與卡牌數 / 扇形 8 張唔超出視窗 / 攻擊範圍紅色標注）。
- 全套 `npx jest --runInBand` 已達 `36 suites / 284 tests` 全綠。
- `npm run client` 正式 UI server 已可啟動，`/api/health` 通過，Socket.IO multiplayer server 已附加。
- `npm run ai:match` AI 對戰 CLI 已可執行。
- Phase P1 已完成：佈局／層次／引導 + 棋盤佈局（移動卡絕對座標修復、攻擊卡選敵放寬、朝向 5 按鍵、手牌唔遮棋盤、safe-area、摺疊操作提示、精簡玩家狀態列、教學提示浮層）。
- Phase P0 已完成：阻斷閱讀/操作 + 資產基礎（核心戰鬥文字 ≥14px、棋盤 token 精簡為「角色名 + HP」、資產目錄、token/卡牌圖片 fallback）。因 P0 資產全部為 placeholder，執行後 token 走三角形 fallback、卡牌走銀黑 fallback 屬預期。
- Phase P2 已完成：觸控舒適度 + 動畫系統（server 結構化回合事件流 `state.events` + `takeEvents`、`/api/play` / `match:round` 回傳 events；按鈕 ≥44px、手牌橫向掃、咭牌飛向中央/目標 + 傷害 popup、token 移動/攻擊/防禦/連擊/Miss 動畫）。





### P1
- 多人對戰前端 UI 的對戰中互動（選牌 / 朝向 / 棄牌透過 Socket.IO 同步，online 對戰完整流程）
- Phase E 正式 UI 後續打磨（選牌流程 UX / 動畫 / 商店 / 結果 overlay 細節）

## 6. 下一個需要完成的程式碼
- 多人對戰前端 UI 的對戰中互動（選牌 / 朝向 / 棄牌透過 Socket.IO 同步，online 對戰完整流程）
- Phase E 正式 UI 後續打磨（選牌流程 UX / 動畫 / 商店 / 結果 overlay 細節）






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
- `server/game/rules/turnEngine.js`：回合結算流程（N 玩家交錯揭牌）
- `server/game/rules/shopResolver.js`：商店購買 / MP / stock 流程
- `server/game/rules/stackResolver.js`：stack 累積 / 清算流程
- `server/game/rules/facingChangeResolver.js`：轉向規則（免費轉向 1 次）
- `server/game/rules/counterChainResolver.js`：反擊連鎖（距離驗證 / 成功率 / ×2 連鎖）
- `server/game/rules/targetPriorityResolver.js`：多目標自動規則（距離 / 面向 / HP / 隨機）
- `server/game/rules/targetingResolver.js`：目標宣告 / 驗證 / retarget
- `server/game/rules/comboResolver.js`：combo 偵測與效果（sequence / board_pattern / effect）
- `server/game/rules/passiveResolver.js`：角色被動技能查詢與效果（front_damage_bonus / front_defense_bonus / free_facing_change / first_shop_discount）

### AI 層（Phase F）
- `server/game/ai/aiDecision.js`：AI decision making（依 profile 權重選牌 / 目標 / 移動 / 購買）
- `server/game/ai/aiMatch.js`：AI 對戰 runner（autoSelectAiPlayers / runAiMatch）
- `scripts/run-ai-match.js`：AI 對戰 CLI runner

### 網路層（Phase D 多人同步）
- `server/network/roomManager.js`：房間系統（create / join / leave / setCharacter / setReady / isAllReady / getPublicRoom）
- `server/network/matchManager.js`：同步選牌與回合解析（createMatchFromRoom / createMatchController）
- `server/rooms/matchmaking.js`：配對系統（enqueue / dequeue / tryMatch / timeout / getRequiredPlayers）
- `server/network/socketServer.js`：Socket.IO server 整合（房間 / 對戰 / 配對 / 斷線重連）

### 部署層（Phase F）
- `Dockerfile`：正式 UI server 映像
- `docker-compose.yml`：一鍵啟動容器
- `docs/DEPLOYMENT.md`：部署流程文件


### Debug / Sandbox 層

- `server/game/debug/browser-sandbox.html`：browser debug sandbox UI
- `server/game/debug/browser-sandbox.js`：sandbox UI 行為與 result render
- `server/game/debug/browser-api-adapter.js`：browser → debug API 的 HTTP adapter
- `server/game/debug/browser-debug-server.js`：debug API server / real engine runner
- `server/game/debug/scenarios.js`：scenario 資料 re-export / 共用入口

### Client 正式 UI 層（Phase E / F）
- `client/server.js`：正式 UI server（靜態檔案 + 遊戲 API：`/api/health`、`/api/match`、`/api/select`、`/api/play`、`/api/reset`；`/api/play` 會先為 AI 玩家自動選牌再結算）
- `client/index.html`：正式 UI 入口頁面（遊玩人數 / 電腦敵人 / 角色選擇 / 玩家切換）
- `client/app.js`：正式 UI 主程式（事件綁定 / 選牌流程 / 結算動畫 / 結果 overlay / 動態角色選單 / 玩家切換）
- `client/gameStore.js`：前端狀態 store（create / select / play / reset / subscribe / 多玩家 + AI 設定 / activePlayer 切換）

- `client/layout.js`：DOM helper（el / qs / clear / modal / cardNode）
- `client/styles.css`：正式 UI 樣式（dark / light 主題）
- `client/views/boardView.js`：5×5 地圖 + 角色 token + 朝向（token 精簡為「角色名 + HP」，含圖片 fallback）
- `client/views/handView.js`：手牌顯示與選牌
- `client/views/selectedCardsView.js`：本回合選牌 / 移除 / 朝向設定
- `client/views/logView.js`：對戰紀錄
- `client/views/shopModal.js`：商店 modal
- `client/views/targetPicker.js`：攻擊目標選擇 modal
- `client/views/facingPicker.js`：朝向選擇 modal（deprecated，保留作 legacy）
- `client/views/resolveAnimation.js`：回合結算過場動畫
- `client/views/resultOverlay.js`：對戰結果 overlay
- `client/views/tutorialOverlay.js`：教學提示浮層（首次開始對戰顯示一次）
- `client/socketClient.js`：前端 Socket.IO 連線模組（connect / emit / on / 房間 API / 對戰 API / 配對 API / getSocketId）
- `client/views/lobbyView.js`：遊戲大廳 UI（建立 / 加入 / 列表 / 選角色 / 準備 / 開始對戰）
- `client/assets/{tokens,cards,boards}/.gitkeep`：資產目錄結構（token / 卡面 / 棋盤圖片；P0 全為 placeholder，故運行時走 fallback）

### 測試層

- `tests/rules/gameEngine.test.js`：核心 rules 單元測試
- `tests/rules/cardLoader.test.js`：資料載入測試
- `tests/rules/createInitialState.test.js`：初始狀態測試
- `tests/rules/createInitialState.starterDeck.test.js`：starter deck 組裝測試
- `tests/rules/shopResolver.test.js`：商店買入流程測試
- `tests/rules/stackResolver.test.js`：stack 解析測試
- `tests/rules/recoverResolver.test.js`：recover 卡 resolver 測試
- `tests/rules/facingChangeResolver.test.js`：轉向規則測試
- `tests/rules/counterChainResolver.test.js`：反擊連鎖測試
- `tests/rules/targetingResolver.test.js`：targeting 測試
- `tests/rules/eliminationResolver.test.js`：elimination 測試
- `tests/rules/targetPriorityResolver.test.js`：多目標自動規則測試
- `tests/rules/comboResolver.test.js`：combo resolver 測試
- `tests/rules/passiveResolver.test.js`：角色被動技能測試
- `tests/rules/multiplayerEngine.test.js`：多人引擎（3P / 4P）測試



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
- browser / server / CLI 必須共用同一份 scenario 概念。
- `server/game/debug/scenarios.js` 只可作 re-export / 包裝。
- scenario 名稱要與 `move-vs-defense`、`attack-vs-attack`、`buy-vs-idle` 對齊。

### AI API Contract（Phase F）
#### `aiDecision.js`
- `decideSelection(state, player, profile, options)`：依 profile 權重選牌，回傳 `[{ card, extra }]`。
- `decideTarget(state, player, profile, options)`：依 profile 權重選目標，回傳 `targetId`。
- `decideMove(state, player, profile, options)`：依 profile 權重選移動，回傳 `{ dx, dy }`。
- `decideBuy(state, player, profile, options)`：依 profile 權重選購買，回傳 `{ shopCardId }`。
- `getProfile(profileId)`：由 `generated/ai_profiles.json` 取得 profile。

#### `aiMatch.js`
- `isAiPlayer(player, aiPlayerIds)`：判斷玩家是否由 AI 控制。
- `autoSelectAiPlayers(state, options)`：為 AI 玩家自動填選牌。
- `runAiMatch(options)`：跑完整 AI 對戰，回傳 `{ state, rounds, roundLog, winner }`。

#### `run-ai-match.js`（CLI）
- `--rounds N`：最大回合數。
- `--players P1:char_attack:ai_normal,P2:char_defense:ai_normal`：指定玩家 / 角色 / AI profile。

### Network API Contract（Phase D 多人同步）
#### `roomManager.js`
- `createRoom(hostSocketId, { name, maxPlayers, mode })`：建立房間，回傳 `{ room }`。
- `joinRoom(roomId, socketId, name)`：加入房間，回傳 `{ ok, room }`。
- `leaveRoom(socketId)`：離開房間。
- `setCharacter(socketId, characterId)`：設定角色。
- `setReady(socketId, ready)`：設定準備狀態。
- `isAllReady(room)`：檢查是否全部準備。
- `getPublicRoom(room)`：取得公開房間資訊（不含內部 socket 對應）。

#### `matchManager.js`
- `createMatchFromRoom(roomPlayers, options)`：由房間玩家建立 gameEngine state，回傳 `{ state }`。
- `createMatchController(state, options)`：建立對戰控制器，回傳 `{ state, submitSelection, resolveTurn, setFacing, onDisconnect, onReconnect, serialize, ... }`。
  - `submitSelection(playerId, selections)`：玩家提交選牌，回傳 `{ ok, allSubmitted }`。
  - `resolveTurn()`：所有玩家選完後結算回合，回傳 `{ ok, winner, matchEnded }`。

#### `matchmaking.js`
- `enqueue(socketId, { name, mode })`：加入配對佇列。
- `dequeue(socketId)`：離開配對佇列。
- `tryMatch()`：嘗試配對，回傳 `{ matched, roomId }`。
- `getRequiredPlayers(mode)`：取得該模式所需人數。

#### `socketServer.js`（Socket.IO events）
- `room:create` / `room:join` / `room:leave` / `room:setCharacter` / `room:setReady` / `room:start`
- `match:select` / `match:setFacing` / `match:state`（廣播）/ `match:start`（廣播）
- `matchmaking:enqueue` / `matchmaking:dequeue` / `match:found`（廣播）
- `room:update`（廣播）/ `match:end`（廣播）

#### `socketClient.js`（前端 Socket.IO client，Phase H）
- `connect(options)`：建立 Socket.IO 連線（`window.io` 由 `/socket.io/socket.io.js` 提供）。
- `emit(event, payload)`：Promise 化 emit（支援 ack）。
- `on(event, fn)` / `off(event, fn)`：訂閱 / 取消訂閱 server 廣播。
- `getSocketId()`：取得目前 socket id（用於判斷是否為房主）。
- 房間 API：`createRoom` / `joinRoom` / `leaveRoom` / `listRooms` / `setCharacter` / `setReady` / `startMatch`。
- 對戰 API：`submitSelection` / `setFacing` / `setPendingDiscards` / `playTurn`。
- 配對 API：`enqueueMatchmaking` / `dequeueMatchmaking`。
- 監聽廣播：`room:update` / `match:start` / `match:state` / `match:round` / `match:end` / `match:found` / `matchmaking:timeout`。


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
- `hydrateSelection(state, scenarioSelection)`：server side 由現有 state 或 generated cards 補回 card 物件。
- `readJsonBody(req)`：debug server 讀 request body 時必須驗證 JSON 與 size limit。
- `renderResult(result)`：browser sandbox 顯示 initial / p1 / p2 / final / log / error。
- `setStatus(type, text)`：browser sandbox 狀態統一顯示。

### 不可自行改動的固定習慣
- move log expectation 一律由起始座標與 `dx / dy` 推導。
- browser 端不直接 import CommonJS engine。
- real engine 只可經 debug server API 呼叫。
- generated data 變更後，先 rebuild 再驗證。

### 主流程
authoritative flow（current production debug path）：

```text
browser-sandbox.js
  -> browser-api-adapter.js
  -> POST /api/run-scenario
  -> browser-debug-server.js
  -> server-side real game engine
  -> JSON result
  -> browser render
```

browser sandbox 現時 authoritative adapter mode 係 `server-api-real-engine`。  

### Legacy / deprecated 路線
以下路線現時不應再作主流程：
- browser direct import `gameEngine.js`
- `browser-engine-adapter.js` 作為 primary adapter
- 在 browser 端直接執行 CommonJS engine

`browser-engine-adapter.js` 現時只應標示為 legacy / deprecated experiment / debugging reference。  
除非另開新 slice、先改 spec、再補 test、最後改 code，否則不可重回主流程。

### SLICE-41 authoritative data contract

#### generated data
以下 generated data 現已列為 authoritative input：
- `generated/cards.json`
- `generated/characters.json`
- `generated/keywords.json`
- `generated/combos.json`
- `generated/ai_profiles.json`

#### loader
`shared/cardLoader.js` 必須負責：
- validation
- normalization
- id lookup
- generated data snapshot

#### state initialization
`server/game/state/createInitialState.js` 必須：
- 只從 authoritative generated data 建立角色、起始手牌、牌庫、商店
- 為每張卡建立 `instanceId` 與 `definitionId`
- 建立 `stack`、`eliminatedPlayers`、`shop.stockByCardId` 等正式欄位

#### build validation
`scripts/build-data.js` build 完後必須即時呼叫 generated data validation；validation 失敗時 build 要直接 fail。

## 10. 更新規則
- 每次更新只改變：版本、更新日期時間、完成項目、優先事項、下一步、測試結果、檔案樹說明。
- 任何 LOCKED 項目要改動前，先同使用者確認。
- 若規格改動，先改 `docs/GAME_SPEC.md`，再改 test，再改 code。
- 重大 slice 完成後，更新 `CODEX_HANDOFF.md` 同本文件。
- 保持相同 heading 編號與順序，避免未來自動化或人工 review 時格式漂移。