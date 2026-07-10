# Fist Palm and Weapons — 遊戲規格重整草案

本文件整理 2026/07/10 最新補充規格，目標係作為重構版網頁對戰遊戲的正式設計基礎。整體架構建議採用 Node.js + Socket.IO 單一 server 加房間制，因為 Socket.IO rooms 原生支援 socket 加入、離開及向指定房間廣播事件，適合 2 至 4 人同步選牌與同步回合解析的玩法。[web:11][web:19][web:25]

卡牌資料第一版建議以 CSV 維護，再由 build script 轉成 JSON cache 給 client 與 server 共用，呢種做法可以將內容配置同規則邏輯分離，亦符合 Node.js 常見 CSV 讀取與轉檔工作流。[web:20][web:22][web:24]

---

## 1. 遊戲定位

遊戲定位為同步選牌、交錯揭牌、位置博弈型對戰卡牌遊戲。玩家透過手牌構築、地圖移動、朝向管理、攻防反擊與剋制關係，營造出角色正在場上高速交鋒的手感。

設計支柱：

- 位置重要：距離、邊緣、朝向都直接影響命中與存活。
- 出牌有預判：雙方先選牌，再同步進入解析，強調猜測與反制。
- 互剋清晰：拳、掌、武器形成一個可理解的剋制循環。
- 資源有節奏：MP、抽牌、購買、保留防禦都要取捨。
- 規則可擴展：2 至 4 人規格相同，只增加多目標選擇與排序流程。

---

## 2. 對戰模式

支援以下模式：

- 本機單機測試模式
- 線上 2 人對戰
- 線上 3 人對戰
- 線上 4 人對戰
- 單人對 AI 模式

2 至 4 人模式共用同一套規則，只係當同時存在多個合法目標時，系統需要加入優先目標選擇與排序；若玩家未手動指定，系統可按預設規則自動攻擊合法目標。[web:11][web:25]

---

## 3. 地圖與座標

地圖固定為 5 × 5。

座標顯示採用 0-based：

- X 軸：0, 1, 2, 3, 4
- Y 軸：0, 1, 2, 3, 4

起始位置：

- P1：`(1,1)`
- P2：`(3,3)`
- P3：`(3,1)`
- P4：`(1,3)`

距離計算採用曼哈頓距離：上下左右各算 1 格，斜向自然算作 2 格，符合「直格 1、斜格 2」的設計。

---

## 4. 朝向系統

每個玩家在地圖上都具有朝向，朝向可為：

- 上
- 下
- 左
- 右

攻擊相對面向分為：

- 正面
- 側面
- 背面

朝向修正值沿用建議參數：

| 位置關係 | 命中修正 | 傷害修正 | 防禦修正 | 反擊修正 |
|---|---:|---:|---:|---:|
| 正面 | 0 | +1 | +1 | 0 |
| 側面 | 0 | 0 | 0 | 0 |
| 背面 | +1 | +1 | -1 | -1 |

設計意義：

- 正面較強，體現正面迎擊的穩定性。
- 側面中性，避免規則過重。
- 背面較弱，增加走位與轉向價值。
- 背擊有明顯收益，鼓勵繞背與逼位。

第一版可以先不用百分比命中率，而係採用「命中等級」系統（基礎命中值加減，再與防禦閾值比較），方便平衡同 AI。

---

## 5. 轉向規則

每回合每位玩家即使不移動，也可以免費轉向 1 次。轉向視為獨立回合輸入，必須在 Ready 前確認。

建議實作：

- 玩家本回合可選擇 `facingChange = none / up / down / left / right`
- 如有移動，可在移動完成後決定最終朝向
- 如無移動，仍可單獨改變一次朝向

---

## 6. 邊緣擊出場外

擊出場外只由「進階攻擊」觸發：

- 攻擊使用的是進階拳、進階掌或進階武器
- 目標位於地圖邊緣格
- 目標當前 HP < 3

