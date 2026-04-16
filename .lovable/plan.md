
# Plan: Split "both" PTP assessments by context across tabs

## File 1: `src/pages/MyResults.tsx`

1. **New state** `bothSplitScores` after `ptpTabOverrideId` to hold professional/personal dimension score maps recalculated from a single "both" assessment's responses.
2. **New useEffect** after the polling effect: when selected is a PTP `both` assessment, fetch responses + items, split by item `context_type`, average per dimension, store in `bothSplitScores`. Clear when not applicable.
3. **`hasPtpTabs`/`showPtpTabs`** updated: introduce `isBothAssessment` and treat `both` as automatically having tabs even without separate prof/personal records.
4. **`effectiveDimensionScores`** updated to return split scores for prof/personal tabs when viewing a `both` assessment, and full dimension_scores for the combined tab.
5. **Tab init** extended to default to `'combined'` when most recent PTP is `both`.
6. **`DrivingFacetScores` call** gains a new `contextFilter` prop when a `both` assessment is being viewed in prof/personal tab; `additionalAssessmentId` is only passed in the dual-assessment combined case.

## File 2: `src/components/results/DrivingFacetScores.tsx`

1. Add `contextFilter?: 'professional' | 'personal'` to `Props` and destructure it.
2. After building `scoredItems`, when `contextFilter` is set, fetch each item's `context_type`, filter `scoredItems` to that context (fallback to all if empty), and use `filteredItems` for mean/stdDev/threshold logic.
3. Add `contextFilter` to the `useEffect` dependency array.

No other files changed.
