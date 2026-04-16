
# Plan: Add PTPNarrativeSections component

## New file: `src/components/results/PTPNarrativeSections.tsx`

Create a new client component that renders the structured PTP narrative + facet insights view. Responsibilities:

- **Props**: `assessmentResultId`, `assessmentId`, `narrative`, `dimensionScores`, `dimensionNameMap`, `recommendations`, `permissionLevel`, `isCoachView`.
- **Constants**: brand `PTP_DIMENSION_COLORS` (matching `MyResults.tsx`) and the full 89-entry `PTP_ITEM_FACET_NAMES` map.
- **Data load** (effect on mount):
  1. Fetch all `assessment_responses` for the assessment, then their `items`.
  2. Apply reverse scoring (`100 - raw` when flagged) to compute per-item values.
  3. Compute mean + standard deviation across all values; pick top 10 elevated (> mean + SD) and bottom 10 suppressed (< mean − SD).
  4. Look up cached `facet_interpretations` row by `assessment_result_id`; if missing, invoke the `generate-facet-interpretations` edge function with the elevated+suppressed facet payload and store the returned `facet_data` in state.
- **Sections rendered**:
  - Profile Overview (parsed from narrative)
  - Dimension Highlights (top 3 dims with brand color + extracted text)
  - Driving facet insights — elevated (collapsible rows, color-coded by dimension, score chip, expanded "impact on self/others" lists)
  - Driving facet insights — suppressed (same pattern)
  - Cross-Assessment Connections (parsed from narrative, gated on having recommendations)
- **Coach guard**: when `isCoachView && permissionLevel === 'score_summary'`, render a short "scores only" notice instead of narrative content.
- **Helpers**: `extractSection(narrative, start, end?)` and `extractDimensionText(text, dimensionName)` for narrative parsing.

No other files changed. (Note: this only creates the component — wiring it into `MyResults.tsx` and adding the `generate-facet-interpretations` edge function / `facet_interpretations` table are separate follow-ups.)
