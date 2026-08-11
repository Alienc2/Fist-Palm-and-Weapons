# P1 — 佈局／層次／引導 + 棋盤佈局

## 目標
修正 4 個 UI bug（移動失敗、棋盤被手牌遮底、攻擊卡選唔到敵、朝向彈窗），並完成 5 項 UI 打磨任務（摺疊操作提示、精簡玩家狀態列、教學提示浮層、手機直向棋盤佈局、Safe-area）。全部映射去現有 `client/` 檔案，唔做大重構。

## 現況（已核實 root cause）
- 正式 UI 檔案：`client/index.html`、`client/app.js`、`client/layout.js`、`client/gameStore.js`、`client/selectionFlow.js`、`client/views/*.js`、`client/styles.css`、`client/server.js`。
- **Bug 1**：server `resolveMove` 要絕對座標 `extra.targetX/targetY`（`server/game/rules/cardResolver.js:144-150`），但前端 `boardView.js:197-200` 送 `{dx, dy}` 相對位移 → 對戰記錄「缺少 extra.targetX / extra.targetY」。`boardView.js:56-69 getPredictedPosition` 同樣讀 `dx/dy`，要一併改。
- **Bug 3**：`boardView.js:73-85 getAttackTargets` 用 `rangeMin~rangeMax` 預篩距離；射程內無敵 → 冇任何格可點。server 結算仍會驗距離（LOCKED，唔改）。
- **Bug 4**：`selectedCardsView.js:50-56` 用「設定朝向」按鈕彈 `facingPicker` modal。
- **Bug 2**：`.hand-panel` 係 `position:fixed; bottom:0` 高 264px（`styles.css:404-421`），覆蓋棋盤底 1-2 欄；`.app-shell` 冇底部 padding 預留。

## 已定決策
1. 任務映射去現有檔案；`TutorialOverlay` 係新功能，唯一新增大檔（細檔）。
2. Bug 3：UI 唔過濾距離，高亮全部未淘汰敵人；server 保留距離驗證（結算時記錄「距離不符」）。
3. Bug 2／Task 9：桌面保留 3 欄；窄屏（手機直向）切換為棋盤置中 + 玩家牌區圍繞（P1 下、P2 上、P3 左、P4 右），並預留手牌高度防止遮底。
4. Bug 4：朝向改為「本回合選牌」面板內 5 個按鍵（上▲/下▼/左◀/右▶/保持），即時 setPendingFacing，唔彈窗。

## 任務列表

### A. 移動卡修復（Bug 1）
檔案：`client/views/boardView.js`
- 移動格 click（~L197-200）：`gameStore.addSelection(activePlayer.id, selection.card, { targetX: x, targetY: y })`（絕對座標，對齊 server + `tests/rules/multiplayerEngine.test.js` 已用 targetX/targetY）。
- `getPredictedPosition`（~L56-69）：改讀 `Number(item.extra.targetX)` / `Number(item.extra.targetY)`，唔再讀 `dx/dy`。
- 唔改 server（`cardResolver.js` 已係正確真源）。

### B. 攻擊卡選敵放寬（Bug 3）
檔案：`client/views/boardView.js`
- `getAttackTargets`：移除距離篩選，改為回傳所有 `id !== player.id && !isEliminated && position` 嘅敵人（可揀任意敵；server 結算把關距離）。
- 選擇模式提示字（~L238）可微調，強調「點擊紅色敵人」即可。

### C. 朝向改為 5 按鍵（Bug 4）
檔案：`client/views/selectedCardsView.js`、`client/views/facingPicker.js`、`client/styles.css`
- 喺 facing-row 直接用 5 個按鍵取代「設定朝向」按鈕：`上▲ / 下▼ / 左◀ / 右▶ / 保持`。每鍵 `gameStore.setPendingFacing(player.id, value)`，「保持」→ `"none"`。
- 當前 pendingFacing 對應按鍵加 `.is-active` 高亮（用 `getPendingFacing(player.id) || player.facing`）。
- 移除 `import { openFacingPicker }`；`facingPicker.js` 標示為 deprecated / 不再由主流程引用（按專案 legacy 慣例，唔刪檔）。

