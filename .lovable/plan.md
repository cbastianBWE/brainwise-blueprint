
# Plan: Wire PTPNarrativeSections into MyResults

## Single file: `src/pages/MyResults.tsx`

### Change 1 — Import
Add `import PTPNarrativeSections from "@/components/results/PTPNarrativeSections";` with the other component imports at the top.

### Change 2 — SECTION 4 branch on PTP
Wrap SECTION 4 so that when `effectiveSelected?.isPTP` is true, render `<PTPNarrativeSections>` (passing `assessmentResultId`, `assessmentId`, `narrative`, `dimensionScores`, `dimensionNameMap`, `recommendations`, `permissionLevel`, `isCoachView`) instead of the existing AI Narrative card. For all non-PTP results, keep the current card UI exactly as-is (coach guard, narrative render, version labels, limit-reached banner, regenerate button + both AlertDialogs, polling state, empty state).

No other files changed.
