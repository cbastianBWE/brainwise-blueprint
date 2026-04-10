

# Plan: Two-Level Client Results Browser for Coach Portal

## What This Does

Transforms `/coach/client-results` from a "No client specified" dead-end into a drill-down browser:
- **Level 1**: Lists all unique clients the coach has a relationship with (name + email)
- **Level 2**: Shows viewable assessments for a selected client (respecting `share_results_with_coach` filtering)
- **Level 3**: Existing full results view (unchanged)

Direct navigation via `?user_id=...&assessment_id=...` continues to work as before.

## Changes

### Single file: `src/pages/coach/ClientResults.tsx`

Expand this component to handle three states based on query params:

**State 1 — No `user_id` param (Client List)**
- Query `coach_clients` where `coach_user_id = user.id`
- Deduplicate by `client_user_id` (skip null entries — uninvited clients)
- For each unique `client_user_id`, fetch name/email from `users` table
- Display as a card list with client name, email, and a clickable row
- Clicking sets `?user_id=<client_user_id>` via `setSearchParams`

**State 2 — `user_id` present, no `assessment_id` (Assessment List)**
- Fetch client's `share_results_with_coach` from `users` table
- If `true`: fetch all completed `assessment_results` for that user
- If `false`: fetch `coach_clients` rows for this coach/client pair where `assessment_id IS NOT NULL`, then fetch only those `assessment_results`
- Join with `instruments` table for display names
- Show each assessment as a clickable card (instrument name, date)
- Clicking sets `?assessment_id=<id>` via `setSearchParams`
- Back button clears `user_id` to return to Level 1

**State 3 — Both `user_id` and `assessment_id` present (Full Results)**
- Existing behavior: renders `<MyResults isCoachView .../>` (unchanged)
- Back button clears `assessment_id` to return to Level 2

### No other files change
- `MyResults.tsx` — untouched
- Routing — untouched
- RLS — already supports all needed queries (coaches can read their clients' users, assessment_results, coach_clients)

## Technical Notes
- Uses existing `useSearchParams` for state management — bookmarkable URLs
- The `users: coaches can read their clients` RLS policy already allows reading client name/email
- The `assessment_results: coaches read client results` RLS policy already allows reading all client results
- The `share_results_with_coach` filtering is done client-side (same pattern as MyResults)

