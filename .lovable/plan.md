

# Plan: Add useEffect cleanup for chat session on unmount

## Single file: `src/pages/MyResults.tsx`

Add a `useEffect` with a cleanup function after line 144 (after `chatSessionId` state declaration) that calls `close_chat_session` RPC when the component unmounts.

```tsx
useEffect(() => {
  return () => {
    if (chatSessionId) {
      supabase.rpc('close_chat_session', { p_session_id: chatSessionId });
    }
  };
}, [chatSessionId]);
```

No other files changed.

