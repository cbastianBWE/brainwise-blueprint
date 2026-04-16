

# Plan: Two Small Fixes in MyResults.tsx

## Fix 1 — Move session update outside setChatMessages updater

**Lines 498–538**: Two changes:
- Add `message_count: 0` to the `chat_sessions.insert` call (line 498–503)
- Replace the `else` block (lines 528–538) to move the DB update outside the state updater

## Fix 2 — Markdown rendering in chat bubble

**Line 960**: Replace `{msg.content}` with `{renderInlineMarkdown(msg.content)}`

No other files changed.

