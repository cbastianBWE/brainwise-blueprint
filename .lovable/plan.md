
# Plan: Three targeted fixes to PDF generator

Single file: `src/lib/generateResultsPdf.ts`

1. **Move disclaimer to cover page** — Insert a sand-colored disclaimer card near the bottom of the cover page (above the footer), then remove the duplicate disclaimer block currently rendered at the top of page 2.

2. **Prevent orphaned facet headers** — In `renderFacetInsights`, replace the fixed `checkPageBreak(20)` at the top of each facet loop with a height estimate (header + impact column header + impact rows) so the entire facet block stays together on one page.

3. **Keep "Dimension Highlights" intact** — Before its section heading, force a page break when fewer than 80mm remain on the current page.

No other changes.
