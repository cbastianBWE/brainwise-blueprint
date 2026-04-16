

# Plan: Add Floating AI Chat Bubble to MyResults.tsx

## Single file: `src/pages/MyResults.tsx`

### Changes

1. **Update imports** (line 31): Add `Brain, X` to the lucide-react import. Add `useCallback` if not already imported (it is — line 1).

2. **Add state variables** (after line 137): Add `chatOpen`, `chatMessages`, `chatInput`, `chatLoading`, `chatSessionId`, `showChatUpgradeDialog` state declarations.

3. **Add `sendChatMessage` function** (after `handlePdfExport` — around line 490): Insert the provided `sendChatMessage` useCallback that sends messages to the `ai-chat` edge function, manages chat session creation, and updates message history.

4. **Remove the "Ask AI About My Results" button** (lines 603–617): Delete the entire `<Button>` block that currently shows a "Coming Soon" toast.

5. **Add floating chat bubble** (after `ExportPdfModal` closing tag, before line 871 `</>`): Insert the floating chat UI with:
   - Chat window (header, context note, messages area, input)
   - Bubble toggle button with Brain icon
   - Upgrade AlertDialog for non-subscribers

No other files changed.

