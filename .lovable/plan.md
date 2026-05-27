# Fix split-pair Combined data merging (Bugs A & B)

Single file: `src/lib/assemblePdfDataForUser.ts`. Both target blocks confirmed to match the prompt's "before" snippets exactly.

## Bug A — Full Facet Charts undercount (lines 460–494)

In the `if (isPTP)` fullFacetData block:
- Change `const allResponses` → `let allResponses`.
- After the primary fetch, if `params.additionalAssessmentId` is set, fetch responses for that assessment_id and concat into `allResponses`.
- Downstream item lookup and mapping unchanged (item_ids are merged automatically via the concat).

## Bug B — Per-response insights missing for personal half (lines 408–440)

Rewrite the C2 attach block:
- Build `resultIdsToQuery: string[] = [assessmentResultId]`.
- If `params.additionalAssessmentId` is set, query `assessment_results` for `id` where `assessment_id = additionalAssessmentId` (`.maybeSingle()`) and push the id when present.
- Replace the `.eq("assessment_result_id", …).maybeSingle()` fetch with `.in("assessment_result_id", resultIdsToQuery).eq("section_type", "facet_insights_all")` returning an array.
- Flatten each row's `facet_data` array into one `mergedInterpretations` list.
- Build `interpretationMap` with "first occurrence wins" guard (`!interpretationMap.has(fi.name)`); same shape as today (positive_self/negative_self/positive_others/negative_others, defaulting to []).
- Final `.map` over `assessmentResponses` unchanged.

The existing outer `if (isPTP && assessmentResponses.length > 0)` guard is preserved (current code uses just `assessmentResponses.length > 0` inside the `isPTP` branch — already correct).

## Not touched

`generateResultsPdf.ts`, `ExportPdfModal.tsx`, `MyResults.tsx`, `Departed.tsx`. No type changes; `interpretation` shape unchanged.

## Verification

- `npx tsc --noEmit -p tsconfig.app.json` clean.
- `rg "additionalAssessmentId" src/lib/assemblePdfDataForUser.ts` — expect new hits in both blocks.
- User visual-tests Combined / Personal / Professional exports.

Cross-page two-column rendering (Bug C) explicitly out of scope.
