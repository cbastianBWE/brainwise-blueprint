

# Plan: Fix Message Count + Markdown Rendering in MyResults.tsx

## Single file: `src/pages/MyResults.tsx`

### Fix 1 — Use ref for reliable message tracking (lines 487–543)

1. Add `chatMessagesRef` declaration before `sendChatMessage` (line 487)
2. Replace the entire `sendChatMessage` useCallback (lines 488–543) with the ref-based version that:
   - Tracks messages via `chatMessagesRef.current` instead of stale closure `chatMessages`
   - Removes `chatMessages` from the dependency array
   - Correctly computes `message_count` from the ref

### Fix 2 — Enhanced `renderInlineMarkdown` (lines 1187–1196)

Replace with version that handles `# headings`, `*italic*`, and `` `code` `` in addition to `**bold**`.

No other files changed.