符合以上條件時，會進入「擊出場外」機率判定。具體機率不寫死在程式碼，而係放在 CSV / AI 配置中（例如 `out_of_bounds_chance_advanced = 0.4` 等）方便之後調整。

為免規則過早複雜化，第一版先不實作「推格位移」，而係做邊緣終結判定。

---

## 7. 角色系統

每位玩家開局可選角色。不同玩家可以選擇相同角色，只以顏色區分。角色差異來自：

- 初始 HP
- 初始 MP
- 初始手牌數
- 起始牌庫傾向
- 專屬被動能力

### 初版 4 角色

| 角色定位 | 名稱 | 初始 HP | 初始 MP | 初始手牌 | 特色 |
|---|---|---:|---:|---:|---|
| 攻擊型 | 破軍 | 9 | 3 | 4 | 傷害節奏高，容易斬殺 |
| 防禦型 | 玄武 | 12 | 2 | 4 | 耐久高，靠正面硬接與反制 |
| 移動型 | 飛翎 | 8 | 4 | 5 | 機動性高，擅長側擊與背擊 |
| 平均型 | 無鋒 | 10 | 3 | 4 | 數值平均，適合標準打法 |

角色專屬被動會在第一版就加入，但全部用 `characters.csv` 管理。欄位示例：

- `passive_id`（例如 `front_damage_bonus`, `front_defense_bonus`, `free_facing_change`）
- `passive_params`（JSON 字串或多欄位）
- `description`（顯示用文字）

---

## 8. 攻擊種類與剋制循環

攻擊分拆為：

- 拳
- 掌
- 武器
- 進階拳
- 進階掌
- 進階武器

剋制循環：

- 拳剋武器
- 武器剋掌
- 掌剋拳

第一版剋制修正：

| 關係 | 命中修正 | 傷害修正 |
|---|---:|---:|
| 攻擊類型剋制目標類型 | +1 | +1 |
| 被目標類型剋制 | -1 | -1 |
| 無剋制 | 0 | 0 |

進階攻擊仍屬原系（進階拳屬拳、進階掌屬掌、進階武器屬武器）。

---

## 9. 回合流程（Phase）

正式 phase：

`SELECT_CARDS → READY_CHECK → RESOLVE_TURN → END_TURN → DRAW_PHASE → DISCARD_TO_LIMIT → ROUND_START`

其中 `SELECT_CARDS → READY_CHECK` 可由多名玩家同時進行；全部玩家完成 Ready 之後，才同步進入 `RESOLVE_TURN`。

各 phase 功能：

| Phase | 功能 |
|---|---|
| `SELECT_CARDS` | 玩家自由選咭、排序、取消、設定目標、移動方向與格數、轉向 |
| `READY_CHECK` | 檢查 MP 是否足夠及所有必要子輸入是否齊全 |
| `RESOLVE_TURN` | 根據起手玩家交錯逐張揭牌並結算 |
| `END_TURN` | 回收本回合咭牌、防禦殘留、死亡 / 出場檢查 |
| `DRAW_PHASE` | 每位玩家抽 2 張 |
| `DISCARD_TO_LIMIT` | 若手牌 > 8，玩家棄牌到 8 |
| `ROUND_START` | 切換起手權、重置旗標，進入下一回合 |

---

## 10. 抽牌與手牌上限

- 每回合抽 2 張
- 手牌上限 8 張
- 即使已達上限，仍可照常抽 2 張
- 回合結束後若多於 8 張，必須棄牌到 8 張（`DISCARD_TO_LIMIT`）

---

## 11. 防禦殘留規則

若玩家本回合最後一張已揭示咭牌為防禦咭，則該防禦效果會持續保留，直到：

- 被成功觸發一次；或
- 該回合完結

防禦殘留只適用於最後一張已揭示防禦牌，避免出現用小牌拉走防禦再用主力的過度 exploit。

---

## 12. 多目標處理規則