### D. 手牌唔遮棋盤（Bug 2）+ 手機直向棋盤佈局（Task 9）
檔案：`client/styles.css`、`client/index.html`
- 用 CSS 變數 `--hand-height: 264px`；`.app-shell`（或 `main`）加 `padding-bottom: calc(var(--hand-height) + 16px)`，令固定手牌唔覆蓋棋盤。
- `.board-view` 高度由 `80vh` 改為 `min(80vh, calc(100vh - 70px - var(--hand-height) - 32px))`，多視窗比例下棋盤完整可見。
- 手機直向 media query（`@media (max-width: 720px)` 或 `(orientation: portrait) and (max-height: 900px)`）：`.app-shell` 單欄、棋盤置中；玩家牌區改為圍繞棋盤 —— P1 底、P2 頂、P3 左、P4 右（4P 時左右用精簡 HP/MP chip，若空間不足則保留狀態列 fallback）。
- `index.html`：如有需要加棋盤週邊 zone 容器（最小化）。

### E. Safe-area 處理（Task 10）
檔案：`client/index.html`、`client/styles.css`
- `index.html` `<meta name="viewport">` 加 `viewport-fit=cover`（令 iOS `env()` 生效）。
- `.hand-panel` bottom 用 `padding-bottom: max(12px, env(safe-area-inset-bottom))`；`.topbar` 與 `.app-shell` 對應加 `env(safe-area-inset-top/left/right)`。
- 桌面不受影響。

### F. 摺疊「操作提示」面板（Task 6）
檔案：`client/index.html`、`client/styles.css`、`client/views/boardView.js`
- 控制面板嘅「操作提示」`<section>`（index.html:89-99）改為可摺疊（`<details>` 或 toggle 按鈕，預設收起）。
- `#boardSelectionHintPanel` 已喺選擇模式自動顯示（auto-expand 已滿足），保留；確保摺疊邏輯唔影響其顯示。

### G. 精簡玩家狀態列（Task 7）
檔案：`client/app.js`
- `renderPlayerStatus`（~L70-91）：移除座標 span（`player-pos`）與朝向 span（`player-facing`），保留 P ID／角色名／HP／MP。

### H. 教學提示浮層（Task 8）
新檔：`client/views/tutorialOverlay.js`；改 `client/index.html`、`client/app.js`、`client/styles.css`
- 新增一次性浮層，引導「點擊手牌 → 選目標 → 結算回合」，有「開始／關閉」掣。
- `index.html` 加 `#tutorialRoot`（或重用 modalRoot）；`app.js` 喺 `createMatch` 成功後首次顯示一次（用 localStorage / 變數記住已睇過）。
- 係唯一新增大檔（因現有檔冇此功能）。

## 驗證
- 逐個改動 JS 檔 `node --input-type=module --check` 過語法。
- `npm run test:all` 保持全綠（`tests/rules/multiplayerEngine.test.js` 已用 targetX/targetY，係 Bug 1 嘅回歸守門；`turnEngine.deck`／`facingDelay` 不受影響）。
- `npm run client` + 手動 browser smoke：720×1280 同 1080×2400 下確認 (a) 移動卡可移動、(b) 攻擊卡可揀任意敵、(c) 棋盤唔被手牌遮底、(d) 朝向 5 按鍵即時生效、(e) 教學浮層出現一次、(f) safe-area 無遮擋。
- 注意：repo 冇 client-side jest/DOM harness；UI 邏輯以 browser smoke 驗證為主。如要自動化，可另加 jsdom+Jest-ESM harness（列為 out of scope，需另行要求）。

## 風險
- UI 唔篩距離後，玩家可能揀到射程外敵人 → server 記錄「距離不符」，該攻擊卡仍消耗；UX 上會喺對戰記錄見到失敗，可接受但需知悉。
- 手機直向「玩家牌區圍繞棋盤」（尤其 P3/P4 左右）佈局較複雜；若 720px 空間不足，fallback 返狀態列。
- `env()` safe-area 需 `viewport-fit=cover` 且瀏覽器支援；桌面/Chrome 唔受影響。
- 因冇 DOM 測試，任何回歸靠 browser smoke 人工把關；改動保持局部、唔觸碰 LOCKED 規則檔。

## 範圍外（Out of scope）
- 改 server 距離驗證規則（LOCKED）。
- 加 jsdom/Jest-ESM client 測試 harness。
- 大重構（新 `BattleView.js` 統一渲染）。
