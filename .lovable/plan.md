
# Plan: Add NAI results display

## New file: `src/components/results/NAINarrativeSections.tsx`

Mirrors `PTPNarrativeSections.tsx` patterns. Key elements:

- **Constants**: `NAI_DIMENSION_COLORS`, `NAI_DIMENSION_PASTEL`, `NAI_DIMENSION_NAMES`, `NAI_ACTIVATION_BAND` band helper (Low/Moderate/Elevated/High at 26/51/76 thresholds).
- **On mount, fetch in parallel**:
  - All `assessment_responses` joined to `items` for this assessment (extract item_number, facet_name, item_text, dimension_id, score). Items with score ≥ 75 = outliers.
  - All matching rows from `facet_interpretations` filtered by section_type list (overview, 5 dimension highlights, per-outlier item interp, cross_assessment, and 5 coach question sets when `isCoachView`).
  - PTP `assessment_results` row for same user (instrument_id `INST-001`) → `ptpScores`.
  - When `isCoachView`, fetch `cafes_ptp_mapping` rows for elevated dimensions.
- **Generation**: If any required section missing, invoke `generate-facet-interpretations` edge function once with full payload (`assessment_result_id`, `instrument_id: 'INST-002'`, scores, outliers, ptp scores, is_coach). Re-fetch after. Never regenerate cached sections.
- **Sections rendered in order** (with pattern alert at top when applicable):
  1. Pattern alert (coach view, ≥3 dims ≥51) — orange/red bordered card; appends Ego Stability note if DIM-NAI-04 elevated.
  2. Profile overview — sand bg + navy left border.
  3. NAI Overview placeholder — static "Content coming soon" text.
  4. Dimension highlights — 5 cards (color border + pastel bg, name/score/band pill, highlight + areas_of_focus).
  5. PTP prompt — client-only, when no PTP and ≥1 dim ≥50; CTA to `/assessment?instrument=INST-001`.
  6. Items needing attention (client) — outlier items, dimension-colored cards, score badge, Significant/Notable label.
  7. Item outliers (coach) — same + related PTP facets line from `cafes_ptp_mapping`.
  8. C.A.F.E.S.–PTP mapping (coach, elevated dims) — expandable cards with PTP domains, facets, AI coaching questions (fall back to mapping defaults).
  9. Cross-assessment interpretation — when PTP exists; sand card with interpretation + suggestions bullets.
  10. All 25 responses — collapsible, sorted by item_number.
- Loading placeholders ("Generating …") shown while AI sections pending.

## Edit: `src/pages/MyResults.tsx`

- Import `NAINarrativeSections`.
- Add `NAI_DIMENSION_COLORS` and `NAI_DIMENSION_PASTEL` constant maps near the existing PTP constants.
- Add `const isNAI = (selected?.result.instrument_id ?? "").includes("INST-002");`.
- **Section 2 (Profile Chart)**: extend the `effectiveSelected?.isPTP` branch to chain `: isNAI ? <NAIDomainCards … /> : <existing bar chart>`.
- **Section 2b (DrivingFacetScores)**: skip rendering when `isNAI` is true.
- **Section 4 (Profile Interpretation)**: chain `: isNAI ? <NAINarrativeSections … />` between the PTP branch and the generic NarrativeRenderer fallback. Pass `assessmentResultId`, `assessmentId`, `dimensionScores`, `dimensionNameMap`, `isCoachView`, `permissionLevel`, and `otherAssessments` (assessments excluding current).
- Add `NAIDomainCards` sub-component at the bottom of the file — structurally identical to `PTPDomainCards` but uses NAI color/pastel maps and the four-tier band helper (76/51/26).

## Out of scope
No changes to PTP logic, coach portal, billing, edge function code, RLS, or any other file.
