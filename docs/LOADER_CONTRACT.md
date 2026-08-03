# LOADER_CONTRACT.md

## 1. 目的

呢份文件定義 `shared/cardLoader.js` 同 `server/game/state/createInitialState.js` 之間嘅資料入口 contract，目的係收口 generated data、loader normalization、lookup 行為，同埋 initial state 建立時嘅 fail-fast / fallback 規則。

呢份 contract 唔係玩法規格本身，而係**資料入口與 state 初始化嘅執行規範**。後續 AI、combo、角色被動、商店流程、多人同步、正式 UI 都要先遵守呢份 contract。

---

## 2. 適用範圍

### 2.1 Loader 層
- `shared/cardLoader.js`
- `generated/cards.json`
- `generated/characters.json`
- `generated/keywords.json`
- `generated/combos.json`
- `generated/ai_profiles.json`

### 2.2 Initial State 層
- `server/game/state/createInitialState.js`

### 2.3 相關測試
- `tests/rules/cardLoader.test.js`
- `tests/rules/createInitialState.test.js`
- `tests/rules/createInitialState.starterDeck.test.js`
- `tests/rules/createInitialState.edgeCases.test.js`

---

## 3. Loader 責任

`shared/cardLoader.js` 係唯一正式資料入口。佢負責：

1. 讀取 `generated/*.json`。
2. 驗證 generated data schema。
3. 將 raw data 正規化成 runtime 可用格式。
4. 提供按 id lookup 嘅 helper。
5. 提供 group-based / category-based 資料查詢。

### 3.1 驗證責任
`validateAllData()` 必須喺任何 state 初始化前可被呼叫，並且一旦 generated data 不合法就要直接 throw。

### 3.2 正規化責任
`loadCards()`、`loadCharacters()`、`loadKeywords()`、`loadCombos()`、`loadAiProfiles()` 返回嘅必須係已正規化資料，唔應該保留 CSV 原始格式作為 runtime 主依據。

### 3.3 Lookup 責任
以下 helper 只做 lookup，唔做玩法判斷：
- `getCardById(cardId)`
- `getCharacterById(characterId)`
- `getKeywordById(keywordId)`
- `getComboById(comboId)`
- `getAiProfileById(profileId)`

如果搵唔到，應回傳 `null`，唔應該靜默造假資料。

---

## 4. Generated Data Contract

### 4.1 必須存在的資料檔
- `generated/cards.json`
- `generated/characters.json`
- `generated/keywords.json`
- `generated/combos.json`
- `generated/ai_profiles.json`

### 4.2 基本要求
所有 generated data 必須係陣列，並且每個 item 必須有唯一 `id`。

### 4.3 必要欄位（概念層）

#### Cards
每張 card 至少要滿足：
- `id`
- `type`
- `subtype`
- `name_zh`
- `group`

並且要符合允許值範圍：
- `group`：`basic` / `shop` / `character` / `system`
- `type`：`attack` / `defense` / `move` / `buy` / `recover` / `counter`

#### Characters
每個 character 至少要滿足：
- `id`
- `name_zh`
- `role`
- `initial_hp`
- `initial_mp`
- `initial_hand_size`

#### Keywords
每個 keyword 至少要滿足：
- `id`
- `category`
- `description`

#### Combos
每個 combo 至少要滿足：
- `id`
- `combo_type`
- `required_cards`
- `effect_type`
- `effect_params`
- `duration`

#### AI Profiles
每個 ai profile 至少要滿足：
- `id`
- `name_zh`
- `difficulty`
- `attack_weight`
- `defense_weight`
- `move_weight`
- `buy_weight`
- `recover_weight`
- `combo_weight`

---

## 5. Normalization Contract

### 5.1 Cards
`loadCards()` 輸出嘅 card 必須係 runtime format，最少要包含：
- `id`
- `definitionId`
- `name`
- `group`
- `type`
- `subtype`
- `mpCost`
- `buyCost`
- `rangeMin`
- `rangeMax`
- `damage`
- `blockValue`
- `hpGain`
- `mpGain`
- `drawCount`
- `moveMin`
- `moveMax`
- `stock`
- `persistUntilTriggered`
- `keywords`
- `targetRule`
- `defaultCardSet`
- `defaultCopiesInHand`
- `enabled`

### 5.2 Characters
`loadCharacters()` 輸出嘅 character 必須係 runtime format，最少要包含：
- `id`
- `name`
- `role`
- `initialHp`
- `initialMp`
- `initialHandSize`
- `tokenColor`
- `passiveId`
- `passiveParams`

### 5.3 Keywords
`loadKeywords()` 輸出要包含：
- `id`
- `category`
- `description`

