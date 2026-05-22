# Phase 11.D.2 — Wire MemberDrawer Assignments tab

Cycle 1 left the Assignments tab as 4 placeholder cards with disabled buttons. Cycle 2a wired other tabs but skipped this one. 11.D.2 makes all 4 cards live by reusing the cycle 2b bulk RPCs with single-element arrays, sharing the cycle 2a `JustifiedActionDialog` primitive.

## Files touched — exactly 2

**Modified**
- `src/components/members/MemberDrawer.tsx` — single line change at the `activeTab === "assignments"` branch to pass `userId`, `fullName`, and `setHasUnsavedChanges` into the child.

**Rewritten**
- `src/components/members/MemberDrawerAssignments.tsx` — replace the 43-line stub with a working component (~380 lines, may grow toward 600). Keeps the same 4 cards in the same 2-column grid, same titles/order: Cert path / Curriculum / Module / Mentor. Each Assign button now opens an inline `*Launcher` sub-component built on `JustifiedActionDialog`.

No new files. No backend work. No changes to bulk modals, MembersBulkActionsBar, Members.tsx, JustifiedActionDialog, or sibling drawer tabs.

## Launcher pattern

Each launcher is an inline sub-component that wraps `JustifiedActionDialog`, passing target-picker + due-date UI through the `description` slot. The dialog's built-in reason Textarea + ≥10-char gate remains. Target requirement enforced inside `onSubmit` by throwing typed errors translated via `mapError`.

**Three near-identical launchers (Cert path / Curriculum / Module):**
- Query the corresponding published, non-archived table via React Query (enabled only when open)
- `<Select>` for target + `<Input type="date">` for optional due date
- Convert due date to ISO with `T00:00:00Z` suffix, or null
- Call the matching `*_bulk` RPC with `p_user_ids: [userId]`
- Curriculum: `p_source: "direct_assignment"`, `p_certification_id: null`, `p_source_reference_id: null`
- Module: `p_source: "direct_assignment"`, `p_source_reference_id: null`
- Invalidate `["members-search"]`, `["get_user_learning_state", userId]`, `["list_all_learning_assignments"]`

**Mentor launcher:**
- Mentor list via `search_impersonation_targets` with all 15 named params (`p_is_mentor: true`, `p_specific_user_id: null`, etc.) — matches BulkAssignMentorModal exactly
- Cert resolution via `get_mentorable_certifications(p_mentor_user_id, p_trainee_user_id: userId)`
- Render states: loading spinner / red error / red blocking "no qualifying cert" / readonly text (1 cert, auto-selected) / dropdown (2+ certs)
- RPC: `assign_mentor_pairs_bulk` with `p_pairs: [{trainee_user_id: userId, certification_id}]`
- Invalidate `["members-search"]`, `["list_mentor_trainees"]`

**Partial-failure handling:** all `onSubmit` throw on `result.failed > 0`, surfacing the first failure's `detail`/`status`. Returns `{changed: true}` on any success.

**State reset:** each launcher has `useEffect(() => { if (!open) reset(); }, [open])`. Dialog resets its own reason/submitting/error internally.

**Unsaved-changes propagation:** single `useEffect` in main component ORs all 4 modal-open flags into `setHasUnsavedChanges`, hooking into cycle 1's discard-confirm framework.

## Technical details

**MemberDrawer.tsx edit (around line 142):**
```tsx
{activeTab === "assignments" && (
  <MemberDrawerAssignments
    userId={member.user_id}
    fullName={member.full_name}
    setHasUnsavedChanges={setHasUnsavedChanges}
  />
)}
```

**Imports for MemberDrawerAssignments.tsx:** `useEffect`/`useState`, `useQuery`/`useQueryClient`, `supabase`, `Button`, `Card*`, `Input`, `Label`, `Select*`, `Loader2`, `JustifiedActionDialog` + `JustifiedActionResult`. Remove Tooltip imports (no longer used).

**mapError translations:** `target_required` → "Select a … to continue."; `mentor_required` → "Select a mentor to continue."; `certification_required` → "A qualifying certification must be set." Defaults to the existing dialog error handler chain.

**Brand-token migration of new amber/destructive callsites is 11.E scope** — use `text-amber-600` / `text-destructive` / `text-muted-foreground` consistent with cycle 2b modals.

## Guardrails

- Do not modify `JustifiedActionDialog.tsx`, any `src/components/members/bulk/*`, `MembersBulkActionsBar.tsx`, `Members.tsx`, or sibling drawer tabs
- Do not touch backend RPCs or apply migrations
- All 4 launchers MUST pass `p_user_ids: [userId]` (single-element array) — mentor uses single-element `p_pairs`
- Keep the card grid layout, titles, descriptions, and order unchanged
- All 4 `*Launcher` sub-components live inline in `MemberDrawerAssignments.tsx`

## Verification (post-build)

- `rg "MemberDrawerAssignments />" src/components/members/MemberDrawer.tsx` returns no match (3-prop version in place)
- `rg "Tooltip" src/components/members/MemberDrawerAssignments.tsx` returns no match
- `rg "p_user_ids: \[userId\]" src/components/members/MemberDrawerAssignments.tsx` shows 3 matches
- `rg "p_pairs:" src/components/members/MemberDrawerAssignments.tsx` shows 1 match
- `git status` shows exactly 2 modified files
