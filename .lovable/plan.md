

# Plan: Update self-pay dialog pricing in InstrumentSelection.tsx

## Single file: `src/components/assessment/InstrumentSelection.tsx`

### Change 1 — Replace `getSelfPayTotal` with dynamic pricing + add `getPerAssessmentPrice`
Replace the existing `getSelfPayTotal` function with a version that looks up the `"individual"` tier plan from `subscriptionPlans`, and add a new `getPerAssessmentPrice` helper.

### Change 2 — Replace dialog content `<div className="space-y-4 mt-2">` section
Replace the entire dialog body with the new layout that shows both monthly and annual options in a 2-column grid for Base and Premium tiers, plus the updated per-assessment card using dynamic pricing from `getPerAssessmentPrice`.

No other files changed.

