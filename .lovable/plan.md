Fix two React #310 "rendered more hooks than during the previous render" crashes by moving hooks above all conditional early returns.

## File 1: `src/components/assessment/AssessmentFlow.tsx`
Move the `allAnswered` const + its `useEffect` from below the `if (needsAck)` / `if (loading || submitting)` early returns to immediately above the `if (needsAck)` return, alongside the other hooks. Leave `currentItem`, `isLast`, `progress`, `currentResponse`, `goToNextUnanswered` in place. No other logic changes.

## File 2: `src/pages/Onboarding.tsx`
Replace the entire file with the corrected version supplied in the request. The fix:
- Compute `alreadyOnboarded` as a plain boolean.
- Move the `useEffect` (coach-client auto-link + stashed invite code check) above all early returns, and guard its body with `if (!user || accountTypeLoading || alreadyOnboarded) return;`.
- Move the spinner return and `<Navigate to="/" replace />` return below all hook declarations.
- Preserve all existing UI, callbacks, and toast behavior verbatim.

No other files touched.
