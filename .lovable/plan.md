

# Plan: Replace chat_sessions update with RPC call in MyResults.tsx

## Single file: `src/pages/MyResults.tsx`

Replace the `supabase.from('chat_sessions').update(...)` call inside `sendChatMessage` with `supabase.rpc('update_chat_session', ...)` using the existing database function. This bypasses RLS by using the SECURITY DEFINER function already defined in the database.

No other files changed.

