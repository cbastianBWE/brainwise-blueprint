

# Plan: Coach Permission Level Enforcement

## Changes

### File 1: `src/pages/MyResults.tsx`

**Props (lines 107-112):** Add `permissionLevel` to `MyResultsProps` interface and destructure with default `null`.

**SECTION 4 — AI Narrative (lines 708-821):** Wrap the narrative card's inner content:
- If `!isCoachView || permissionLevel === 'full_results' || permissionLevel === null` → render everything as-is
- If `isCoachView && permissionLevel === 'score_summary'` → replace the card content with muted text: "The client has limited coach access to scores only."

### File 2: `src/pages/coach/ClientResults.tsx`

**State 3 block (lines 29-52):** Extract into a small wrapper component (e.g. `CoachResultsView`) that:
1. Adds `permissionLevel` state (default `null`) and `permLoading` state (default `true`)
2. In a `useEffect`, runs two sequential checks:
   - Query `coach_clients` for a row where `coach_user_id = coachUserId` and `assessment_id = assessmentId`. If found → set `'full_results'`
   - Otherwise, query `permissions` where `owner_user_id = userId` and `viewer_user_id = coachUserId`. Use `permission_level` from that row, or default to `'score_summary'`
3. Shows a `Loader2` spinner while loading
4. Passes `permissionLevel` to `<MyResults>`

No other files change.

## Technical Details

- `permissions.permission_level` is typed as `text` in the DB; cast to the union type on the frontend
- The coach_clients check uses `.eq("assessment_id", assessmentId)` — only matches if the assessment was ordered through the coach flow
- Fallback to `'score_summary'` ensures restrictive default when no explicit permission exists