2 至 4 人共用同一套卡牌規則，但當存在多個合法目標時，需加入目標選擇：

- 玩家在出牌階段可手動指定目標優先順序
- 若有多個合法目標而未指定，系統按自動規則處理

自動規則建議：

1. 最近距離
2. 最低 HP
3. 朝向劣勢優先（例如背面目標）
4. 座位順序作最後 tie-breaker

---

## 13. 購買牌與商店規則

「學習武功」為 0 MP 卡，為商店入口卡：

- 每次使用只可購買一種武功
- 使用後回到手牌（唔入棄牌）
- 如因其他效果（例如重新使用上一張咭牌效果）令 `學習武功` 再次被視為可用並重新結算，先可以喺同一回合內再次購買另一種武功
- 如果選擇唔購買，仍視為本回合已出咭（可作 skip 用）

商店牌庫為所有玩家共用，牌張有限，賣完即止。每張商店牌都應有 `stock` 欄位，以 CSV 管理，對局初始化時載入到 shared shop state。[web:22]

遊戲日誌在購買事件時必須顯示：

- 敵人名稱 / 座位
- 購買咭牌名稱
- 該咭牌能力詳情摘要（傷害、距離、類型等）

---

## 14. 基本咭牌

每個玩家獨立牌庫包含以下 10 張基本咭牌。多個名稱對應不同角色 flavour，但功能相同。

| 功能 ID | 名稱（不同角色名稱） | 使用 MP | 效果 | 距離 | 張數 | 類別 | 子類別 |
|---|---|---:|---|---|---:|---|---|
| `basic_punch` | 翻鯉逆流拳 / 絕塵八衝拳 / 血鳳雙環拳 / 催心破顏拳 | 1 | 對敵人造成 2 點傷害 | 1 | 2 | 攻擊 | 拳 |
| `basic_palm` | 九嶺雷霆掌 / 煙霞化影掌 / 凝霜鎖骨掌 / 鎮海回潮掌 | 1 | 對敵人造成 2 點傷害 | 1 | 2 | 攻擊 | 掌 |
| `basic_weapon` | 斷岳重刀 / 雲鴻刺針 / 流光雙匕 / 赤焰狼牙棒 | 1 | 對敵人造成 1 點傷害 | 2 | 2 | 攻擊 | 武器 |
| `basic_guard` | 金鐘護體功 / 玄甲回天術 / 回風護勢訣 / 百鍊護身罡 | 1 | 成功防禦上一張咭牌的攻擊 | 1–2 | 2 | 防禦 | 通用防禦 |
| `basic_move` | 凌雲踏月 / 雲步無痕 / 流星趕月 / 煙霞縱躍 | 1 | 本回合移動 1 格 | 1 | 3 | 移動 | 位移 |
| `basic_buy` | 學習武功 | 0 | 按購買費用扣減 MP，使用後回到手上 | 不適用 | 1 | 購買 | 商店入口 |

補充：

- `basic_guard` 只可防來源距離 1–2 的攻擊。
- `basic_move` 使用時一次過決定方向（固定 1 格）。
- `basic_buy` 每次只可購買一種武功如上。

---

## 15. 可購買咭牌（商店）

共用商店牌庫，賣完即止。

