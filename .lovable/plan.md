

# Plan: Add markdown rendering for assistant chat messages in MyResults.tsx

## Single file: `src/pages/MyResults.tsx`

Replace lines 987–989 (the chat message bubble content) with enhanced markdown rendering for assistant messages. User messages continue using `renderInlineMarkdown` directly. Assistant messages get line-by-line parsing for headings (`#`, `##`, `###`), bullet points (`-` or `*`), and regular paragraphs.

The new rendering splits assistant message content by newlines and renders each line as the appropriate element (heading, bullet with dot indicator, or paragraph), while user messages remain unchanged.

No other files changed.