### 5.4 Combos
`loadCombos()` 輸出要包含：
- `id`
- `comboType`
- `requiredCards`
- `requiredBoardPattern`
- `effectType`
- `effectParams`
- `duration`
- `description`

### 5.5 AI Profiles
`loadAiProfiles()` 輸出要包含：
- `id`
- `name`
- `difficulty`
- `attackWeight`
- `defenseWeight`
- `moveWeight`
- `buyWeight`
- `recoverWeight`
- `comboWeight`
- `description`

---

## 6. createInitialState Contract

`createInitialState(options)` 必須先呼叫 `cardLoader.validateAllData()`，之後先建立角色，再建立 starter deck、初始手牌、商店同其他初始 state 欄位。

### 6.1 Character resolution
`createPlayer()` 必須根據 `characterId` 去 `cardLoader.getCharacterById(characterId)` 查找角色。

#### 規則
- 如果搵到，直接用該角色。
- 如果搵唔到，fallback 去 `cardLoader.loadCharacters()[0]`。
- 如果 fallback 都無角色，必須 throw。

### 6.2 Starter deck 組裝
starter deck 只可由 `basic` cards 組成，並且要根據以下條件篩選：
- `character.role`
- `Default_Card_Set`
- `No_of_Cards_in_Hand`

#### 規則
- `basic` 以外 group 不可入 starter deck。
- `Default_Card_Set` 無效或唔相符時，該卡不可入 deck。
- `No_of_Cards_in_Hand <= 0` 時，該卡不可入 deck。
- 最終 starter deck 長度必須大於 0，否則 throw。

### 6.3 Initial hand
`drawInitialHand(deck, handSize, ownerId)` 必須：
- 從 deck 由前至後抽牌。
- 當 deck 唔夠牌時停手，唔好 throw。
- hand 只可抽到 deck 實際可提供數量。
- deck 抽完後要回傳剩餘 deck。

### 6.4 State shape stability
就算 hand / deck 出現邊界值，`createInitialState()` 回傳嘅 state shape 都要穩定，至少要有：
- `matchId`
- `phase`
- `round`
- `turn`
- `revealIndex`
- `startingPlayerIndex`
- `activePlayerIndex`
- `turnOrder`
- `players`
- `shop`
- `stack`
- `eliminatedPlayers`
- `log`

每個 player 都至少要有：
- `id`
- `characterId`
- `characterName`
- `role`
- `tokenColor`
- `passiveId`
- `passiveParams`
- `passives`
- `activeEffects`
- `hp`
- `maxHp`
- `mp`
- `maxMp`
- `hand`
- `deck`
- `discard`
- `position`
- `facing`
- `selectedCards`
- `lastDefenseCard`
- `lastRevealedSubtype`
- `guardSubtype`
- `isEliminated`

---

## 7. Fail-fast Rules

### 7.1 invalid generated data
如果 generated data 唔合法，必須喺 `validateAllData()` 階段直接 throw，唔可以等到 state build 中途先出錯。

### 7.2 empty starter deck
如果 starter deck 組唔到任何卡，必須 throw：
`[createInitialState] starter deck is empty for character ...`

### 7.3 lookup failure
lookup helper 唔可靜默生成假資料；應該回傳 `null` 或由上層 fallback / throw 決定。

---

## 8. 不變規則

以下行為視為 contract，不應隨便改：
- `validateAllData()` 係 initial state 前置 fail-fast。
- `createInitialState()` 先驗證，再 build state。
- starter deck 只由 `basic` cards 組成。
- `getCharacterById()` 找唔到時可 fallback，但 fallback 本身都要存在。
- `drawInitialHand()` 唔應該因 deck 唔夠而 throw。
- state shape 要穩定，唔可因邊界條件缺欄位。

---

## 9. 對測試的要求

### 9.1 必須存在的測試
- loader data contract 測試
- createInitialState starter deck 測試
- createInitialState edge case 測試

### 9.2 推薦覆蓋
- invalid generated data fail-fast
- empty starter deck throw
- character lookup fallback
- initial hand 大過 deck
- empty / minimal state shape

---

## 10. SLICE-B-02 交接定義

SLICE-B-02 的完成標準唔係改 code，而係：
1. 呢份 contract 文件已存在。
2. 對應 contract test 已通過。
3. `npm run test:rules` 全綠。
4. `CODEX_HANDOFF.md` 同 `CONTEXT.md` 已記錄最新狀態。

---

## 11. 版本控制原則

- 若後續要改 contract，必須先更新呢份文件。
- 任何 gameplay 邏輯變更，先改 spec，再改 test，再改 code。
- 若文件與 code 不一致，以已通過測試嘅 contract 為準，並由新 slice 正式修訂。