| ID | 名稱 | 使用 MP | 效果 | 距離 | 張數 | 價值 (MP) | 類別 | 子類別 |
|---|---|---:|---|---|---:|---:|---|---|
| `shop_adv_punch_1` | 天罡碎雲拳 | 2 | 對敵人造成 3 點傷害 | 1 | 1 | 2 | 攻擊 | 進階拳 |
| `shop_adv_palm_1` | 寒玉凝霜掌 | 2 | 對敵人造成 3 點傷害 | 1 | 1 | 2 | 攻擊 | 進階掌 |
| `shop_adv_weapon_1` | 天衡弓箭 | 3 | 對敵人造成 2 點傷害 | 2 | 1 | 3 | 攻擊 | 進階武器 |
| `shop_adv_punch_2` | 孤月破影拳 | 2 | 對敵人造成 3 點傷害 | 1 | 1 | 2 | 攻擊 | 進階拳 |
| `shop_adv_palm_2` | 焚心離火掌 | 2 | 對敵人造成 3 點傷害 | 1 | 1 | 2 | 攻擊 | 進階掌 |
| `shop_adv_weapon_2` | 幽冥重錘 | 3 | 對敵人造成 2 點傷害 | 3 | 1 | 3 | 攻擊 | 進階武器 |
| `shop_counter_1` | 勢回如潮功 | 2 | 反彈敵人使用的攻擊，敵人承受原來傷害；可反彈反擊，傷害 ×2 | 1–2 | 1 | 3 | 反擊 | 通用反擊 (80%) |
| `shop_counter_2` | 巧手折招掌 | 2 | 反彈敵人使用的攻擊，敵人承受原來傷害；可反彈反擊，傷害 ×2 | 1–2 | 1 | 3 | 反擊 | 近距反擊 |
| `shop_counter_3` | 反弧截脈拳 | 2 | 反彈敵人使用的攻擊，敵人承受原來傷害；可反彈反擊，傷害 ×2 | 2–3 | 1 | 3 | 反擊 | 中距反擊 |
| `shop_counter_4` | 逆流斷勢劍 | 2 | 反彈敵人使用的攻擊，敵人承受原來傷害；可反彈反擊，傷害 ×2 | 2–3 | 1 | 3 | 反擊 | 中距反擊 |
| `shop_guard_1` | 太虛護元功 | 2 | 成功防禦上一張咭牌的 3 點攻擊 | 不限 | 1 | 2 | 防禦 | 高階防禦 |
| `shop_guard_2` | 凝霜護脈功 | 2 | 成功防禦上一張咭牌的 3 點攻擊 | 不限 | 1 | 2 | 防禦 | 高階防禦 |
| `shop_mp_1` | 聚氣還元丹 | 1 | 增加 3 點 MP | 不適用 | 1 | 2 | 回復 | MP |
| `shop_mp_2` | 天元聚炁丹 | 1 | 增加 3 點 MP | 不適用 | 2 | 2 | 回復 | MP |
| `shop_hp_1` | 碧血生肌散 | 1 | 增加 2 點 HP | 不適用 | 2 | 2 | 回復 | HP |
| `shop_hp_2` | 雪參續骨丹 | 1 | 增加 2 點 HP | 不適用 | 2 | 2 | 回復 | HP |
| `shop_resource_1` | 凝神靈蘭露 | 1 | 增加 1 點 MP，抽 2 張 | 不適用 | 2 | 2 | 回復 | 資源 |
| `shop_resource_2` | 靈犀醒腦香 | 1 | 增加 1 點 MP，抽 2 張 | 不適用 | 2 | 2 | 回復 | 資源 |
| `shop_dash_1` | 輕鴻九轉 | 1 | 本回合移動 1–2 格 | 1–2 | 1 | 2 | 移動 | 高速移動 |
| `shop_dash_2` | 青羽飛塵 | 1 | 本回合移動 1–2 格 | 1–2 | 1 | 2 | 移動 | 高速移動 |

補充：

- 高速移動一次過選擇方向 + 格數。
- `1–2` 反擊只可反來源距離 1–2 的攻擊。
- `2–3` 反擊只可反來源距離 2–3 的攻擊。
- 高階防禦可防 3 點攻擊，但遇反彈倍化超出部分仍扣血。

---

## 16. 反擊成功率與連鎖

反擊咭可反所有攻擊，並保留傷害 ×2 連鎖規則。

成功率：

- 反擊類型剋制攻擊類型：成功率 100%
- 反擊與攻擊同類：成功率 80%
- 反擊類型被攻擊類型剋制：成功率 60%
- `勢回如潮功` 作通用反擊，成功率固定 80%

