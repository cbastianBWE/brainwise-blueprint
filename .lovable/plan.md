
# Plan: Three PDF layout fixes

Single file: `src/lib/generateResultsPdf.ts`

1. **Force page break before Driving Facet Insights** — Insert `addFooter(); doc.addPage(); y = MARGIN_T;` before `sectionHeading("Driving Facet Insights")`.

2. **Force page break before Cross-Assessment Connections** — Same three lines before `sectionHeading("Cross-Assessment Connections")`.

3. **Prevent orphaned subsection title in `renderFacetInsights`** — Change `checkPageBreak(12)` to `checkPageBreak(40)` so the "Elevated Facets" / "Suppressed Facets" subheading carries enough following content with it.

No other changes.
