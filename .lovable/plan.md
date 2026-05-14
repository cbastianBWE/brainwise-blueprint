## Plan: PTP half-then-half entitlement (frontend only)

Backend already deployed. No SQL/Edge Function changes. Six files touched.

### 1. `src/components/assessment/InstrumentSelection.tsx`
- Widen the three entitlement queries in `load()`:
  - **coachClientsRes**: drop `.is("assessment_id", null)`; replace `.neq("invitation_status","completed")` with `.in("invitation_status", ["sent","opened","partially_completed"])`; add `context_progress, paired_assessment_id` to select.
  - **selfPayCoachClientsRes**: drop `.is("assessment_id", null)`; change `.in()` to include `"partially_completed"`; add `context_progress`.
  - **purchasesRes**: keep `consumed_at IS NULL`; add `context_progress`.
- After existing Set construction, build `ptpContextProgress: Map<string,string>` from the three arrays (prefer non-null values, JS-side only).
- Inside `coachPaid`, `purchaseAccess`, and `selfPayCoachInvited` branches only, gated to `inst.instrument_id === "INST-001"`:
  - `professional_done` → button "Continue your PTP — Personal half", `onSelect({...inst, contextType:'personal'})`.
  - `personal_done` → "Continue your PTP — Professional half", `contextType:'professional'`.
  - null/undefined → unchanged existing branch behavior.
- Do NOT reorder the if/else chain. Do NOT modify `canBypassAssessmentPaywall`/`isCorp`/`subscriptionAccess` branches. Do NOT touch create-checkout calls.

### 2. `src/pages/Assessment.tsx`
- Extend `SelectedInstrument` interface with optional `contextType?: 'professional' | 'personal' | 'both'`.
- In the `onSelect` handler passed to `<InstrumentSelection>`, if payload includes `contextType`, call `setContextType(payload.contextType)` alongside `setSelectedInstrument`.
- Existing PTP context-picker guard remains as-is — it naturally skips when contextType is preset.

### 3. `src/components/assessment/AssessmentFlow.tsx`
- In `handleSubmit()`, add `p_context_type: contextType` as a 4th arg to the existing `supabase.rpc("consume_assessment_purchase", {...})` call. Nothing else changes.

### 4a. `src/pages/coach/CoachClients.tsx`
- Add `"partially_completed"` to the pending-status set in: `fetchClients` enrichment, `uniqueClients` rollup, and `pendingInvitationsCount` stat.
- `getStatusBadge`: add explicit `partially_completed` case rendering `<Badge variant="secondary">In Progress</Badge>`.
- Enable Remind button for `partially_completed`.
- Debrief button gating unchanged (still `completed` only).

### 4b. `src/components/coach/PendingInvitations.tsx`
- Add `"partially_completed"` to the `.in("invitation_status", [...])` filter in `fetchPending`.
- Status Badge: when `invitation_status === "partially_completed"` render `"In Progress"`; otherwise keep `cap(...)`.

### 4c. `src/pages/coach/CoachInvoices.tsx`
- In status derivation, add `invitation_status === "partially_completed"` to the `anyOpened` condition. `allCompleted` stays as `every === "completed"`.

### Notes
- Half-state detection uses ONLY `ptpContextProgress` from entitlement-carrier rows; never inspects `assessments` or `completedInstrumentIds`. Corporate/subscribed users are caught by higher branches and naturally avoid half-state UI.
- Only INST-001 (PTP) is affected. NAI/AIRSA/HSS card behavior unchanged everywhere.
