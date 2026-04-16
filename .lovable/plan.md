
# Plan: Add page-break estimate before Impact columns

Single file: `src/lib/generateResultsPdf.ts`

In `renderFacetInsights`, before rendering the "Impact on self" / "Impact on others" column headers, estimate total height of all impact rows (5mm header + maxRows × 14mm) and call `checkPageBreak(estimatedImpactH)`. This keeps the column headers attached to their rows.

No other changes.
