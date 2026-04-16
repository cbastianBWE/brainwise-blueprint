
# Plan: Broaden cross-assessment list to include all other completed assessments

## Single file: `src/pages/MyResults.tsx`

Update the `otherAssessments` prop on `<PTPNarrativeSections />`:

- From: `otherAssessments={assessments.filter(a => !a.isPTP)}`
- To: `otherAssessments={assessments.filter(a => a.result.id !== effectiveSelected?.result.id)}`

This makes the cross-assessment chips show every other assessment the user has completed (including other PTP runs), excluding only the one currently being viewed. No other changes.
