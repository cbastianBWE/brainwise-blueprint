

# Plan: Add PTP context tabs and combined view to MyResults + DrivingFacetScores

This is a large change across two files that adds Professional/Personal/Combined tab switching for PTP results.

## File 1: `src/pages/MyResults.tsx`

### Imports
- Add `Tabs, TabsList, TabsTrigger` from `@/components/ui/tabs`.

### New state (after line 126)
- `ptpContextTab` state: `'professional' | 'personal' | 'combined' | null`, default `null`.
- `ptpTabOverrideId` state: `string | null`, default `null`.

### Initialize ptpContextTab (after line 276, after `setSelectedId`)
- Find the most recent PTP result and set `ptpContextTab` based on its `context_type`.

### Computed values (after the `selected` useMemo, ~line 288)
- `ptpProfessionalResults`, `ptpPersonalResults` — filtered and sorted memos.
- `hasPtpTabs`, `showPtpTabs` — booleans.
- `combinedDimensionScores` — merged dimension scores averaging professional + personal.
- `effectiveSelected` — resolves which assessment to display based on active tab.
- `effectiveDimensionScores` — dimension entries from effective source.

### Replace dimensionScores (line 383-385)
- Replace `const dimensionScores = selected ? Object.entries(selected.result.dimension_scores) : []` with `const dimensionScores = effectiveDimensionScores`.

### Update render references
- Replace `selected.result` references in the chart/render sections with `effectiveSelected?.result`.
- Replace `selected.isPTP` in chart Cell fill with `effectiveSelected?.isPTP`.

### Insert PTP tabs UI (before line 652 `{/* SECTION 1 */}`)
- Tabs component with Professional/Personal/Combined triggers.
- Version sub-selectors for professional/personal when multiple results exist.
- Info text for combined tab.

### Update DrivingFacetScores call (line 811)
- Pass `additionalAssessmentId={ptpContextTab === 'combined' ? ptpPersonalResults[0]?.result.assessment_id : undefined}`.

### Hide "complete other half" prompt when both exist
- The existing prompt (lines 712-737) should only show when `!hasPtpTabs` (user hasn't completed both halves yet). Add `&& !hasPtpTabs` to the condition.

## File 2: `src/components/results/DrivingFacetScores.tsx`

### Props (line 32-34)
- Add `additionalAssessmentId?: string` to `Props`.

### Destructure (line 36)
- Add `additionalAssessmentId` to destructured props.

### Fetch logic (after line 52)
- After fetching responses for `assessmentId`, if `additionalAssessmentId` is provided, fetch its responses and merge into `allResponses`.
- Replace all subsequent `responses` references with `allResponses`.

### useEffect deps (line 106)
- Add `additionalAssessmentId` to the dependency array.

No other files changed.

