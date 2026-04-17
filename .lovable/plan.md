
# Plan: Wire per-assessment purchase consumption

Two targeted edits, no other changes.

## 1. `src/components/assessment/InstrumentSelection.tsx`
Add `.is("consumed_at", null)` filter to the `assessment_purchases` query so only unconsumed purchases gate access.

## 2. `src/components/assessment/AssessmentFlow.tsx`
Update `handleSubmit` to call the existing `consume_assessment_purchase` RPC after successful score calculation. Wrapped in try/catch (non-fatal — returns NULL for subscription/coach-paid users).

Both changes align with the existing `consume_assessment_purchase` SECURITY DEFINER function in the database.
