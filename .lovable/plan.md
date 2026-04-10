

# Plan: Assessment Page Sidebar + Continue Button

## Changes

### 1. `src/App.tsx` — Move `/assessment` route inside AppLayout

Move line 68 (`/assessment`) from the "without sidebar" group into the AppLayout-wrapped group (after line 74, alongside `/dashboard`). The `AssessmentFlow` component will still render inside the layout — users can exit via the existing `onExit` callback.

### 2. `src/components/assessment/InstrumentSelection.tsx` — Add "Continue Assessment" state

- Add `inProgressInstrumentIds` state (a `Set<string>`, same pattern as `completedInstrumentIds`)
- In the existing `Promise.all` load block, add a query: `supabase.from("assessments").select("instrument_id").eq("user_id", user.id).eq("status", "in_progress")`
- Build the set from results
- In the button rendering logic, when an instrument is accessible (subscription, coach-paid, or purchase access) AND `inProgressInstrumentIds.has(inst.instrument_id)`, show "Continue Assessment" instead of "Start Assessment"
- No other button logic changes — locked/upgrade buttons remain identical

### No other files change

