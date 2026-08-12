# 修正「本回合選牌」外框高度 + 回合控制玩家狀態框

## 目標
1. 本回合選牌外框固定為 3 行高度：第一行標題「本回合選牌」／第二行已選卡牌區（固定 158px）／第三行「清空選牌」鍵 + 面向 5 個按鍵。
2. 玩家狀態框改為最小尺寸並置中，不用盡面板闊度；多於 2 名玩家時自動換成兩行，避免闊屏超出範圍。

## 根因
- `selectedCardsView.js` 將「卡牌列表 + 清空選牌鍵 + 面向 row」全部 append 到 `#selectedCardsView`，而該容器 CSS 是 `height:158px; overflow-y:auto`（styles.css:616-619）。因此「清空選牌」與「面向」被塞入 158px 的捲動框內，會被裁切／隱藏，外框高度因而無法構成「標題 + 卡牌 + 控制列」3 行。
- `.player-status-list` 使用 `grid-template-columns: repeat(4, 1fr)`（styles.css:214-218），令每格盡用面板闊度放大（aspect-ratio:1 → 大正方形），闊屏時 4 格易超出 260px 控制面板範圍。

## 改動範圍（3 個檔案，無 engine 改動）

### 1. `client/index.html`（selected-panel 結構）
在 `#selectedCardsView` 之後新增一個非捲動的控制列容器：
```html
<section class="panel selected-panel">
  <h2>本回合選牌</h2>
  <div id="selectedCardsView" class="selected-cards-view">
    <p class="muted-text">尚未選牌。</p>
  </div>
  <div id="selectedCardsControls" class="selected-cards-controls"></div>
</section>
```

### 2. `client/views/selectedCardsView.js`
- 將「卡牌列表 / 尚未選牌訊息」只 append 到 `#selectedCardsView`。
- 將「清空選牌」鍵（pending>0 時）與「面向 row」（恆常顯示）改為 append 到 `#selectedCardsControls`。
- `clear()` 兩個容器，避免殘留 DOM。

### 3. `client/styles.css`
- `.selected-cards-view`（styles.css:616-619）：維持 `height:158px; overflow-y:auto;`（只含卡牌）。
- 新增 `.selected-cards-controls { display:flex; flex-direction:column; gap:8px; margin-top:10px; }`。
- `.facing-row`（styles.css:643-648）：把 `margin-top:10px` 移走（改由 `.selected-cards-controls` 的 gap 控制間距），避免額外縮排。
- `.player-status-list`（styles.css:214-218）：由 grid 改為 flex 換行置中：
  ```css
  .player-status-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  ```
- `.player-status`（styles.css:219-236）：改為固定最小尺寸正方形置中，不再盡用闊度：
  ```css
  .player-status {
    width: clamp(84px, 13vw, 116px);
    aspect-ratio: 1;
    ...（其餘維持）
  }
  ```
  效果：控制面板 260px 寬下，2 個一排；3–4 名玩家自動換行成 2 行（2+1 或 2+2）。

## 驗證
1. `npm run client` 啟動 server。
2. 開 Chrome，開始 4 人對戰：
   - 本回合選牌面板外框應固定 = 標題 + 158px 卡牌區 + 控制列；「清空選牌」與「面向 5 鍵」不被卡牌區捲動裁切。
   - 回合控制面板：玩家狀態框為最小方形並置中，4 名玩家分成 2 行，無水平超出。
3. 前端語法檢查：將 `client/app.js`、`client/views/selectedCardsView.js` 複製成 temp `.mjs` 後 `node --check`。
4. 純 CSS / DOM 結構改動，無 engine 改動，`npx jest --runInBand` 應維持全綠（37 suites / 287 tests）作回歸確認。

## 風險
- `.selected-cards-controls` 為新增容器，需確認 `renderSelectedCards` 在「尚未開始對戰 / 無玩家」分支都正確清理兩個容器，避免顯示殘留。
- 玩家狀態改 flex 後，`.player-status:hover` 的 `transform` 與 `.is-active` 邊框行為不受影響（只改容器排版）。
