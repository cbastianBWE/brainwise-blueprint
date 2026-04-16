
# Plan: Show "complete other half" prompt on PTP results

## Single file: `src/pages/MyResults.tsx`

### Change 1 — Fetch `context_type`
Add `context_type` to the `assessments` select list.

### Change 2 — Extend `AssessmentWithResult` interface
Add `context_type: string | null` field.

### Change 3 — Map `context_type` into combined results
Pull `context_type` from `assessmentMap` when building each combined record.

### Change 4 — Render prompt card before SECTION 2
Insert a conditional `<section>` that shows a primary-tinted Card with a "Start Now" button when the selected result is PTP (`INST-001`) and `context_type` is `professional` or `personal`. The copy and CTA target the missing half. Clicking navigates to `/assessment?instrument=INST-001&autostart=true`.

No other files changed.
