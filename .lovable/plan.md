

# Plan: Add PTP context selection step

## File 1: `src/pages/Assessment.tsx`
- Import `Card`, `CardContent` from `@/components/ui/card`.
- Add `contextType` state (`'professional' | 'personal' | 'both' | null`, default `null`).
- In the render, when `selectedInstrument` is set and is `INST-001` with `contextType === null`, render a new `PTPContextSelection` component (three cards: Corporate/Professional, Personal/Social, Both).
- Otherwise render `AssessmentFlow`, passing `contextType` and resetting both states on exit.
- Define `PTPContextSelection` at the bottom of the file.

## File 2: `src/components/assessment/AssessmentFlow.tsx`
- Add optional `contextType?: 'professional' | 'personal' | 'both' | null` to `Props` and destructure it.
- When inserting a new assessment row, include `context_type: contextType ?? null`.
- Convert the items query to a mutable builder; if `instrument_id === 'INST-001'` and `contextType` is set and not `'both'`, append `.eq('context_type', contextType)` before awaiting.

Both `items.context_type` and `assessments.context_type` columns already exist in the DB — no migration needed.

