# Fix coach view dropping personal half of split-pair PTP

## Problem
In `src/pages/MyResults.tsx`, the coach filter (around line 436) selects only `coach_clients.assessment_id`. For a split-pair PTP, the personal half lives in `coach_clients.paired_assessment_id`, so it is filtered out and the coach sees only the professional tab.

## Change (single file: `src/pages/MyResults.tsx`)
Replace the `linkedRows` query and `linkedIds` set construction inside the `if (isCoachView && coachUserId && shareWithCoach === false)` block:

- Add `paired_assessment_id` to the `.select(...)`.
- Build `linkedIds` from both `assessment_id` and `paired_assessment_id` values, filtering out null/undefined.

Everything else in the file is untouched.

## Verification
- Coach view of a split-pair PTP client now shows professional, personal, and combined tabs.
- Coach view of a both-in-one PTP and non-PTP assessments is unchanged.
