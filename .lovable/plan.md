
# Plan: Persist context_type on resumed PTP assessments

## Single file: `src/components/assessment/AssessmentFlow.tsx`

### Change — Update existing assessment with `context_type` on resume
In the branch where an in-progress assessment is found (`existing && existing.length > 0`), after assigning `aId`, add a guarded `update` call to set `context_type` on that assessment row when `contextType` is provided.

This ensures that when a user resumes a PTP assessment, the chosen context (professional/personal/both) is persisted to the existing row rather than only being saved on newly inserted rows.

No other files changed.