連鎖結算原則：

1. 驗證反擊卡對來源距離是否有效。
2. 驗證是否可反彈該類攻擊。
3. 成功反擊後，攻擊方向反轉。
4. 每多 1 次有效反擊，當前傷害值 ×2。
5. 鏈終止時，由最終承受者吃下最後傷害。

---

## 17. 連續技（Combo）

連續技可由兩類條件觸發：

- 場上敵人排位（直線、斜線、包圍）
- 同一回合內打出的咭牌順序

所有連續技的觸發條件與效果統一記錄在 CSV，例如 `combos.csv` 或在 `cards.csv` 加 `combo_*` 欄位。[web:22]

範例連續技：

1. 連續 3 張同類型攻擊咭牌：第 3 下攻擊傷害 +1。
2. 順序打出 3 張拳、掌、武器：本回合降低目標防禦成功機率 15%。
3. 連續打出 3 張移動類咭牌：本回合閃避率 +15%。
4. 連續打出 3 張防禦類咭牌：本回合防禦成功率 +15%。
5. 順序打出 4 張拳、掌、進階拳、進階掌：第 4 下攻擊距離 +1 並傷害 +1。

CSV 建議欄位：

- `combo_id`
- `combo_type`（sequence / board_pattern）
- `required_cards`（咭 ID 順序）
- `required_board_pattern`（line / diagonal / surround / none）
- `effect_type`（damage_bonus / defense_down / dodge_up / range_bonus 等）
- `effect_params`（數值）
- `duration`（持續到回合結束 / 下一次攻擊）

---

## 18. 資料化設計

建議以 CSV 作為內容來源：

- `cards.csv`
- `characters.csv`
- `keywords.csv`
- `ai_profiles.csv`
- `combos.csv`

再由 build script 轉成 `generated/*.json` 作 client / server 共用。使用 Node.js 讀寫 CSV 轉 JSON，符合常見工作流。[web:20][web:22][web:24]

### `cards.csv` 欄位建議

| 欄位 | 說明 |
|---|---|
| `id` | 卡牌唯一 ID |
| `name_zh` | 中文名稱 |
| `alias_group` | 同功能異名群組 |
| `group` | basic / shop |
| `type` | attack / defense / counter / move / buy / recover |
| `subtype` | punch / palm / weapon / advanced_punch / advanced_palm / advanced_weapon |
| `mp_cost` | 使用 MP |
| `buy_cost` | 購買費用 |
| `range_min` | 最小距離 |
| `range_max` | 最大距離 |
| `damage` | 傷害 |
| `block_value` | 防禦值 |
| `hp_gain` | 回 HP |
| `mp_gain` | 回 MP |
| `draw_count` | 抽牌 |
| `move_min` | 最小移動 |
| `move_max` | 最大移動 |
| `stock` | 庫存 |
| `persist_until_triggered` | 是否持續至觸發或回合完 |
| `keywords` | 關鍵字 |
| `target_rule` | single / auto_nearest / self |
| `description_template` | 顯示用文字 |
| `enabled` | 是否啟用 |

---

## 19. 系統模組與檔案分拆

建議專案結構：

```text
/docs
  GAME_SPEC.md
  NETWORK_PROTOCOL.md
  BALANCE_NOTES.md
/data
  cards.csv
  characters.csv
  keywords.csv
  ai_profiles.csv
  combos.csv
/generated
  cards.json
  characters.json
  keywords.json
  ai_profiles.json
  combos.json
/shared
  constants.js
  validators.js
  cardLoader.js
/server
  server.js
  config.js
  rooms/
    roomManager.js
    matchmaking.js
  game/
    gameEngine.js
    turnEngine.js
    targeting.js
    state/
      createInitialState.js
      stateSchemas.js
    rules/
      distance.js
      facing.js
      advantage.js
      cardResolver.js
      stackResolver.js
      defenseResolver.js
      movementResolver.js
      shopResolver.js
      eliminationResolver.js
  ai/
    aiController.js
    evaluateBoard.js
    simulateTurn.js
/client
  index.html
  src/
    app.js
    network/socketClient.js
    store/gameStore.js
    ui/layout.js
    ui/boardView.js
    ui/handView.js
    ui/logView.js
    ui/shopModal.js
    ui/targetPicker.js
    ui/facingPicker.js
    ui/resultOverlay.js
    ui/resolveAnimation.js
/tests
  rules/
  integration/
/scripts
  build-data.mjs
  run-local.ps1
  test-all.ps1
CONTEXT.md
CODEX_HANDOFF.md
```

