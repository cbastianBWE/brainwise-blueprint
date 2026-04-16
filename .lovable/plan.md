
# Plan: Guard combinedDimensionScores against missing PTP halves

## Single file: `src/pages/MyResults.tsx`

### Change — Add null guards to `combinedDimensionScores`
Update the early-return in the `combinedDimensionScores` useMemo so it also bails out when either `ptpProfessionalResults[0]` or `ptpPersonalResults[0]` is undefined. This prevents a runtime crash now that `hasPtpTabs` can be true for `both` assessments where the separate professional/personal result rows may not exist.

No other files changed.
