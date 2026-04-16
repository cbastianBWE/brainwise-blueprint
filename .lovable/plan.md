

# Plan: Close chat session on X button click in MyResults.tsx

## Single file: `src/pages/MyResults.tsx`

Replace the X button's `onClick` handler in the chat bubble header. Currently it only closes the UI (`setChatOpen(false)`). The new handler will also call the `close_chat_session` RPC to set `ended_at` on the session row, then clear `chatSessionId`.

No other files changed.