---

## 20. Engine API 草案

| API | 功能 |
|---|---|
| `loadGameData()` | 讀取 JSON cache |
| `createMatch(config)` | 建立對局 |
| `createInitialState(config)` | 生成初始狀態 |
| `submitSelection(playerId, actions)` | 提交本回合出牌與排序 |
| `setFacing(playerId, facing)` | 設定本回合最終朝向 |
| `setMoveDecision(playerId, cardId, direction, steps)` | 設定移動方向與格數 |
| `setTargetPriority(playerId, priorities)` | 設定多目標優先順序 |
| `setShopDecision(playerId, cardId, shopCardId)` | 設定購買選擇 |
| `setReady(playerId)` | 玩家 ready |
| `unsetReady(playerId)` | 取消 ready |
| `canResolve(state)` | 是否可進入解析 |
| `resolveTurn(state)` | 結算整個回合 |
| `resolveRevealStep(state, revealIndex)` | 交錯揭牌單步 |
| `resolveCardEffect(context)` | 卡效入口 |
| `resolveAttack(context)` | 攻擊 |
| `resolveDefense(context)` | 防禦 |
| `resolveCounterChain(context)` | 反彈連鎖 |
| `resolveMove(context)` | 移動＋面向更新 |
| `resolveBuy(context)` | 商店購買 |
| `applyEndTurn(state)` | 回合收尾 |
| `applyDrawPhase(state)` | 抽牌 |
| `applyDiscardToLimit(state)` | 棄牌到上限 |
| `checkElimination(state)` | 死亡 / 出場檢查 |
| `serializePublicState(state, viewerId)` | 前端可見狀態 |

---

## 21. Socket Event API 草案

| Event | 方向 | 功能 |
|---|---|---|
| `lobby:create_room` | client -> server | 建房 |
| `lobby:join_room` | client -> server | 入房 |
| `lobby:leave_room` | client -> server | 離房 |
| `lobby:room_state` | server -> client | 房間狀態 |
| `match:select_character` | client -> server | 選角色 |
| `match:start_request` | client -> server | 要求開始 |
| `match:started` | server -> client | 對局開始 |
| `match:submit_selection` | client -> server | 提交選牌 |
| `match:set_facing` | client -> server | 朝向 |
| `match:set_move_decision` | client -> server | 移動方向＋格數 |
| `match:set_target_priority` | client -> server | 目標順序 |
| `match:set_shop_decision` | client -> server | 購買內容 |
| `match:ready` | client -> server | ready |
| `match:unready` | client -> server | 取消 ready |
| `match:resolve_started` | server -> client | 進入解析 |
| `match:reveal_step` | server -> client | 單步揭牌結果 |
| `match:discard_prompt` | server -> client | 要求棄牌 |
| `match:state_patch` | server -> client | 狀態增量 |
| `match:round_end` | server -> client | 回合結束 |
| `match:game_over` | server -> client | 勝負結果 |
| `match:error` | server -> client | 錯誤訊息 |
| `system:reconnect_state` | server -> client | 重連還原狀態 |

Socket.IO rooms 用作每場對局的房間隔離，server 只向特定 room 廣播 `match:*` 事件。[web:11][web:19][web:25]

---

## 22. AI 設計方向

