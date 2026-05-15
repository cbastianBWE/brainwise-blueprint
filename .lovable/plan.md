# Fix client view showing personal results before coach release

## Problem
In `src/pages/MyResults.tsx`, the `debriefPendingIds` logic (~line 446) only collects `coach_clients.assessment_id`. For split-pair PTP, the personal half's id is in `paired_assessment_id`, so it's never marked pending and the client sees it before release.

## Change (single file: `src/pages/MyResults.tsx`)
In the `ccRows` query/`pendingIds` build:
- Add `paired_assessment_id` to `.select(...)`.
- Use `.flatMap(r => [r.assessment_id, r.paired_assessment_id])` then `.filter(Boolean)` to include both ids in `pendingIds`.

No other changes.
