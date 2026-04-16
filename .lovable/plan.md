
# Plan: AI-generated narrative sections in PTPNarrativeSections

## Single file: `src/components/results/PTPNarrativeSections.tsx`

1. **New state** (after `expandedFacets`): `narrativeSections` ({ profile_overview?, dimension_highlights?: Record<string,string>, cross_assessment? }) and `loadingNarrativeSections`.

2. **New `useEffect`** keyed on `assessmentResultId, ptpContextTab, dimensionScores, otherAssessments`:
   - Skip if no `ptpContextTab`.
   - Look up cached row in `facet_interpretations` filtered by `assessment_result_id` AND `section_type = 'narrative_<ptpContextTab>'`.
   - If absent, invoke `generate-facet-interpretations` edge function with empty `facets`, plus `context_tab`, `dimension_scores` (object form), and `other_assessments` ({ instrument_name, completed_at }), then re-fetch the cached row.
   - Store result in `narrativeSections`.

3. **Update existing facet-insights cache lookup** to also filter `.eq("section_type", "facet_insights")` so narrative rows aren't picked up by the facet query.

4. **Profile overview section**: render loading text → AI `profile_overview` → fallback to existing `profileOverviewText`.

5. **Dimension highlights section**: render loading text, otherwise per-dimension card prefers `narrativeSections.dimension_highlights[dimId]` and falls back to `getDimDescriptor(...)`. Card styling (pastel bg, brand left border, name + score) preserved.

6. **Cross-assessment section**: render loading text → AI `cross_assessment` paragraph → fallback to current static sentence. Always render the chips row beneath.

Coach guard, facet rendering, and all other behavior unchanged. Edge function `generate-facet-interpretations` is expected to handle the new request shape and write `narrative_<context>` rows — wiring/updating that function is a separate follow-up.
