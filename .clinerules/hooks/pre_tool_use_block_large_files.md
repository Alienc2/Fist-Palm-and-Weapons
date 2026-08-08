# Hook: PreToolUse - Block Large Files & Blacklists

## Trigger Event
`PreToolUse` (Tool: `read_file`)

## Execution Logic
When the model invokes `read_file`, inspect the target file path and line count:

1. **Check Blacklist Rules**:
   - If path matches `node_modules/`, `dist/`, `.git/`, `package-lock.json`, `*.log`, `*.lock`, `build/`, automatically REJECT the tool call.
   - Return message to AI: `"SYSTEM ERROR: Access to dependency/build file blocked to optimize context. Use search_files or specific query instead."`

2. **Check File Size Limit**:
   - If the target file exceeds 300 lines or 15 KB:
   - REJECT the tool call.
   - Return message to AI: `"SYSTEM ERROR: File exceeds size limit (300 lines). Do NOT read the whole file. Use 'search_files' or specify start/end line numbers to inspect only relevant functions."`

## Expected Outcome
Prevents massive files from dumping thousands of tokens into the chat context.