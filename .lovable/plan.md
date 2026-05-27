# Prompt 1.6 — Fix split-pair Combined context override

## Problem

In `src/lib/assemblePdfDataForUser.ts` (lines 147–150), the reconciliation block forces `contextTab` to match `assessmentCtx` whenever the underlying assessment row is single-context (`'professional'` or `'personal'`). For split-pair Combined exports, the caller correctly passes the professional `result_id` (anchor for combined narratives) plus `additionalAssessmentId` (personal assessment) and `contextTab='combined'`. The reconciliation then incorrectly downgrades `'combined'` to `'professional'`, causing all four narrative fetches, the facet insights fetch, the Brain Overview variant, and the driving-facets context filter to render professional content.

## Fix — single edit, single file

**File:** `src/lib/assemblePdfDataForUser.ts` only.

Replace the reconciliation block at lines 145–157 with:

```ts
const assessmentCtx = (assessment?.context_type ?? null) as 'professional' | 'personal' | 'both' | null;

// Detect split-pair Combined export: the caller is exporting a Combined view
// assembled from two separate single-context assessments. The professional
// result_id is the canonical anchor (combined narratives are generated against
// it), and additionalAssessmentId points to the personal assessment.
const isSplitPairCombined = !!params.additionalAssessmentId && contextTab === 'combined';

// Reconcile contextTab with assessment context_type
if (assessmentCtx === 'professional' || assessmentCtx === 'personal') {
  if (!isSplitPairCombined) {
    // single-context assessment — force tab to match
    contextTab = assessmentCtx;
  }
  // Split-pair Combined: trust the caller's contextTab='combined' even though
  // this individual result row is a single-context professional result. The
  // combined narratives ARE stored on this row.
} else if (assessmentCtx === 'both') {
  if (contextTab !== 'professional' && contextTab !== 'personal' && contextTab !== 'combined') {
    contextTab = 'combined';
  }
} else {
  contextTab = contextTab ?? null;
}
```

Only two structural additions: the `isSplitPairCombined` declaration and the `if (!isSplitPairCombined)` guard around the single-context override. Comments preserved as-written.

## Files NOT touched

`generateResultsPdf.ts`, `MyResults.tsx`, `ExportPdfModal.tsx`, `Departed.tsx`. Once `contextTab` flows through correctly, every downstream code path (narrative fetch, facet insights fetch, driving-facets filter, Brain Overview variant) does the right thing.

## Downstream walkthrough (no code changes needed)

- Narrative section types resolve to `*_combined` → rows live on professional `result_id` → fetched correctly.
- Facet insights section type → `facet_insights_combined` on professional `result_id`.
- Driving facets filter predicate `assessmentCtx === 'both' && (contextTab === 'professional' || 'personal')` is false → no filter → merged set from both assessments used.
- Brain Overview variant `contextTab ?? "combined"` → `"combined"`.
- Single-context exports (no `additionalAssessmentId`): `isSplitPairCombined` is false → override fires → unchanged behavior.
- `'both'` single-row exports: unchanged.

## Verification

```text
npx tsc --noEmit -p tsconfig.app.json                                  # clean
rg "isSplitPairCombined" src/lib/assemblePdfDataForUser.ts             # 2 hits
rg "additionalAssessmentId" src/lib/assemblePdfDataForUser.ts          # ≥2 hits (untouched)
```

No PDF exported by agent. User visual-tests Combined, Professional, and Personal exports.
