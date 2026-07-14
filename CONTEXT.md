# CONTEXT.md

---
status: active
updated: 2026-07-12 V3
phase: "Phase B verified checkpoint 1"
---

## 專案名稱
Fist Palm and Weapons

## Past

### 為何這樣做
此專案依 `docs/GAME_SPEC.md` 推進，開發策略採用：
1. 先規格
2. 再資料骨架
3. 再純 rules engine
4. 再單元測試
5. 之後才進入資料驅動化、完整系統、多人、UI、AI

目標是先固定核心戰鬥規則，避免 UI / 網絡 / 資料同步把 debugging 難度放大。

### 已完成里程碑
- 已建立 `docs/GAME_SPEC.md`
- 已建立 `data/*.csv` 資料骨架
- 已建立 `scripts/build-data.js`
- 已建立純 rules engine prototype
- 已完成 Phase A rules correctness 與測試
- 已完成 Phase B 第一輪 data-driven initialization

## Current

### 專案當前狀態
目前屬於：
- rules engine prototype 已驗證
- data-driven initialization 已驗證第一輪
- 商店、combo、角色被動、多人、UI、AI 未開始

### 當前技術棧
- Node.js
- CommonJS
- npm
- Jest
- csvtojson

### 目前核心檔案

#### 文件
- `docs/GAME_SPEC.md`
- `CODEX_HANDOFF.md`
- `CONTEXT.md`

#### 資料層
- `data/cards.csv`
- `data/characters.csv`
- `data/keywords.csv`
- `data/ai_profiles.csv`
- `data/combos.csv`
- `generated/cards.json`
- `generated/characters.json`
- `generated/keywords.json`
- `generated/ai_profiles.json`
- `generated/combos.json`

#### 載入層
- `shared/cardLoader.js`

#### 引擎層
- `server/game/gameEngine.js`
- `server/game/state/createInitialState.js`
- `server/game/rules/distance.js`
- `server/game/rules/facing.js`
- `server/game/rules/advantage.js`
- `server/game/rules/cardResolver.js`
- `server/game/rules/turnEngine.js`

#### 測試層
- `tests/rules/gameEngine.test.js`
- `tests/rules/cardLoader.test.js`

### 已完成能力

#### Build / Data
- CSV 可 build 成 JSON
- 已建立 `cardLoader`
- 已建立 card / character 最小 validator
- 已可從 `generated/cards.json` 載入 basic cards
- 已可從 `generated/characters.json` 載入角色初始化資料

#### Engine
- `createInitialState()` 已開始由 generated data 初始化 deck / hand / HP / MP
- 已保留純 rules engine 的基本戰鬥能力
- 已加 `turnEngine` 無效選牌防呆

#### Rules correctness
已測到：
1. distance
2. facing
3. defense persistence（hit / miss）
4. move valid / invalid
5. buy log
6. advanced edge KO
7. counter deterministic cases
8. advantage strong / weak / neutral
9. resolveTurn interleaving order

#### Testing
最新驗證結果：
- `npm run test:rules`
- Test Suites: 2 passed, 2 total
- Tests: 22 passed, 22 total

### 當前限制
1. starter deck 組裝規則仍然簡化
2. validator 只係最小版本
3. `lastRevealedSubtype` / `guardSubtype` 仍是過渡模型
4. `buy` 只有 log，未有真正 shop flow
5. 仍未有 integration tests
6. 未開始 Socket.IO / UI / AI

### 當前最佳下一步
最安全下一步係先完成 Phase B 收口，而唔係立即擴規則：
1. 補 starter deck 組裝規則
2. 補 validator 覆蓋
3. 補 data initialization edge-case tests
4. 預留 `keywords` / `combos` / `ai_profiles` loader 接口

## Future

### 下一個里程碑
完成 Phase B：
- data-driven initialization 更完整
- validator 更可靠
- starter deck 邏輯更清晰
- data 異常 case 有測試保護

### 之後里程碑

#### Phase C：規則擴充
- `shopResolver`
- 真正 buy / MP / stock 流程
- `stackResolver`
- `comboResolver`
- `targeting`
- `elimination` 正式化
- `characters passive`

#### Phase D：多人同步
- Socket.IO room / lobby / match
- online 2P
- online 3P / 4P

#### Phase E：前端 UI
- board view
- hand view
- selected cards view
- log view
- shop modal
- target picker
- facing picker
- resolve animation

