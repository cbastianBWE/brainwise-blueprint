## MyResults Ask-AI credit awareness

Frontend-only fix in `src/pages/MyResults.tsx`. Backend (`ai-chat` → `check-ai-usage`) already honors one-time chat credits; the UI just needs to stop forcing the upgrade dialog on non-subscribers who have a positive `credit_balance`.

### Changes (single file: `src/pages/MyResults.tsx`)

1. **Add import** alongside existing hook imports:
   ```ts
   import { useAiUsage } from "@/hooks/useAiUsage";
   ```

2. **Inside the component** (near line 244, with other hooks):
   ```ts
   const { usage: aiUsage, fetchUsage: fetchAiUsage } = useAiUsage();
   ```

3. **Preflight effect** (non-consuming; `fetchUsage` uses `check_only`):
   ```ts
   useEffect(() => {
     if (!isCoachView) {
       fetchAiUsage(effectiveTier);
     }
   }, [isCoachView, effectiveTier, fetchAiUsage]);
   ```

4. **Derive credit-aware gate** right after line 246 (`hasActiveAccess`):
   ```ts
   const chatCreditBalance = aiUsage?.credit_balance ?? 0;
   const canUseChat = hasActiveAccess || chatCreditBalance > 0;
   ```

5. **Swap two Ask-AI gate sites only**:
   - Line ~1536: `chatOpen && hasActiveAccess` → `chatOpen && canUseChat`
   - Line ~1627: `if (!hasActiveAccess)` → `if (!canUseChat)`

### Out of scope (do not touch)
- Other `hasActiveAccess` usages elsewhere in the file.
- `sendChatMessage`, the `ai-chat` invoke, or any backend.
- Upgrade-dialog copy (`showChatUpgradeDialog`) — it now only fires for users with neither subscription nor credits, which is correct.
- Active-subscriber and bypass-admin behavior is unchanged (`hasActiveAccess` short-circuits `canUseChat`).

### Verification
- Type-check clean after edits.
