# Hook: PostToolUse - Automated Quality & Syntax Safeguard

## Trigger Event
`PostToolUse` (Tool: `replace_in_file`, `write_to_file`)

## Execution Logic
After the AI modifies a source file (.js, .ts, .py, .gd, .cs):

1. **Diff Size Verification**:
   - If the changed line count exceeds 150 lines, append a warning: `"WARNING: Large edit detected (>150 lines). Ensure strict adherence to Diff Format."`

2. **Quick Syntax Check**:
   - Run background linter or syntax check based on file extension (e.g., `npx tsc --noEmit` or `eslint` for TS/JS if available).
   - If syntax errors occur, directly inject the error log back to AI:
     `"AUTOMATED LINTER ERROR: Modern syntax check failed at line X. Fix this immediately before asking user for testing."`

3. **Handoff Reminder**:
   - Remind the agent internally: `"Verify if CONTEXT.md or CODEX_HANDOFF.md requires an update."`

## Expected Outcome
Catches syntactical errors immediately post-edit, saving token-expensive back-and-forth debugging sessions with the user.