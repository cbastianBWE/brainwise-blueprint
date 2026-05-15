# Fix combined tab missing personal-half facets in "Your assessment responses"

## Problem
The `generate_all_facets` effect in `usePTPNarrativeData` only loads the `facet_insights_all` row for the primary `assessmentResultId`. On the combined tab of a split-pair PTP report, the personal half lives in a separate `facet_interpretations` row keyed to a different `assessment_result_id`, so the accordion shows only ~47 (professional) instead of all 89 items.

## Change (single file: `src/components/results/PTPNarrativeSections.tsx`)

Modify only the `run()` async function inside the `generate_all_facets` effect (currently lines 549–638). Everything outside `run()` — deps `[assessmentResultId, responsesExpanded]`, the cleanup, the poll loop, the invoke — stays exactly as-is.

Inside `run()`:

1. Keep the existing primary-row load (`facet_interpretations` for `assessmentResultId`) and the primary `facet_insights_all_total` meta load.
2. After those, when `additionalAssessmentId && ptpContextTab === "combined"`:
   - Query `assessment_results` to resolve `additionalAssessmentId` (an `assessment_id`) → `assessment_result_id`.
   - With that id, load the additional `facet_interpretations` row for `section_type = 'facet_insights_all'`.
   - Capture its `facet_data` array as `additionalLoaded` (default `[]`).
   - Guard every `await` with the existing `cancelled` flag.
3. Compute `loaded = [...primaryLoaded, ...additionalLoaded]` (no dedup — names are unique per half).
4. Adjust the completeness check:
   - Split-pair combined: complete when `primaryLoaded.length >= (storedTotal ?? 0)` AND `additionalLoaded.length > 0`.
   - Otherwise: existing `storedTotal !== null && loaded.length >= storedTotal`.
5. Set `setAllFacetInsights(loaded)` when non-empty; return early if complete; otherwise fall through unchanged to the responsesExpanded gate, invoke, and poll.

The poll loop is intentionally untouched: it polls only the primary row, which is correct because on a split-pair combined view the personal half's row is already complete from its own earlier `generate-all-facets` run and was merged in step 2; the primary row is the only one that may still be filling in.

## Out of scope
- No changes to `MyResults.tsx`, the poll body, the invoke call, props, or any edge function.
- No new prop (`additionalAssessmentResultId`); resolution happens inside the effect via one extra query.

## Verification
- Open a split-pair PTP report on the combined tab, expand "Your assessment responses", confirm the 2+/2- list shows the full merged count (professional + personal) instead of just the professional half.
- Open a both-in-one (non-split) combined report and a single-context (professional or personal) report; behavior should be unchanged.
