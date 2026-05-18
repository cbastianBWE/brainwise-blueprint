## Actor Debrief toggle — single-client Order Assessment modal

All edits in `src/pages/coach/CoachClients.tsx`. Frontend only.

### 1. Modal sizing (line 588)
Change `<DialogContent className="max-w-lg">` → `className="max-w-lg max-h-[90vh] overflow-y-auto"`.

### 2. New state + fetches
Add near existing state:
- `actorCert: { id, certification_type, status, free_uses_expire_at } | null`
- `actorsUsed: number` (default 0)
- `isActorDebrief: boolean` (default false)

Extend the existing `coach_certifications` effect (lines 209–231) to additionally fetch the oldest row for `user.id` where `status in ('in_progress','certified')`, selecting `id, certification_type, status, free_uses_expire_at`. Store in `actorCert`. If found, query `coach_certification_actors` count where `certification_id = actorCert.id` and `status in ('invited','started','completed')`; set `actorsUsed`.

Derived:
```ts
const canOfferActorDebrief =
  !!actorCert
  && actorCert.certification_type === 'ptp_coach'
  && (!actorCert.free_uses_expire_at || new Date(actorCert.free_uses_expire_at) > new Date())
  && actorsUsed < 3;
```

### 3. Toggle row in modal
Directly below the "Allow client to see results immediately" row (line 655–661), conditionally render (when `canOfferActorDebrief`) a matching bordered row with label "This is an actor debrief (certification practice)", subtext "Covered by your certification — no payment required. {3 - actorsUsed} of 3 remaining.", and a Switch bound to `isActorDebrief`.

### 4. Collapse tabs when toggle ON
Wrap `TabsList` (594–597) and both `TabsContent` blocks (664–674) so they render only when `!isActorDebrief`. When `isActorDebrief`, render in place a single full-width button "Send Actor Debrief Invitation" calling `handleOrderActorDebrief` (disabled while submitting or no email).

### 5. Instrument section when toggle ON
Replace the checkbox block (619–654) with a read-only line "Instrument: PTP (Personal Threat Profile)" when `isActorDebrief`. Otherwise render existing checkboxes unchanged.

### 6. `handleOrderActorDebrief`
New handler mirroring the spec. Calls `supabase.rpc("create_actor_debrief_order", { p_actor_email, p_actor_first_name, p_certification_id: actorCert.id, p_coach_note })`. On error, map known error codes (cap_reached, free_use_window_expired, actor_debrief_not_supported_for_cert_type, not_your_certification, certification_not_active, invalid_email_format) to readable toasts. On success, invoke `send-email` reusing the exact HTML template and signup-URL construction from `handleOrderClientPays` (lines ~438–456), but with `email_type: "coach_invitation_actor_debrief"` and `source: "CoachClients.handleOrderActorDebrief"`. Then toast success, `resetForm()`, `setIsActorDebrief(false)`, close modal, `fetchClients()`.

### 7. Reset
Add `setIsActorDebrief(false)` inside `resetForm` (line 273).

### Out of scope
BulkInviteModal, ShareableLinkModal, other order surfaces, the empty-state "no certifications" message (it remains for the non-actor path).
