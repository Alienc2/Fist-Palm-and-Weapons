# P0 阻斂閱讀/操作 — 字體放大 + Token 精簡

## Goal

1. 提升核心戰鬥文字至 ≥14px（`clamp(14px, 2.5vw, 18px)`）。
2. 精簡棋盤 token 為「角色名 + HP」，移除 MP 與朝向，移至玩家狀態列。

## Context & Discrepancies Found

| Task description says | Actual code state |
|---|---|
| `views/BoardView.js` | `client/views/boardView.js` (ESM `import` syntax) |
| `renderToken` 函數 | **No `renderToken` function** — token rendering is inline in `renderBoard()` at boardView.js:161-176 |
| 將 MP 與朝向移至 `renderPlayerStatus` | **Already done** — `app.js:84` has `.player-mp`, `app.js:86` has `.player-facing` |
| 修改 `.card-name` | **Already** `clamp(14px, 2.5vw, 18px)` at styles.css:465 — no change needed |

## Decisions

### D1: Token content after simplification
Task says "移除 MP 與朝向" → remove only those two. Token will keep:
- `token-name` (player ID, e.g. "P1") — styles.css:352
- `token-char` (character name, e.g. "破軍（攻擊）") — styles.css:356
- `token-hp` (HP) — styles.css:362

`token-facing` (boardView.js:169-172) and `token-mp` (boardView.js:174) divs will be removed.

> **Note:** "角色名 + HP" could mean just `token-char` + HP (dropping player ID). Keeping `token-name` + `token-char` is the more conservative choice. Flagged for reviewer decision — default: keep both.

### D2: `.player-mp` / `.player-hp` font size
`renderPlayerStatus` row uses `.player-status` at `font-size: 12px` (styles.css:215), below the 14px minimum. Since MP is being moved here, recommend also bumping `.player-hp` and `.player-mp` to `clamp(14px, 2.5vw, 18px)` for consistency.
> **Not in the 5 specified selectors.** Flagged — default: apply for visual consistency.

### D3: Dead code cleanup
After removing facing from the token:
- `FACING_ARROW` constant in boardView.js:12-17 becomes unused
- CSS rules `.token-facing` (styles.css:359-361) and `.token-char` (if D1 keeps it) become unused

> **Recommendation:** Remove `FACING_ARROW` constant. Leave `.token-facing` CSS rule (harmless, may be referenced indirectly). Flagged — default: remove dead JS constant only.

## Affected Files

1. `client/styles.css` — CSS font-size changes (Task 1)
2. `client/views/boardView.js` — remove token-facing & token-mp divs (Task 2)
3. `client/app.js` — (Task 2: already done, verify only)

## Implementation

### Task 1: CSS Font Size Updates

| Selector | Current | Change |
|---|---|---|
| `.card-name` | `clamp(14px, 2.5vw, 18px)` | **No change** ✓ |
| `.card-desc` | `clamp(13px, 2.2vw, 16px)` | → `clamp(14px, 2.5vw, 18px)` |
| `.token-hp` | (none, inherits 11px from `.board-token`) | Add `font-size: clamp(14px, 2.5vw, 18px);` |
| `.token-mp` | (none, inherits 11px from `.board-token`) | Add `font-size: clamp(14px, 2.5vw, 18px);` |
| `.log-entry` | `font-size: 12px` | → `font-size: clamp(14px, 2.5vw, 18px);` |

**Optional (D2):** Also update `.player-hp` and `.player-mp` to `clamp(14px, 2.5vw, 18px)`.

### Task 2: Board Token Simplification

In `client/views/boardView.js`, current token children (lines 166-175):
```js
[
  el("div", { class: "token-name", text: occupant.id }),           // keep
  el("div", { class: "token-char", text: occupant.characterName }), // keep (D1)
  el("div", { class: "token-facing", text: FACING_ARROW[...] }),     // REMOVE
  el("div", { class: "token-hp", text: `HP ${...}/${...}` }),       // keep
  el("div", { class: "token-mp", text: `MP ${...}/${...}` }),       // REMOVE
]
```

After:
```js
[
  el("div", { class: "token-name", text: occupant.id }),
  el("div", { class: "token-char", text: occupant.characterName }),
  el("div", { class: "token-hp", text: `HP ${occupant.hp}/${occupant.maxHp}` }),
]
```

**Dead code (D3):** Remove `FACING_ARROW` constant (lines 12-17) if no other usage.

**Verify:** `renderPlayerStatus` in `app.js:70-91` already has `.player-mp` and `.player-facing` — no change needed.

## Token Overflow Risk

Current: 5 text lines in token (name 13px, char 11px, facing 16px, HP 11px, MP 11px) on `.board-token` base `font-size: 11px` (styles.css:326).

After changes: 3 text lines (name 13px, char 11px, HP clamp 14px-18px). Fewer lines + larger font should fit within square cell (`aspect-ratio: 1`, `padding: 6px`, `gap: 2px`). The `clamp` max of 18px may cause overflow on large screens where cell size is small — monitor closely in testing.

## Validation / Testing

### Automated Checks
- `npm run build:data` (ensure no data changes affect this)
- `npx jest --runInBand` (verify all 284 tests still pass — no server-side logic changed, but confirm)

### Manual Browser Verification (no automated tests exist for CSS/boardView)

**Screen sizes:**
- 720×1280 (手机竖屏)
- 1080×2400 (手机竖屏)

**Checklist:**
1. `.card-name` — already 14px min, confirm still readable ✓
2. `.card-desc` — confirm ≥14px, no overflow in card body
3. `.token-hp` — confirm ≥14px, fits in board token without clipping
4. `.log-entry` — confirm ≥14px, log lines wrap properly
5. Board token — only shows name + char + HP, no facing arrow, no MP
6. Player status row — MP and facing visible in `renderPlayerStatus`
7. No text overflow/overflow on any token or card

**Browser:** Chrome DevTools device mode (or real devices if available).

## Rollout

These are purely frontend presentation changes — no server-side impact. Can be deployed independently. No migration needed.

## Risks

- **P0 (blocking):** Large `clamp` endpoint (18px) on `.token-hp` may overflow square board cells on large screens where cells shrink. Mitigation: the token has `padding: 6px` and `gap: 2px`; if overflow occurs, reduce base font or adjust token padding.
- **P1:** `.token-fiving` and `.token-char` CSS rules become dead code but remain in stylesheet (harmless).
- **P1:** `.player-mp`/`.player-hp` still at 12px if D2 is not applied — MP moved to status row will be smaller than 14px.