AI 採用簡單機率加權策略而非完整搜尋樹：

1. 列出所有合法動作組合。
2. 依據距離、朝向、剋制、血量、MP、邊緣風險、背擊機會、連續技可能性等因素評分。
3. 用加權隨機揀選，而非總揀最高分。
4. 多人戰加入「收頭權重」與「避仇恨權重」。

評分因子包括：

- 是否命中合法目標
- 是否形成正面 / 側面 / 背面優勢
- 是否被剋制
- 是否可逼敵到邊緣終結條件
- 是否需要保留最後防禦牌
- 是否值得用 `學習武功` 對應當回合商店情況
- 是否有機會觸發連續技

---

## 23. 新增決定補充

### 23.1 朝向修正值

背面、側面、正面的命中與傷害、防禦修正，採用上述建議參數：正面命中 +0、傷害 +1、防禦 +1；側面全為 0；背面命中 +1、傷害 +1、防禦 -1、反擊 -1。

### 23.2 擊出場外觸發條件

擊出場外只會由進階攻擊觸發：當攻擊使用的是進階拳、進階掌或進階武器，且目標位於地圖邊緣而當前 HP < 3，即可進入擊出場外判定。具體機率放在 CSV / AI 配置中調整。

### 23.3 反擊成功機率

反擊咭可反所有攻擊：

- 剋制關係：成功率 100%
- 同類關係：成功率 80%
- 被剋制：成功率 60%
- `勢回如潮功`：通用反擊，成功率固定 80%

成功反擊後仍套用原有傷害 ×2 連鎖規則。

### 23.4 多目標濺射與連續技

當多個敵人連成一直線、斜線或包圍玩家一圈時，指定咭牌組合可以觸發連續技，對多個目標造成傷害並提高總傷害。連續技的觸發條件與具體傷害、目標數量需以獨立欄位記錄在 CSV 中，以便日後平衡與調整。

### 23.5 角色專屬被動

角色在第一版即會加入專屬被動能力。被動能力同樣需在 `characters.csv` 中以欄位與關鍵字形式記錄，讓數值可以透過調整 CSV 而非改動程式碼來修正。

### 23.6 學習武功多次使用

`學習武功` 如因特殊效果再次回到手牌，每回合可以多次使用。只要玩家有足夠 MP 並決定購買或 skip，使用次數不受限制；但每次使用只可購買一種武功（見 24.1）。

### 23.7 遊戲日誌購買資訊

遊戲日誌在顯示購買事件時，必須列出敵人所購買的卡牌名稱，以及該卡牌的能力詳情摘要，方便玩家即時了解對手 deck 變化與未來潛在威脅。

---

## 24. 規則更正與連續技補充

### 24.1 學習武功購買限制

`學習武功` 每次使用只可購買一種武功。除非因其他效果（例如重新使用上一張咭牌效果）令 `學習武功` 再次被視為可用並重新結算，其次數才能在同一回合內再次購買另一種武功。

### 24.2 連續技觸發條件補充

連續技不只依賴多個敵人的排位（直線、斜線、包圍），亦可以由玩家在同一回合內打出指定咭牌順序觸發。所有連續技的觸發條件與效果統一記錄在 CSV。

範例連續技：

1. 連續 3 張同類型攻擊咭牌：第 3 下攻擊傷害 +1。
2. 順序打出 3 張拳、掌、武器：本回合降低目標防禦成功機率 15%。
3. 連續打出 3 張移動類咭牌：本回合閃避率 +15%。
4. 連續打出 3 張防禦類咭牌：本回合防禦成功率 +15%。
5. 順序打出 4 張拳、掌、進階拳、進階掌：第 4 下攻擊距離 +1 並傷害 +1。

實作上建議新增 `combos.csv` 或在 `cards.csv` 中加上 `combo_id`、`combo_step`、`combo_effect` 等欄位，以便日後在不改動程式碼的情況下調整連續技的觸發順序與數值。