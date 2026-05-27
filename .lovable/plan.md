## Prompt 2.7 — implement three fixes

### File 1: `src/lib/assemblePdfDataForUser.ts`

**Bug A — split-pair Combined dimension merge**
Insert immediately after the existing `let dimensionScoresMap = result.dimension_scores ?? {};` (line 171) and before the `if (assessmentCtx === 'both' …)` block:

```ts
if (isSplitPairCombined) {
  const { data: personalResult } = await supabase
    .from("assessment_results")
    .select("dimension_scores")
    .eq("assessment_id", params.additionalAssessmentId!)
    .maybeSingle();

  const personalScoresMap = (personalResult?.dimension_scores ?? {}) as Record<string, DimensionScore>;
  const professionalScoresMap = dimensionScoresMap;

  const allDims = new Set([
    ...Object.keys(professionalScoresMap),
    ...Object.keys(personalScoresMap),
  ]);

  const merged: Record<string, DimensionScore> = {};
  allDims.forEach((dim) => {
    const profMean = professionalScoresMap[dim]?.mean ?? null;
    const persMean = personalScoresMap[dim]?.mean ?? null;
    if (profMean !== null && persMean !== null) {
      merged[dim] = {
        mean: (profMean + persMean) / 2,
        band: professionalScoresMap[dim]?.band ?? personalScoresMap[dim]?.band,
      };
    } else if (profMean !== null) {
      merged[dim] = professionalScoresMap[dim];
    } else {
      merged[dim] = personalScoresMap[dim];
    }
  });

  dimensionScoresMap = merged;
}
```

**Bug B — unify facet interpretation lookup**

1. Delete the old `facet_insights_${contextTab}` fetch (current lines 270–279):
   `facetSectionType`, `facetRow` query, and `facetInterpretations` array.

2. Replace with a single merged map built at the top of the `if (isPTP)` block (before the `if (contextTab)` driving-facet compute):

```ts
// Build merged interpretation map from facet_insights_all across the primary
// result row plus (for split-pair Combined) the additional personal result row.
// Used by BOTH C1 (elevated/suppressed) and C2 (per-response insights).
const resultIdsForInterp: string[] = [assessmentResultId];
if (params.additionalAssessmentId) {
  const { data: additionalResultRow } = await supabase
    .from("assessment_results")
    .select("id")
    .eq("assessment_id", params.additionalAssessmentId)
    .maybeSingle();
  if (additionalResultRow?.id) resultIdsForInterp.push(additionalResultRow.id);
}

const { data: allFacetsRows } = await supabase
  .from("facet_interpretations")
  .select("facet_data")
  .in("assessment_result_id", resultIdsForInterp)
  .eq("section_type", "facet_insights_all");

const interpretationMap = new Map<string, {
  positive_self: string[];
  negative_self: string[];
  positive_others: string[];
  negative_others: string[];
}>();
for (const row of allFacetsRows ?? []) {
  const arr = Array.isArray((row as any).facet_data) ? (row as any).facet_data as any[] : [];
  for (const fi of arr) {
    if (fi && typeof fi.name === "string" && !interpretationMap.has(fi.name)) {
      interpretationMap.set(fi.name, {
        positive_self: Array.isArray(fi.positive_self) ? fi.positive_self : [],
        negative_self: Array.isArray(fi.negative_self) ? fi.negative_self : [],
        positive_others: Array.isArray(fi.positive_others) ? fi.positive_others : [],
        negative_others: Array.isArray(fi.negative_others) ? fi.negative_others : [],
      });
    }
  }
}
```

3. In `mapFacet` (current line 346–347), change
   `interpretation: facetInterpretations.find((fi) => fi.name === s.facetName) ?? null,`
   to
   `interpretation: interpretationMap.get(s.facetName) ?? null,`

4. Replace the existing C2 attach block (current lines 408–459) with the simplified version that reuses the same `interpretationMap`:

```ts
if (assessmentResponses.length > 0) {
  assessmentResponses = assessmentResponses.map((r) => ({
    ...r,
    interpretation: interpretationMap.get(r.facetName) ?? null,
  }));
}
```

### File 2: `src/lib/generateResultsPdf.ts`

**Bug C — Action Plan dimension labels**

Inside the Action Plan block (around line 551, right after `const items = data.narrativeSections!.action_plan!;` and `sectionHeading("Action Plan");`), add:

```ts
const dimNameById = new Map(data.dimensions.map((d) => [d.dimensionId, d.name]));
```

Update line 589 from:
`const tagText = String(tag).toUpperCase();`
to:
`const tagText = (dimNameById.get(tag) ?? tag).toUpperCase();`

### Verification after edits

- `npx tsc --noEmit -p tsconfig.app.json` — clean
- `rg "Split-pair Combined: merge dimension scores" src/lib/assemblePdfDataForUser.ts` — 1 hit
- `rg "facet_insights_\\\${contextTab}" src/lib/assemblePdfDataForUser.ts` — 0 hits
- `rg "dimNameById" src/lib/generateResultsPdf.ts` — 2 hits

No other files touched. Mental walkthrough for all 5 scenarios (single personal, single professional, single-both Combined, single-both pro/personal tab, split-pair Combined) confirmed correct in the prompt; no edge cases require deviation.

Approve to switch to build mode and I will apply the edits.
