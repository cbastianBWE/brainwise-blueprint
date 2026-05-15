# Plan — Combined-tab response merge for split-pair PTP

Scope: two files, no backend or schema changes. Restores the missing 42 personal-half rows in "Your assessment responses" on the **combined** tab when professional and personal were taken as a split pair.

## File 1 — `src/components/results/PTPNarrativeSections.tsx`

### 1a. Props interface

Add one optional field to `PTPNarrativeSectionsProps`:

```
additionalAssessmentId?: string;
```

Mirrors the same field already on `DrivingFacetScores` / `PTPFullFacetCharts`. Optional so all existing consumers keep compiling unchanged.

### 1b. Hook destructure

In `usePTPNarrativeData`, add `additionalAssessmentId` to the props destructure alongside `assessmentId`, `ptpContextTab`, etc.

### 1c. `fetchResponses` rewrite

Inside the existing effect at line 230, change the fetch logic to handle the optional second assessment:

1. Determine whether to fetch the second half: `const useBoth = !!additionalAssessmentId && ptpContextTab === "combined";`
2. Fetch professional half (or single half) with the existing query, keyed on `assessmentId`.
3. If `useBoth`, fetch the personal half with the same column list keyed on `additionalAssessmentId`.
4. **Merge the two raw response arrays first** (`const merged = [...(respA ?? []), ...(respB ?? [])]`) before any mapping. Bail out early if `merged.length === 0` (preserves existing early-return behavior).
5. Build the `itemIds` list from the merged array, then run the single existing `items` lookup on the combined id list. One DB round-trip for items, not two.
6. Build `itemMap`, then `scored = merged.map(...)` exactly as today — same `facetName`, `itemText`, `score`, `dimensionId`, `contextType` shape.
7. Keep the existing context filter block at lines 264-266 untouched. For `combined` it falls through, so all 89 merged rows survive. For `professional`/`personal` on a split pair it filters to 47 (same as today, since those tabs don't use `additionalAssessmentId`).
8. Keep the single `scored.sort((a, b) => a.itemNumber - b.itemNumber)` at the end so combined renders in correct Q1→Q89 order regardless of fetch ordering.

The two response fetches can run in parallel via `Promise.all([...])` since they're independent reads — same pattern as `DrivingFacetScores` (also in parallel there). This keeps combined-tab latency comparable to single-tab.

### 1d. Effect deps

Update the deps array at line 273 from `[assessmentId, ptpContextTab]` to:

```
[assessmentId, additionalAssessmentId, ptpContextTab]
```

Ensures the effect refires when the user switches between a both-assessment and a split-pair view, or when the personal half loads after the professional half.

## File 2 — `src/pages/MyResults.tsx`

### 2a. `ptpNarrativeProps` addition

In the object literal at line 1221, add one field using the **exact same conditional** already used twice in this file for `DrivingFacetScores` (line 1314) and `PTPFullFacetCharts` (line 1356):

```
additionalAssessmentId:
  ptpContextTab === 'combined' && !isBothAssessment && hasPtpTabs
    ? ptpPersonalResults[0]?.result.assessment_id
    : undefined,
```

That's the only `MyResults.tsx` change. Because `ptpNarrativeProps` is spread into `<PTPNarrativeProvider>` and every section component, the new field flows through with no other wiring.

## Risks / edge cases

- **Both-assessment case**: `isBothAssessment === true` makes `additionalAssessmentId` undefined → `useBoth` is false → fetch path is byte-for-byte identical to today. No regression.
- **Single-context taker** (only professional, or only personal, no pair): `hasPtpTabs` is false → `additionalAssessmentId` undefined → unchanged behavior.
- **Professional / personal tabs on a split pair**: `ptpContextTab !== 'combined'` → `useBoth` false → fetch only the primary assessmentId. The existing context filter then narrows to that half's 47 items. Unchanged.
- **Personal-keyed combined**: the existing convention in `MyResults.tsx` keys combined to the professional half (`effectiveSelected` resolves to professional). If that ever flips for a future user, `additionalAssessmentId` would point at the professional half instead — the merge still produces all 89 rows because both halves are concatenated symmetrically. Sort by `itemNumber` keeps display order correct either way.
- **Item lookup IN clause size**: 89 item ids in a single `.in()` is well under any Postgres / PostgREST limit. No batching needed.
- **Duplicate item ids**: a split pair has disjoint item sets (different `context_type`), so the merged `itemIds` list has no duplicates. Even if it did, `Map` dedupes by key in `itemMap` construction — harmless.
- **In-flight fetch on tab switch**: there is no abort signal in the existing code, so a fast tab switch could let a stale fetch overwrite state. This is a pre-existing behavior of `fetchResponses` and is not introduced by this change. Not in scope.
- **Sort stability**: `Array.prototype.sort` in V8 is stable since 2018, and `itemNumber` values are unique across the merged set, so sort is deterministic.
- **Header counter** ("{assessmentResponses.length} responses — All contexts"): automatically becomes 89 on combined for split pairs, matching the both-assessment number. No string changes needed.
- **Per-row expand feature** (just shipped): unaffected. `allFacetInsights` is keyed only on `assessmentResultId` and `responsesExpanded`, both unchanged. Each merged row still looks up its interpretation by `r.facetName` against the same `facet_insights_all` array. Personal-half rows now have somewhere to appear; their facet lookups will succeed if their facet names exist in `facet_insights_all`.
- **`narrative_status` gate**: untouched. This change only runs after the gate releases.
- **PDF export (`assemblePtpPdfData`)**: out of scope — that path has its own data assembly. If exports also miss the personal half on combined, file a follow-up.

## What this plan does NOT do

- Does not change the context filter logic for professional/personal tabs.
- Does not modify `DrivingFacetScores` or `PTPFullFacetCharts` (already correct).
- Does not touch backend or `facet_interpretations` rows.
- Does not change types beyond adding one optional prop field.
