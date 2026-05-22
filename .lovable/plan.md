
# Phase 11.C cycle 2b — Part 1

Create exactly 8 new files under `src/components/members/bulk/`. No existing files modified. Toolbar wiring deferred to Part 2.

## Files to create

1. **`types.ts`** — Shared types: `BulkAssignType`, `BulkResult`, `BulkChunkResult`, `ImportReference`, `ImportRowResult`, `ImportResult`, `MentorableCert`, `MentorResolution`, `ScheduledAssignment` (last four pre-defined for Part 2).

2. **`BulkProgress.tsx`** — Progress UI primitive (Progress bar + tallies + Cancel button). Status text honors cancelled state: `Cancelled. {N} of {M} processed.`

3. **`useBulkChunkRunner.ts`** — Generic chunking hook. `useRef` for cancel flag (sync read in loop). Each chunk in try/catch — one failure doesn't abort. Default chunkSize=50. Exposes `start/cancel/reset/isRunning/cancelled/processed/succeeded/failed/results`.

4. **`BulkAssignModal.tsx`** — Type picker (cert_path / curriculum / module). Target dropdown driven by direct table queries (published + non-archived). Optional due date. Reason ≥10 chars. Dispatches `enroll_users_in_certification_path_bulk` / `assign_curriculum_bulk` / `assign_module_bulk` (with `p_source: 'direct_assignment'` and the null FKs spec'd). Chunked at 50. Invalidates `members-search`, `list_all_learning_assignments`, `get_user_learning_state`.

5. **`BulkAssignMentorModal.tsx`** — Mentor picker via `search_impersonation_targets` (all 15 named params, `p_is_mentor: true`). Per-trainee resolution via `get_mentorable_certifications`: 0 certs = skipped (red), 1 = auto-selected readonly, 2+ = dropdown. Builds `pairs[]` only from resolved trainees. Single-shot `assign_mentor_pairs_bulk` (no chunking). Invalidates `members-search`, `list_mentor_trainees`.

6. **`BulkUnassignModal.tsx`** — Type picker (curriculum / module only). Pre-call resolver: `user_id → assignment_id` from `user_curriculum_assignments` / `user_module_assignments` where `status='active'`. Missing users surfaced as inline note. Chunked `unassign_curriculum_bulk` / `unassign_module_bulk` over assignment IDs (runner's `userIds` arg is treated as opaque IDs; code comment notes the misnomer).

7. **`BulkUnassignMentorModal.tsx`** — Mentor picker + two reason fields (`p_end_reason` visible to trainee, `p_reason` audit) each ≥10 chars. Resolver against `coach_mentor_assignments` where `ended_at IS NULL`. Chunked `unassign_mentor_bulk`. Invalidates `members-search`, `list_mentor_trainees`.

8. **`BulkOverrideCompletionModal.tsx`** — Tier picker (curriculum / module / content_item — NO cert_path). Direction radio (complete / incomplete, default complete). content_item query: `content_items` `is_archived=false` order by title limit 500. Chunked dispatch to the three `set_*_completion_bulk` RPCs. Invalidates `members-search`, `get_user_learning_state`.

## Cross-cutting rules

- All `.rpc()` calls use `as any` boundary casts (codebase pattern).
- Every modal blocks close while `runner.isRunning`; resets runner state on close.
- Outer-catch toasts only; per-row failures stay in inline result panel.
- Result panel after run shows failed rows only (succeeded omitted to reduce noise).
- All Tailwind colors stay as spec'd amber/emerald/purple — token migration is 11.D.

## Hard guardrails

- No existing file touched (verify `MembersBulkActionsBar`, `MemberDrawerAudit`, `Members.tsx`, `JustifiedActionDialog` byte-identical).
- No backend migrations, no RPC changes, no edge functions.
- No `JustifiedActionDialog` import from any bulk modal.
- No mentor option in `BulkUnassignModal` type picker.
- No cert_path option in `BulkOverrideCompletionModal` tier picker.
- Each new file under 400 lines.

## Verification

After build, self-grep against the checklist in the prompt. Report PASS/FAIL per item with one-line evidence. Stop on any FAIL.

Awaiting approval to switch to build mode.
