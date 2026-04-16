
# Plan: Rewrite PTP PDF export to mirror platform view

Three coordinated file changes. PDF will reflect the user's currently active context tab (Professional / Personal / Combined) and include all on-screen sections.

## File 1 — `src/components/results/ExportPdfModal.tsx`
- Replace `PdfSections` interface with the new 8-key shape (profileOverview, drivingFacetScores, profileOverviewNarrative, ptpBrainOverview, dimensionHighlights, drivingFacetInsights, crossAssessmentConnections, assessmentResponses).
- Replace `SECTION_OPTIONS` with simplified `{key,label}[]` (no per-section availability checks).
- Remove `hasNarrative` / `hasFacets` / `hasRecommendations` from `Props` and the function signature, drop the `checkProps` lookup.
- Default `sections` state: all 8 true.
- Simplify the checkbox loop — every section always enabled.

## File 2 — `src/pages/MyResults.tsx`
- Rewrite `handlePdfExport` to:
  - Fetch `narrative_<ptpContextTab>` row from `facet_interpretations` for AI narrative blocks (profile_overview, dimension_highlights, cross_assessment).
  - Fetch `facet_insights` row for elevated/suppressed interpretations.
  - Fetch `assessment_responses` + `items`, apply reverse scoring (`100 - raw`), filter by active context tab when professional/personal, compute mean ± stdev to derive elevated (top 10) and suppressed (bottom 10) facets, attach matching interpretation by facet name.
  - When `assessmentResponses` section enabled, fetch and sort all responses by item number for the active context.
  - Build new `PdfData` with `contextLabel`, `narrativeSections`, `elevatedFacets`, `suppressedFacets`, `assessmentResponses`, `isPTP`, dimensions including `pastelColor` and `dimensionId`.
- Update `<ExportPdfModal />` JSX usage — remove `hasNarrative`, `hasFacets`, `hasRecommendations` props.

## File 3 — `src/lib/generateResultsPdf.ts`
- Full rewrite with new `PdfData` types (DimensionRow gains `pastelColor`/`dimensionId`; new `FacetWithInterpretation` and `AssessmentResponse` types; `narrativeSections` object; `contextLabel`, `isPTP`).
- New layout: navy cover page (brand + instrument + context label + participant + date + version), disclaimer card, then conditional sections in platform order:
  1. Profile Overview — stat cards + PTP pastel dimension cards (dot, name, score, band)
  2. Driving Facet Scores — elevated & suppressed tables with dimension-color dots
  3. Profile Overview Narrative — AI text
  4. PTP and Brain Overview — sand pastel card with navy left border, placeholder copy
  5. Dimension Highlights — pastel cards per dimension keyed by `dimensionId`
  6. Driving Facet Insights — per-facet block with header, score badge, two-column ✓/✗ Impact on self / Impact on others
  7. Cross-Assessment Connections — AI text
  8. Assessment Responses — per-item rows with color bar, label, question, score badge, divider
- Filename includes context suffix: `BrainWise-{short}-{Context}-{Last}-{date}.pdf`.
- Helpers: `hexToRgb`, `cleanMarkdown`, `formatBand`, `PTP_DIM_COLOR` lookup.

No other files touched. Routing, auth, assessment flow untouched.
