# Plan — Per-row expand of "Your assessment responses"

Scope: `src/components/results/PTPNarrativeSections.tsx` only. No backend changes, no schema changes, no edits to `usePTPNarrativeData` outputs that other sections already consume. Will not touch the recently-added `narrative_status` gating (this section only renders after the gate releases, so behavior is unchanged for `failed`/`generating`/legacy rows).

## 1. New state in `usePTPNarrativeData`

Add four declarations alongside the existing ones (do not rename or remove anything):

- `allFacetInsights: FacetInterpretation[]` — full per-item interpretation array, default `[]`.
- `loadingAllFacetInsights: boolean` — default `false`. Flips to `true` only when the batch loop is actively running.
- `allFacetsExpanded: Set<string>` — separate from `expandedFacets`. Keys use the `response-${itemNumber}` format so they cannot collide with the `elevated-${idx}` / `suppressed-${idx}` keys used by `FacetList`.
- `setAllFacetsExpanded` — the matching `useState` setter, exported as-is.

## 2. New effect

Single `useEffect` with deps `[assessmentResultId, responsesExpanded]`. Logic in this exact order:

1. Guard: if no `assessmentResultId`, return.
2. Set up an `cancelled = false` flag in the closure; the cleanup sets `cancelled = true` so a navigation between assessments aborts both the DB read and the in-flight batch loop.
3. **DB-first check** (always runs, regardless of `responsesExpanded`):
   - `select('facet_data').from('facet_interpretations').eq('assessment_result_id', assessmentResultId).eq('section_type', 'facet_insights_all').maybeSingle()`.
   - If a row exists → set `allFacetInsights` to `data.facet_data as FacetInterpretation[]`, leave `loadingAllFacetInsights` at `false`, return. No batch loop.
4. If no row AND `responsesExpanded === false` → return. Wait for the user to open the accordion.
5. If no row AND `responsesExpanded === true` → run the sequential batch loop:
   - `setLoadingAllFacetInsights(true)`.
   - Get session / auth header once (same pattern used elsewhere in the file).
   - Call batch 0 via `supabase.functions.invoke('generate-facet-interpretations', { body: { assessment_result_id, generate_all_facets: true, batch_index: 0 }, headers: authHeaders })`.
   - Read `total_batches` from the response.
   - `for (let i = 1; i < total_batches; i++)` await each call strictly sequentially. Bail out (and `setLoadingAllFacetInsights(false)`) on `error` or `cancelled`.
   - When `done: true` is received (or the loop completes), re-run the same DB read from step 3 to load the materialized row, set `allFacetInsights`, then `setLoadingAllFacetInsights(false)`.
6. Cleanup: sets `cancelled = true`. The loop checks `cancelled` after each `await`; if true it returns without touching state. This handles both assessment-id changes and unmount mid-loop.

Notes:
- No `Promise.all`, no parallel batches.
- Re-running batch 0 on a row that already exists is harmless because the backend returns `skipped: true`, but the DB-first check skips that case entirely.
- The effect does NOT depend on `ptpContextTab` — `facet_insights_all` is one row per assessment, not context-scoped.

## 3. Hook return / context additions

Append (do not reorder existing fields) to the return object:

- `allFacetInsights`
- `loadingAllFacetInsights`
- `allFacetsExpanded`
- `setAllFacetsExpanded`

Because `PTPNarrativeContext` derives its value from `ReturnType<typeof usePTPNarrativeData>`, the four fields are picked up automatically by every consumer with no other change.

## 4. `PTPAssessmentResponsesSection` changes

Destructure the four new fields from context alongside the existing three.

The outer accordion (Your assessment responses header + chevron) stays exactly as is — same toggle, same styles, same context-tab summary line.

Each response row currently a `<div>` becomes the same two-part shape `FacetList` uses:

