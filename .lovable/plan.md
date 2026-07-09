## The bug

The "Mark Debrief Complete" button in the coach's per-client assessment detail table (`src/pages/coach/CoachClients.tsx`, ~line 1187) is gated on:

```ts
c.invitation_status === "completed" && c.assessment_status === "completed"
```

The DB shows three coach_clients rows where the underlying assessment is `status='completed'` but the `coach_clients.invitation_status` never advanced past `partially_completed`. For those clients — exactly the ones the coach needs to debrief — the button is hidden even though the assessment is done and the debrief is legitimately pending.

Older rows kept invitation_status in sync with the assessment; something in the recent invitation-status flow now leaves it at `partially_completed`, which is what surfaced this regression.

## Fix (frontend only, minimal)

Loosen the visibility gate to key off the assessment being done, not the invitation status:

- In `src/pages/coach/CoachClients.tsx`, change the button condition from
  `c.invitation_status === "completed" && c.assessment_status === "completed"`
  to
  `c.assessment_status === "completed"`.

Everything else stays as-is:
- The button still auto-shows "Debrief Done" and disables when `debrief_completed=true` (which is what happens when the coach used "release results immediately").
- No changes to the ordering modal, the `results_released` toggle, or the DB update on click.

## Out of scope (flagging, not fixing here)

The stuck `invitation_status='partially_completed'` on completed assessments is a backend/data issue in the invitation state machine. Worth a follow-up to have the assessment-completion path also bump `coach_clients.invitation_status` to `completed`, but that's a separate backend change and not required to unblock the coach.
