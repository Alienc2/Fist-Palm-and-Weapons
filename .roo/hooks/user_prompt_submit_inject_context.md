# Hook: UserPromptSubmit - Dynamic Context Injection

## Trigger Event
`UserPromptSubmit`

## Execution Logic
Before handing the user's prompt to the model, execute the following minimal status checks in background:

1. **Git Status Check**:
   - Run `git status --short` silently.
   - If modified files exist, prepend a condensed line to context: `[System Info: Currently modified files: <file_list>]`.

2. **Context Snapshot Check**:
   - Check if `CONTEXT.md` exists.
   - If present, extract only the `# Current Slice` section (top 10 lines) and inject as: `[System Info: Active Slice: <slice_summary>]`.

3. **Token Cleaning**:
   - Strip duplicate user whitespaces and unnecessary line breaks.

## Expected Outcome
Provides instant awareness of current project state without re-reading entire project history files every turn.