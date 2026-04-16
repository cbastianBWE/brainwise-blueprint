

# Plan: Update purchase ID matching in InstrumentSelection.tsx

## Single file: `src/components/assessment/InstrumentSelection.tsx`

### Change 1 — Split comma-separated instrument IDs in purchasesRes processing
Update the `purchasesRes.data` block to split each `instrument_id` by comma, trimming whitespace, so multi-instrument purchases are correctly tracked.

### Change 2 — Add UUID matching to hasPurchase check
Add `purchasedInstrumentIds.has(instrumentUuid)` as the first check in the `hasPurchase` line, so UUID-based purchase records are matched.

No other files changed.

