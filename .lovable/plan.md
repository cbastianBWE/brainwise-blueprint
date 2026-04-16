
# Plan: Force page breaks after two PDF sections

Single file: `src/lib/generateResultsPdf.ts`

1. **After Driving Facet Scores** — add `addFooter(); doc.addPage(); y = MARGIN_T;` immediately after the `renderFacetScoreTable("Suppressed Facets", ...)` call, inside the closing brace of the `drivingFacetScores` section.

2. **After PTP and Brain Overview** — append the same three lines after `y += overviewH + 6;`, and remove the now-redundant `if (y > MARGIN_T + 10)` page-break guard that currently precedes Dimension Highlights.

No other changes.