#### Phase F：AI 與部署
- `ai_profiles` 接入
- AI decision making
- local run scripts
- integration / e2e tests
- deployment flow

## 工作規則
- 規則或資料模型有重大改動前，先對照 `docs/GAME_SPEC.md`
- 重要修改先補測試，再補功能
- 每完成重要 slice，更新 `CODEX_HANDOFF.md` 與 `CONTEXT.md`
- 若規格要改，先改 spec，再改 test，再改 code

## Rules API Contract (authoritative)

### Selection item
All player selections must use:

```js
{
  card: { ...cardData },
  extra: { ...optionalInputs }
}
```

### Resolver signatures
All card resolvers use:

```js
resolver(state, player, card, extra)
```

Current signatures:
- resolveAttack(state, attacker, card, extra = {}, incomingDeclaredTargetSet = null)
- resolveDefense(state, player, card, extra = {})
- resolveMove(state, player, card, extra = {})
- resolveBuy(state, player, card, extra = {})

### extra payloads
#### Attack
```js
{
  preferredTargetId?: string,
  retargetInstruction?: {
    toTargetId: string
  }
}
```

#### Move
```js
{
  dx: number,
  dy: number
}
```

#### Buy
```js
{
  shopCardId: string
}
```

### Deprecated payload shapes
Do not use:
- retargetToId
- moveDecision.dx / moveDecision.dy
- to.x / to.y for move
- card.extra
- resolver-specific ad hoc payload shapes

### Stack boundary
Currently only:
- attack
- counter

go through stackResolver.

Currently these resolve immediately:
- defense
- move
- buy

### Test expectation note
For move-related logs, expected coordinates must be derived from:
- initial position
- extra.dx
- extra.dy

Do not hardcode legacy coordinates copied from pre-consolidation payloads.

## FIX-36 contract consolidation (2026-07-14)

Rules layer has been consolidated to a single internal payload contract.

### Authoritative selection item
```js
{
  card: { ...cardData },
  extra: { ...optionalInputs }
}
```

### Authoritative resolver signature
```js
resolver(state, player, card, extra)
```

Current resolver usage:
- resolveAttack(state, attacker, card, extra = {}, incomingDeclaredTargetSet = null)
- resolveDefense(state, player, card, extra = {})
- resolveMove(state, player, card, extra = {})
- resolveBuy(state, player, card, extra = {})

### Authoritative extra payloads
#### Attack
```js
{
  preferredTargetId?: string,
  retargetInstruction?: {
    toTargetId: string
  }
}
```

#### Move
```js
{
  dx: number,
  dy: number
}
```

#### Buy
```js
{
  shopCardId: string
}
```

#### Defense
```js
{}
```

### Deprecated payload shapes
Do not use:
- moveDecision
- retargetToId
- selectedShopCardId
- to.x / to.y for move
- card.extra
- resolver-specific ad hoc payload shapes

### Stack boundary
Currently these go through stackResolver:
- attack
- counter

Currently these resolve immediately:
- defense
- move
- buy

### Test expectation note
Move-related log expectations must be derived from:
- initial position
- extra.dx
- extra.dy

Do not keep legacy coordinates copied from pre-consolidation tests.

### Validation
Verified by:
- npx jest --runInBand tests/rules/gameEngine.test.js -t "move 規則"
- npx jest --runInBand tests/rules/gameEngine.test.js -t "resolveTurn 交錯揭牌順序"
- npm run test:rules

Result:
- 5 / 5 suites passed
- 57 / 57 tests passed

## SLICE-37 single-turn debug runner

### Verified local command
```powershell
node .\scripts\run-single-turn.js
```

### Current purpose
A local single-turn rules verification entrypoint for Windows 11 + VS Code PowerShell.

### Data dependency
Card data used by runtime must be regenerated before local runner verification.

Current workflow:
1. Update card source data
2. Run:
   ```powershell
   node .\scripts\build-data.js
   ```
3. Then run:
   ```powershell
   node .\scripts\run-single-turn.js
   ```

### Verified scenario
- P1 selects `basic_move_1` with `extra: { dx: 1, dy: 0 }`
- P2 selects `basic_guard_2` with `extra: {}`
- Result:
  - P1 moves from `(1,1)` to `(2,1)`
  - P2 defense is applied
  - Turn log shows both actions

### Important note
Do not assume card ids from historical CSV/JSON versions.
Always regenerate JSON from the latest card data before debugging runner behavior.