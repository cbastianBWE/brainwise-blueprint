
# Plan: Expand PTPNarrativeSections with structured content + context awareness

## Single file: `src/components/results/PTPNarrativeSections.tsx`

Replace the entire file with an expanded version that:

- **Adds two new constant maps**: `PTP_DIMENSION_PASTEL` (light card backgrounds matching `MyResults.tsx`) and `PTP_DIMENSION_DESCRIPTIONS` (high/moderate/low descriptor copy for each of the five dimensions).
- **Adds two new optional props**: `ptpContextTab` (`"professional" | "personal" | "combined" | null`) and `otherAssessments` (array of `{ instrument_name, completed_at, result.id }`) for cross-assessment context.
- **Context-aware facet filtering**: also selects `context_type` from `items`, and when `ptpContextTab` is `"professional"` or `"personal"`, filters scored items to that context before computing mean/SD and elevated/suppressed lists. The effect re-runs when `ptpContextTab` changes.
- **Generated profile overview**: replaces narrative parsing for the overview with a deterministic sentence built from structured data — uses context label, sorted dimensions (highest/lowest), and a "tight cluster vs meaningful variation" note based on score range (<8 = clustered).
- **Dimension highlights from structured data**: renders all five dimensions (sorted high→low) as pastel cards using `PTP_DIMENSION_PASTEL` backgrounds and a left border in the brand color. Each card shows name, rounded mean, and a descriptor pulled from `PTP_DIMENSION_DESCRIPTIONS` based on band (≥65 high, ≥40 moderate, else low).
- **Facet rows**: same collapsible elevated/suppressed pattern as before, color-coded by dimension, with item text shown beneath the facet name and the cached/generated "impact on self/others" lists.
- **Cross-assessment section**: replaces the narrative-derived block with a structured panel that summarizes how many other assessments the user has completed and lists their instrument names as chips.
- **Coach guard preserved**: `isCoachView && permissionLevel === 'score_summary'` still short-circuits to the "scores only" notice.
- **Helpers removed**: `extractSection` and `extractDimensionText` are no longer needed (all content now comes from structured data + the facet edge function).

No other files changed. Wiring the new `ptpContextTab` / `otherAssessments` props from `MyResults.tsx` is a separate follow-up — both props are optional with safe defaults so existing callers continue to work.
