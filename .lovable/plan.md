
# Plan: Pass context + cross-assessment props to PTPNarrativeSections

## Single file: `src/pages/MyResults.tsx`

Add two props to the existing `<PTPNarrativeSections />` call:
- `ptpContextTab={ptpContextTab}` — forwards the active PTP context tab (professional / personal / combined) so the component can filter facets by context.
- `otherAssessments={assessments.filter(a => !a.isPTP)}` — passes the user's non-PTP assessments so the cross-assessment chips section can render.

No other files changed.
