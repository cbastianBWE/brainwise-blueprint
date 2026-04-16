

# Plan: Add chatSessionIdRef for reliable unmount cleanup in MyResults.tsx

## Changes (single file: `src/pages/MyResults.tsx`)

### 1. Add `chatSessionIdRef` after `chatMessagesRef` (line 496)
Add `const chatSessionIdRef = useRef<string | null>(null);` after the `chatMessagesRef` declaration.

### 2. Sync ref after session creation (line 520)
After `setChatSessionId(session.id);`, add `chatSessionIdRef.current = session.id;`.

### 3. Replace unmount useEffect (lines 146–152)
Change the cleanup effect to use `chatSessionIdRef.current` instead of `chatSessionId`, and set dependency array to `[]` so it only runs on unmount.

No other files changed.

