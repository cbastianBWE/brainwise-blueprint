# Fix cross-page two-column rendering for per-response insights (Bug C)

Single file: `src/lib/generateResultsPdf.ts`. Existing C2 block confirmed at lines 988–1066, matching the prompt's snapshot exactly.

## Replacement

Replace lines 988–1066 (the entire `if (sections.assessmentResponsesIncludeInsights && r.interpretation)` block) with the lockstep version from the prompt:

- Pre-compute both columns as `BulletRow[]` via `buildColumn(positives, negatives, width)`, where each row carries `{ isPositive, lines, height }` measured once via `splitTextToSize`.
- `totalRows = max(leftRows.length, rightRows.length)`.
- Single `checkPageBreak(4 + firstRowMaxH)` before drawing the two bold headers so the header sticks to its first row.
- Loop `i = 0..totalRows-1`: page-break on `Math.max(left?.height ?? 0, right?.height ?? 0)`, then draw both bullets (check or cross) and text at the same `y`, advance `y` by the row max.
- Drop the old `renderColumn` inner function, the `startY` snapshot, and the `y = startY` reset.
- Font order: bold + 7.5 for headers, then normal + 7.5 for body rows. `setFont("helvetica","normal")` + `setFontSize(7.5)` is also set before `buildColumn` so measurements use the same metrics as rendering.

Surrounding loop structure (the outer `for r of assessmentResponses` and the row footer at 983–985) is not touched.

## Not touched

`assemblePdfDataForUser.ts`, `ExportPdfModal.tsx`, `MyResults.tsx`, `Departed.tsx`. No type or data-shape changes.

## Verification

- `npx tsc --noEmit -p tsconfig.app.json` clean.
- `rg "renderColumn|startY" src/lib/generateResultsPdf.ts` — expect zero hits inside the C2 block (no other usages exist in this file).
- `rg "assessmentResponsesIncludeInsights" src/lib/generateResultsPdf.ts` — still exactly one hit.
- User visual-tests Q81 expansion plus regression on other responses.
