# Plan — Compare prior diagnosis vs. user's diagnosis, then surgical loop fix

## How this differs from my previous plan

My previous plan blamed the **server**: I saw rows with `n=10` in `facet_interpretations.facet_data` and concluded the deployed `generate-facet-interpretations` function was applying the elevated/suppressed top-10 selector to the `generate_all_facets` branch. That theory required pulling the function source into the repo and forking the selector.

Your diagnosis blames the **client loop**, and after re-reading the effect at lines 543–615 of `src/components/results/PTPNarrativeSections.tsx` against your reasoning, you're right and I was wrong (or at least: client-side is the proximate cause regardless of any server behavior). The two bugs are real:

- **Bug 1 — fail-stop kills the run.** Line 589–592: on `next.error`, the loop calls `setLoadingAllFacetInsights(false); return;`. No retry. The remaining batches never execute.
- **Bug 2 — partial state never loads.** The final DB read at line 596 only runs if the loop finishes normally. When the loop bails early, whatever the backend already wrote (e.g. batch 0's 10 rows) sits in the DB but never enters React state. Worse, on the **next** open the DB-first check at line 548 finds that partial 10-row record, treats it as ready, short-circuits, and the user is permanently stuck on 10. That fully explains the n=10 we saw in DB without needing a server-side selector bug.

So the right fix is the loop, not the server. My previous plan is superseded.

## Surgical fix — loop body only

Scope: **lines 563–608** of `src/components/results/PTPNarrativeSections.tsx` (the `setLoadingAllFacetInsights(true) → try { ... } finally` block). Nothing else in the file changes.

### Out of scope — explicitly do not touch

- DB-first check (lines 548–559).
- `responsesExpanded` gate (line 561).
- State declarations (`allFacetInsights`, `loadingAllFacetInsights`, `allFacetsExpanded`).
- Effect deps `[assessmentResultId, responsesExpanded]`.
- `cancelled` flag setup and cleanup.
- Hook return object additions.
- `PTPAssessmentResponsesSection` rendering.
- The `additionalAssessmentId` combined-tab merge in `fetchResponses`.
- The `narrative_status` gating, retry-ptp-narratives, all unrelated.

### New loop behavior

Replace the loop block with logic that:

1. **Retries batch 0** up to `MAX_RETRIES = 2` times (3 attempts total). Reads `total_batches` only from a successful response. If all 3 attempts fail, give up on the run but still fall through to the final DB read (which may find nothing — that's fine).
2. **Iterates batches 1 .. totalBatches-1 sequentially.** Each batch retries up to `MAX_RETRIES = 2` times. Between retries, awaits `setTimeout(2000ms)` so a struggling Anthropic API can recover. Checks `cancelled` after the wait.
3. **On a batch that exhausts retries**, `break` out of the outer loop (do not `return`). This preserves any backend-written progress and lets the final DB read run.
4. **Drops the `isDone` short-circuit** (current line 581/593). It was redundant because the backend's `total_batches` already bounds the loop, and using it added a second exit condition that interacts oddly with retries. The final DB read is now the single source of truth.
5. **Always runs the final DB read** unconditionally inside the `try`. Loads whatever exists into `allFacetInsights` (full 89 on success, partial 10/20/etc. on partial failure, nothing on total failure). Stays in `try` so the `finally` still flips loading off.
6. **Keeps `cancelled` checks** after every `await`: session lookup, each batch invoke, each 2-second retry sleep, and the final DB read. Same cleanup contract as today.

### Pseudocode shape (for review only — not the implementation)

```
setLoadingAllFacetInsights(true)
try {
  authHeaders = await getSession + cancel-check
  totalBatches = 1
  // Batch 0 with retry
  for attempt 0..MAX_RETRIES:
    invoke(batch_index: 0)
    cancel-check
    if !error: totalBatches = data.total_batches ?? 1; break
  // Batches 1..N with per-batch retry
  for i in 1..totalBatches-1:
    cancel-check
    succeeded = false
    for attempt 0..MAX_RETRIES:
      invoke(batch_index: i)
      cancel-check
      if !error: succeeded = true; break
      await sleep(2000); cancel-check
    if !succeeded: break
  // Always read whatever was written
  finalRow = select facet_data ... .maybeSingle()
  cancel-check
  if finalRow?.facet_data: setAllFacetInsights(...)
} finally {
  if !cancelled: setLoadingAllFacetInsights(false)
}
```

## Why this fixes the user's symptom (n=10 stuck in DB)

- The two stuck rows we saw (`d7903067…`, `a48c43b3…`) were partial writes from a single failed batch under the old fail-stop loop. The new loop would have retried instead of bailing, so they likely would have completed in the first place.
- For **already-stuck** rows: the DB-first check still short-circuits when `existing.facet_data` is present, so the new loop alone won't re-run for those two rows. Those need a one-time DB cleanup (delete or null those two rows) so the next open re-runs the loop. Mention this as a follow-up step but not part of this code change.

## Risks / edge cases

- **Backend gap-guard 409**: the user's note says strict in-order is enforced. The new loop is still strictly sequential (await per batch), and the only retried batch is the same `i` we just failed. We never advance to `i+1` until `i` succeeds, so we cannot trigger a 409.
- **Total runtime worst case**: `(89 / batch_size) * (MAX_RETRIES+1) + retry waits`. Batch size appears to be 10 → 9 batches. Worst case 9 × 3 attempts + 9 × 2 × 2s sleeps = 27 invokes + 36s of sleeps. Still reasonable for a one-time generation.
- **Stuck cleanup**: as above, the two existing 10-length rows still need to be deleted to self-heal under the new loop. Two-row `DELETE` from `facet_interpretations` for the affected `assessment_result_id` values, `section_type='facet_insights_all'`. Optional, separate step.
- **Cancellation during retry sleep**: the `await new Promise(resolve => setTimeout(resolve, 2000))` is awaitable but not abortable. We rely on the post-sleep `cancelled` check to no-op the next setState, which is fine — we just wait up to 2s after navigation before the run truly stops. No state corruption.
- **`isDone` removal**: today's loop used `done: true` from the response to short-circuit when the backend signals completion early. Dropping it can mean we issue 1–2 extra "skipped" invokes if `total_batches` overshoots the actual count. Backend already returns `skipped: true` cheaply for already-done batches, so the cost is negligible and the simplicity gain is worth it. If this turns out to be expensive, easy to re-add inside the inner success branch.
- **No regression to other sections**: changes are confined to one block. `expandedFacets`, `facetInterpretations`, `loadingInterpretations`, `responsesExpanded`, `assessmentResponses`, the combined-tab merge, and the per-row render all remain untouched.

## Follow-up (separate step, not in this code change)

Run a one-line update to clear the two known-bad rows so the next open of those reports regenerates:

```
DELETE FROM facet_interpretations
WHERE section_type = 'facet_insights_all'
  AND assessment_result_id IN ('d7903067-c36f-40b8-a0c2-881ce8b8b973', 'a48c43b3-2900-47b5-83c7-763a6aa8e810');
```

I'll surface this as a separate question after the loop fix lands so you can approve the destructive op explicitly.
