## Goal
Rebuild `src/pages/super-admin/LearningAdmin.tsx` as a two-tab page (Trainees + Assign/Unassign), extract the existing `ResultPanel` into its own component, and reuse v1's assign/unassign logic intact within the second tab. No route, sidebar, backend, or RPC changes.

## Files

**Create**
- `src/components/learning-admin/ResultPanel.tsx` — exact extraction of v1's `ResultPanel` + `BulkResult` type.

**Rewrite**
- `src/pages/super-admin/LearningAdmin.tsx` — new shell with `Tabs` ("Trainees" / "Assign / Unassign"), split into two child components defined in the same file (or co-located) for clarity.

**Untouched**: `App.tsx`, `AppSidebar.tsx`, `TraineeMultiSelect.tsx`, all backend.

## Tab 1 — Trainees

Mirrors `src/pages/super-admin/Users.tsx`:
- Debounced (250ms) search `Input`, page state, `PAGE_SIZE = 25`.
- `useQuery(["learning-admin-users", debouncedQuery, page])` → `supabase.rpc("search_impersonation_targets", { p_query: debouncedQuery.length >= 2 ? debouncedQuery : null, p_limit: 25, p_offset: page*25 })`.
- Skeleton loading rows, empty state, pagination footer using `total_count` from row[0] — identical UX to Users.tsx.
- Columns: Name · Email · Account Type (Badge via `accountTypeBadgeVariant`) · Organization · Actions.
- Actions: `DropdownMenu` with three items: "Assign certification path", "Assign curriculum", "Assign module". Each `onSelect` opens a single shared `Dialog` with `mode` = type + `targetUser` = the row.

### Single-user assign dialog
- Loads target options on demand: cert paths via `from("certification_paths").select("id,name").is("archived_at",null)`, curricula via `from("curricula")...`, modules via `from("modules")...` — each gated by `enabled: open && mode === X`.
- Pre-shows the trainee name read-only.
- `Select` for the target item + `Textarea` justification (min 10).
- Confirm → matching bulk RPC with `p_user_ids: [targetUser.user_id]` and the v1 payload shape.
- ResultPanel renders inline; invalidate `["list_all_learning_assignments"]`, `["get_user_learning_state"]`, `["list_mentor_trainees"]` on success.

## Tab 2 — Assign / Unassign

Full v1 logic, restructured as inline page sections rather than a dialog-triggered flow:
- Top: an operation toggle (`Tabs` or two `Button` toggle) → `"assign" | "unassign"`.
- Type `Select`: Certification Path / Curriculum / Module / Mentor.

### Assign panel (inline, not a dialog)
- Target picker (cert path / curriculum / module from their tables; mentor uses `list_mentor_trainees` Select).
- `TraineeMultiSelect`.
- Justification `Textarea` (min 10).
- Confirm button → same RPCs and payloads as v1 (`enroll_users_in_certification_path_bulk`, `assign_curriculum_bulk`, `assign_module_bulk`, `assign_mentor_bulk`).
- `ResultPanel` below.

### Unassign panel
- Cert Path: shows "Certification revocation is handled individually." note.
- Else: cross-trainee table from `rpc("list_all_learning_assignments")`, filtered by selected type, with search `Input`, header + per-row `Checkbox`, justification `Textarea`, Unassign button → `unassign_curriculum_bulk` / `unassign_module_bulk` / `unassign_mentor_bulk` (mentor passes `p_end_reason: "removed_by_admin"`).
- `ResultPanel` below.

### Common
- All successful assign/unassign in either tab invalidate the three query keys above.
- Errors: `ResultPanel` shows RPC validation failures (the RPC returns failures in-band); transport errors → destructive toast.
- Copy: "trainee" / "learner".

## Out of scope (Prompt C2)
Schedule-for-later, bulk import. Page leaves natural seams (the assign panel is a discrete section that can later sprout a "Schedule" toggle) but does not implement them.

## Verification
1. Build compiles cleanly; route loads with two tabs.
2. Trainees tab: list + search + pagination behaves identically to Users.tsx.
3. Trainees row menu → Assign curriculum to that single user → ResultPanel shows real `succeeded/failed`.
4. Assign tab with 2+ trainees: result panel shows accurate counts; already-assigned trainees appear as per-row failures.
5. Unassign tab: rows disappear after a successful call and stop appearing in the Mentor Portal progress tree.
6. Justification < 10 chars: ResultPanel surfaces the RPC's validation error (no crash).