- A `<button>` wrapping the existing left bar / Q# + facet name / score badge, plus a `ChevronDown`/`ChevronUp` on the far right. `onClick` toggles `allFacetsExpanded` for key `response-${r.itemNumber}`.
- The question text (`r.itemText`) stays inside the button so the row still reads the same when collapsed.
- When `allFacetsExpanded.has(\`response-${r.itemNumber}\`)`:
  - Render an expanded panel with `borderTop: 1px solid var(--border-1)` and `padding: 16`, matching `FacetList`'s expanded block.
  - If `loadingAllFacetInsights === true` OR no matching interpretation found yet → `<p>Generating insights...</p>` in the same muted style `FacetList` uses.
  - Otherwise look up `allFacetInsights.find(f => f.name === r.facetName)`. If found, render the **identical** 2-column grid (`grid md:grid-cols-2 gap-4`) with "Impact on self" / "Impact on others" headings, the same ✓ (forest) / ✗ (destructive) bullets, same font sizes/colors. Order: `positive_self` then `negative_self` on the left column; `positive_others` then `negative_others` on the right.
  - If no interpretation match (lookup miss) → keep showing "Generating insights..." rather than an empty panel; this is the safe state when the user opens a row before the loop finishes that facet.

The `borderBottom` rule on the row container is preserved (last row has none).

## 5. Risks / edge cases

- **Stale loop after navigation**: handled by the `cancelled` flag in cleanup. The loop must check `cancelled` after every `await` (DB read, each batch invoke) before calling `setState`.
- **Name mismatch**: `allFacetInsights.find(f => f.name === r.facetName)` relies on the names matching exactly. `r.facetName` comes from `PTP_ITEM_FACET_NAMES` lookup. Per the constraint, do not modify `fetchResponses`. If a future backend rename diverges from `PTP_ITEM_FACET_NAMES`, the row will permanently show "Generating insights..." for that facet — flag this as a brittleness, not a bug to fix now.
- **Key collision**: using `response-${itemNumber}` keeps `allFacetsExpanded` cleanly separate from the existing `expandedFacets` (`elevated-${idx}` / `suppressed-${idx}`). No shared state, no cross-toggle.
- **Re-open without DB read**: if the user collapses the outer accordion and reopens it, `responsesExpanded` flips false→true and the effect re-runs. The DB-first check will now find the row and short-circuit instantly — no second batch loop.
- **Race between DB read and batch loop**: the effect always runs the DB read first, then conditionally the loop, both inside the same async closure guarded by `cancelled`. No double-fetch.
- **Backend 409 (out-of-order)**: cannot happen because batches are awaited strictly in order, but if it ever does the loop bails (sets loading false), the row stays collapsed-with-spinner; user can collapse and reopen to retry.
- **Pre-generation interaction**: if `facet_insights_all` is pre-generated at assessment completion (or by a future hook into `calculate-scores`), the DB-first check loads it on mount, the section is instant, no spinner ever shows. This is the desired behavior and requires no extra wiring here.
- **Coverage gap**: `allFacetInsights` is one flat list of 89; `assessmentResponses` may include items the backend did not interpret (unlikely but possible if item set drifts). Affected rows show "Generating insights..." indefinitely — same flag as the name-mismatch case.
- **No regression to other sections**: `expandedFacets`, `facetInterpretations`, `loadingInterpretations`, `responsesExpanded`, and the existing return shape are all unchanged. `FacetList`, `PTPFacetInsightsElevatedSection`, `PTPFacetInsightsSuppressedSection`, and the narrative-status gate in `MyResults.tsx` are untouched.

## What this plan does NOT do

- No edits to `generate-facet-interpretations`, `calculate-scores`, or `retry-ptp-narratives`.
- No new DB columns, no migrations.
- No changes to PDF assembly (`assemblePtpPdfData`) — out of scope; can be a follow-up if you want these in exports.
- No pre-generation kickoff added to `calculate-scores`. The first user to open the accordion still pays the latency; subsequent opens are instant. Add pre-gen later if desired.
