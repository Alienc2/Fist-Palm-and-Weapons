# 本回合選牌 + 回合控制 UI 調整計畫

## 目標
兩組前端 UI 調整（純 CSS / DOM 結構，無引擎邏輯改動）：

1. **本回合選牌區**
   - 固定高度，等於已選咭牌的高度。
   - 「清空選牌」按鍵移到朝向選擇前面。
2. **回合控制區（玩家狀態）**
   - 玩家狀態卡改為 3 行：第 1 行 `player-id + player-char`，第 2 行 `player-hp`，第 3 行 `player-mp`。
   - 狀態框固定方形（`aspect-ratio: 1`），按比例縮放到最小。

## 影響檔案
- `client/views/selectedCardsView.js`（DOM 順序調整）
- `client/app.js`（玩家狀態 DOM 結構改 3 行）
- `client/styles.css`（固定高度 / 方形狀態卡 / 3 行排版）

## 變更內容

### 1. `client/views/selectedCardsView.js`
`renderSelectedCards()` 中，將「清空選牌」按鍵 block 移到朝向設定之前：
- 目前順序：cards list → `facingRow` → 清空選牌 button。
- 改為：cards list → 清空選牌 button → `facingRow`。
- 做法：在建立 `facingRow` 之前先建立並 `container.appendChild` 清空選牌 button（`pending.length > 0` 時），再建立並 append `facingRow`。按鍵沿用 `secondary-button` class。

### 2. `client/app.js` `renderPlayerStatus()`
把 4 個 span 改為 3 行結構：
```js
const row = el("button", {...attrs}, [
  el("span", { class: "player-line-top" }, [
    el("span", { class: "player-id", text: p.id }),
    el("span", { class: "player-char", text: p.characterName }),
  ]),
  el("span", { class: "player-hp", text: `HP ${p.hp}/${p.maxHp}` }),
  el("span", { class: "player-mp", text: `MP ${p.mp}/${p.maxMp}` }),
]);
```
（新增 `.player-line-top` 包住 id + char。）

### 3. `client/styles.css`
- `.selected-cards-view`：由 `max-height: 150px` 改為 `height: 158px`（等於 `.selected-list .card` 高度），保留 `overflow-y: auto`。
- `.player-status`：改為方形並縮放至最小：
  - `aspect-ratio: 1`。
  - `justify-content: space-between`（讓 3 行垂直分佈）。
  - `gap: 2px`（縮小行距）。
- 新增 `.player-line-top`：`display: flex; justify-content: space-between; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden;`。
- 為讓方形內文字不爆版，將 `.player-id` / `.player-char` / `.player-hp` / `.player-mp` 字型收細（`clamp(10px, 1.4vw, 12px)`），`.player-char` 加 `text-overflow: ellipsis; overflow: hidden;`。

## 風險 / 注意
- 狀態卡變細（320px 面板 ÷ 4 欄 ≈ 66px 方形），3 行文字會較密；已用 clamp + ellipsis 控管。若仍爆版，可讓 `.player-status-list` 改為 `repeat(2, 1fr)` 兩列方形，但本次不改（保持現行 4 欄）。
- 純 UI 改動，不影響 server / rules。

## 驗證
- `npx jest --runInBand` 全套維持全綠（無 engine 改動，應不受影響）。
- 前端 JS 語法檢查：`client/app.js`、`client/views/selectedCardsView.js` 用 temp `.mjs` copy 後 `node --check`。
- 手動：`npm run client` → Chrome 開 `/`：
  - 本回合選牌區固定高度、清空選牌在朝向前。
  - 玩家狀態卡為方形、3 行排版正確、無文字溢出。

## 完成後
更新 `CONTEXT.md` 完成項目 / 驗證結果段落。
