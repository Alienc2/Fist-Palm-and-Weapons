# 鎖定現時 UI 設定（本回合選牌面板 + 玩家狀態框）到 CONTEXT.md 及 CODEX_HANDOFF.md

## 目標
把目前已完成嘅兩組 UI 設定寫入 `CONTEXT.md` 與 `CODEX_HANDOFF.md` 並標示為「已完成項目 / LOCKED」，防止後續更新（尤其未來 Phase 或自動化）覆蓋或改變設定。純文件改動，無 source code 改動。

## 背景
本回合已完成以下 UI 改動（已生效於 `client/styles.css`、`client/index.html`、`client/views/selectedCardsView.js`）：
1. 本回合選牌面板改為固定 3 行結構（標題／卡牌區／控制列）。
2. 玩家狀態框改為闊屏 2 個一行、多於 2 名自動換行。

## 鎖定內容（要寫入文件嘅 authoritative 設定）

### 鎖定 UI 設定 1 — 本回合選牌面板（selected panel）
- 固定 3 行結構：標題「本回合選牌」／卡牌區／控制列。
- `#selectedCardsView`（`.selected-cards-view`）：`height:158px; overflow-y:auto`，只放卡牌列表或「尚未選牌」訊息。
- `#selectedCardsControls`（`.selected-cards-controls`）：非捲動控制列，`display:flex; flex-direction:row; align-items:center; flex-wrap:wrap; gap:8px; margin-top:10px`。
- 「清空選牌」鍵 + 「面向」label + 5 個面向按鍵（上▲／下▼／左◀／右▶／保持❌）全部同一行。
- `.facing-row`：`display:flex; align-items:center; gap:8px`（無 margin-top，間距由 `.selected-cards-controls` 控制）。

### 鎖定 UI 設定 2 — 回合控制玩家狀態框（player status list）
- `.player-status-list`：`display:grid; grid-template-columns:repeat(2,auto); justify-content:center; gap:8px`。
- 闊屏固定 2 個一行；多於 2 名玩家自動換行成 2+1／2+2。
- `.player-status`：`width:clamp(84px,13vw,116px); aspect-ratio:1`（最小方形置中，不盡用面板闊度）。

### 相關檔案（鎖定時一併註明）
- `client/index.html`：`selected-panel` 內 `#selectedCardsView` 之後新增 `#selectedCardsControls` 容器。
- `client/views/selectedCardsView.js`：`renderSelectedCards()` 只將卡牌／訊息 append 到 `#selectedCardsView`，將「清空選牌」鍵與「面向 row」append 到 `#selectedCardsControls`；`clear()` 兩個容器。
- `client/styles.css`：`.selected-cards-controls`／`.player-status-list`／`.player-status`／`.facing-row` 如上。

## 檔案改動（2 個 markdown，純文件）

### 1. `CONTEXT.md`
- 版本 V29 → V30，更新日期時間 → 2026-08-13 HKT。
- 在「## 4. 已完成項目 / LOCKED 項目」的「已完成項目」列表尾端新增一個條目（標題 + 上述「鎖定 UI 設定 1 / 2」內容 + 相關檔案）。
- 在「### LOCKED 項目（改動前先確認）」清單新增一項：
  `本回合選牌面板（標題／158px 卡牌區／同一行控制列＝清空選牌+面向+5 鍵）與玩家狀態框（闊屏 2 個一行、多於 2 自動換行、`clamp(84px,13vw,116px)` 方形置中）的 UI 設定`。
- 在「### 已驗證結果」新增一行：Phase 本回合選牌面板 + 玩家狀態框 UI 鎖定（純 CSS／DOM 結構改動，無 engine 改動；selectedCardsView.js temp `.mjs` `node --check` 通過；`npx jest --runInBand` 應維持全綠 37 suites / 287 tests）。

### 2. `CODEX_HANDOFF.md`
- 版本 V29 → V30，更新日期時間 → 2026-08-13 HKT。
- 在「## 3. 目前專案進度 / 狀態」的「3.1 進度總覽」表格新增一行（功能／主要修改檔案／驗證方式／是否已完成＝已完成）。
- 在「### 3.2 已完成但必須鎖定的部份」清單新增上述「鎖定 UI 設定 1 / 2」項目。
- 在「### 3.3 現階段已完成的內容」新增條目。
- 在「## 4. 最新驗證 / 測試結果」新增一行驗證結果。

## 驗證
1. 對照 `client/styles.css`（styles.css:214-219、224-225、618-629、653-657）確認鎖定數值與實際一致。
2. 純 markdown 改動，無需跑測試；如需回歸，執行 `npx jest --runInBand`（預期 37 suites / 287 tests 全綠）。

## 風險
- 鎖定設定應寫成「authoritative 值 + 用途 + 相關檔案」，避免後續只鎖文字唔鎖數值。
- 若未來真要改動鎖定 UI，必須先同使用者確認（依「LOCKED 項目」規則）。
- 不要誤改其他章節（heading 編號與順序需保持不變，依兩份文件嘅更新規則）。
