
# Plan: Add collapsible "Your assessment responses" section

## Single file: `src/components/results/PTPNarrativeSections.tsx`

1. **New state**: `responsesExpanded` (boolean, default false) and `assessmentResponses` (array of { itemNumber, facetName, itemText, score, dimensionId }).

2. **New `useEffect`** keyed on `assessmentId, ptpContextTab`:
   - Fetch rows from `assessment_responses` for this `assessment_id`.
   - Fetch matching `items` rows by `item_id` to get `item_text`, `item_number`, `dimension_id`, `context_type`.
   - Compute display score: reverse-score (`100 - raw`) when `is_reverse_scored`, else raw; round to int.
   - Map facet name via existing `PTP_ITEM_FACET_NAMES[item_number]` (fallback to truncated item text).
   - When `ptpContextTab` is "professional" or "personal", filter by matching `context_type` (only apply filter if it yields any rows, to stay safe for items without a context).
   - Sort ascending by `itemNumber` and store.

3. **New JSX section** appended at the very bottom of the returned root, after the cross-assessment connections block:
   - Toggle button row showing "Your assessment responses" with `ChevronUp`/`ChevronDown` (already imported).
   - When expanded: bordered card with a header line ("N responses — {context label}") and a list of rows. Each row has a colored left bar using `PTP_DIMENSION_COLORS[dimensionId]`, the question label `Q{n} — {facet}`, the full item text, and a colored score chip on the right.

Coach guard, existing sections, and all other behavior unchanged. No new imports needed (`supabase`, `useState`, `useEffect`, `ChevronUp`, `ChevronDown`, `PTP_ITEM_FACET_NAMES`, `PTP_DIMENSION_COLORS` are already in the file).
