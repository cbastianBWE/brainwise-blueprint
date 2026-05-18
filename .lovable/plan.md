## Scope

Frontend-only edits to `src/pages/super-admin/LearningAdmin.tsx` — specifically the `AssignUnassignTab` component. No backend, RPC, migration, or other file changes.

## Fix 1 — Mentor assign: per-trainee certification resolution

Replace the current "pass `p_certification_id: null` to `assign_mentor_bulk`" path with per-trainee resolution via `get_mentorable_certifications` + a single call to `assign_mentor_pairs_bulk`.

**New types (local to the file):**
```ts
interface MentorableCert { certification_id: string; certification_type: string; status: string; }
interface MentorResolution {
  trainee_user_id: string;
  loading: boolean;
  certifications: MentorableCert[];
  selectedCertId: string | null;   // auto-set when exactly 1; admin-picked when >1
  error: string | null;
}
```

**New state in `AssignUnassignTab`:**
- `mentorResolutions: Record<string, MentorResolution>` keyed by `trainee_user_id`.

**Resolution effect** (runs when `op === "assign" && type === "mentor"` and `mentorId` + `traineeIds` change):
- For each `traineeId` not already resolved for the current `mentorId`, call `supabase.rpc("get_mentorable_certifications" as never, { p_mentor_user_id: mentorId, p_trainee_user_id: traineeId } as never)`.
- Store the returned `certifications`. If `length === 1`, auto-set `selectedCertId` to that cert. If `0`, leave `selectedCertId = null` and flag as skipped. If `>1`, leave `selectedCertId = null` pending admin pick.
- When `mentorId` changes, clear all resolutions and re-run. When a trainee is deselected, drop its entry.
- Show a per-trainee loading state via `loading: true` while pending.

**UI (rendered below the mentor `Select` when `type === "mentor"` and `traineeIds.length > 0`):**
A `<div className="space-y-2 rounded-md border p-3">` titled "Per-trainee certification":
- For each selected trainee, one row showing trainee name/email and:
  - Loading: muted "Resolving…".
  - 1 cert: muted text `"{certification_type} ({status})"` — auto-resolved, no input.
  - >1 certs: a small `Select` (options labeled `${certification_type} (${status})`) bound to `selectedCertId`.
  - 0 certs: destructive-tinted muted text "No certification this mentor is qualified for — this trainee will be skipped".

**Submit button gating:** enable Confirm when at least one trainee in `mentorResolutions` has a non-null `selectedCertId` (in addition to existing reason/mentor checks). Trainees with `selectedCertId === null` are excluded.

**`handleAssign` mentor branch rewrite** (replaces the `assign_mentor_bulk` block):
- Build `pairs = traineeIds.map(...).filter(r => r.selectedCertId).map(r => ({ trainee_user_id: r.trainee_user_id, certification_id: r.selectedCertId }))`.
- If `pairs.length === 0`: destructive toast "No trainees with a resolvable certification" and return.
- Call:
  ```ts
  supabase.rpc("assign_mentor_pairs_bulk" as never, {
    p_mentor_user_id: mentorId,
    p_pairs: pairs,
    p_reason: reason,
  } as never)
  ```
- On success: `setAssignResult(data as BulkResult)`, `invalidate()`, clear `mentorResolutions` and `traineeIds`.

The scheduled-mentor path (`scheduleLater && type === "mentor"`) and its `create_scheduled_assignment` call are untouched.

## Fix 2 — Due date cannot be in the past

- The due-date `<Input type="date">` (currently around line 1307) gets `min={todayStr}` (the existing `todayStr` constant computed at line 634).
- In `handleAssign`, after existing validations and before the RPC call (immediate path only, after the `scheduleLater` early-return), add:
  ```ts
  if (dueDate && dueDate < todayStr) {
    toast({ title: "Due date cannot be in the past", variant: "destructive" });
    return;
  }
  ```

## Verification

- `bun run build` clean.
- Mentor + single trainee with 1 qualifying cert: cert auto-resolves; Confirm → ResultPanel shows 1 succeeded.
- Mentor + trainee with >1 cert: per-trainee `Select` appears; pick one → Confirm succeeds.
- Mentor + multi-trainee, one unqualified: that trainee shows "will be skipped"; others assign; pairs array excludes the skipped one.
- Due-date input rejects past dates in the picker; manual past entry triggers the destructive toast and does not submit.
- Existing cert_path / curriculum / module / unassign / scheduled / import flows unchanged.
