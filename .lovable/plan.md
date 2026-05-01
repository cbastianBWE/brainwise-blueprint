# Remove coach redirect/toast on /assessment

The previous change added a redirect-and-toast for coaches on `/assessment`. You want coaches to be able to land on the page like an individual base-tier user — they'll see the four cards with "Purchase to Access" buttons (already in place via `canBypassAssessmentPaywall` in `InstrumentSelection.tsx`).

## Changes — `src/pages/Assessment.tsx` only

1. Remove the `Navigate` and `toast as sonnerToast` imports, and the `useAccountRole` import.
2. Remove the `useAccountRole()` destructure inside the component.
3. Remove the `useEffect` that fires the "Assessments are not included…" toast.
4. Remove `const shouldRedirectCoach = …` and the `if (shouldRedirectCoach) return <Navigate … />` block (added near the `if (selectedInstrument)` branch).

## Net behavior after fix

- Coach navigates to `/assessment` → sees the standard `InstrumentSelection` page → all 4 cards show "Purchase to Access" outline buttons routing to `/pricing` (same as a base-tier individual with `subscription_status='inactive'`).
- No toast, no redirect.
- `MyResults` "Take/Retake" CTAs stay hidden for coaches (from earlier change) — that's still the right behavior since launching them would just bounce a coach to a paywall card; harmless to keep hidden, but say the word if you want them shown too.
- AI chat / resources / coach UI bypass via `isBypassAdmin` unchanged.

## Files NOT touched

- `src/lib/accountRoles.ts` — `canBypassAssessmentPaywall` flag stays.
- `src/components/assessment/InstrumentSelection.tsx` — already does the right thing for coaches.
- `src/components/SubscriptionGate.tsx`, `src/pages/MyResults.tsx` — unchanged from prior step.
