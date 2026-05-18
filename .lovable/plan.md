# Learning Admin (Prompt 3 of 3)

Build the super-admin management surface for assigning and unassigning learning. All backend RPCs already exist — no migrations.

## Files

**New**
- `src/pages/super-admin/LearningAdmin.tsx`
- `src/components/learning-admin/TraineeMultiSelect.tsx`

**Edited**
- `src/App.tsx` — add route
- `src/components/AppSidebar.tsx` — add nav entry

## Routing

In `src/App.tsx`, import `LearningAdmin`. After the `/super-admin/content-authoring` route, add:

```tsx
<Route path="/super-admin/learning-admin" element={
  <RoleGuard allowedRoles={["brainwise_super_admin"]}>
    <SuperAdminSessionProvider><LearningAdmin /></SuperAdminSessionProvider>
  </RoleGuard>
} />
```

## Sidebar

In `superAdminNav`, immediately after "Content Authoring":

```ts
{ title: "Learning Admin", url: "/super-admin/learning-admin", icon: GraduationCap }
```

`GraduationCap` already imported.

## TraineeMultiSelect component

Props: `{ selectedIds: string[]; onChange: (ids: string[]) => void }`.
- `useQuery(["list_mentor_trainees"], () => supabase.rpc("list_mentor_trainees"))` → trainees array.
- Search `Input` filters by name/email (case-insensitive).
- Scrollable list of `Checkbox` rows (name + email).
- Selected ids render above as removable `Badge` chips with × button.
- Loading skeleton + empty state.

## LearningAdmin page

`AppLayout`-wrapped page. One `Card` containing `Tabs` with a single tab "Assignments" (extensible).

Inside the tab:
- Top: `Select` for assignment type — Certification Path · Curriculum · Module · Mentor.
- Section 1: **Assign** — primary button opens a `Dialog`.
- Section 2: **Unassign** — searchable `Table` of existing assignments matching the selected type.

### Assign dialogs (one per type)

Each dialog contains:
- `<TraineeMultiSelect />`
- Target picker (`Select`) — content varies by type
- Justification `Textarea` (required; client check ≥10 chars to match RPC)
- Confirm button (loading state, disabled while in flight)

Target sources and RPC calls:

| Type | Target source | RPC |
|------|---------------|-----|
| Cert Path | `supabase.from("certification_paths").select("id,name").is("archived_at",null)` | `enroll_users_in_certification_path_bulk({ p_user_ids, p_certification_path_id, p_reason, p_due_at: null })` |
| Curriculum | `from("curricula").select("id,name").is("archived_at",null)` | `assign_curriculum_bulk({ p_user_ids, p_curriculum_id, p_source: "direct_assignment", p_certification_id: null, p_source_reference_id: null, p_due_at: null, p_reason })` |
| Module | `from("modules").select("id,name").is("archived_at",null)` | `assign_module_bulk({ p_user_ids, p_module_id, p_source: "direct_assignment", p_source_reference_id: null, p_due_at: null, p_reason })` |
| Mentor | Mentor `Select` populated from same `list_mentor_trainees` user list | `assign_mentor_bulk({ p_trainee_user_ids, p_mentor_user_id, p_certification_id: null, p_reason })` |

### Unassign section

`useQuery(["list_all_learning_assignments"], () => supabase.rpc("list_all_learning_assignments"))` returns `{ curriculum_assignments, module_assignments, mentor_assignments }`.

Render a `Table` driven by the selected type:

- **Curriculum** rows: checkbox · trainee (name+email) · curriculum · source · status. → `unassign_curriculum_bulk({ p_assignment_ids, p_reason })`
- **Module** rows: checkbox · trainee · module · status. → `unassign_module_bulk({ p_assignment_ids, p_reason })`
- **Mentor** rows: checkbox · trainee · mentor. → `unassign_mentor_bulk({ p_assignment_ids, p_end_reason: "removed_by_admin", p_reason })`
- **Cert Path**: render note "Certification revocation is handled individually." No control.

Above the table: search `Input` filtering by trainee name/email and the curriculum/module/mentor name.
Below the table: justification `Textarea` (≥10 chars) + Unassign button (loading/disabled in flight).

### Result display

Every bulk RPC returns `{ operation, requested, succeeded, failed, results: [...] }`. After every call, render an inline result panel (not a generic toast):

- Headline: `"{succeeded} of {requested} succeeded, {failed} failed"`.
- If `failed > 0`, list each failing `results[]` row with its `status` and `detail` error.

Transport errors (the `error` from `supabase.rpc`) → destructive toast.

### Cache invalidation + cleanup

On successful assign/unassign:
- `queryClient.invalidateQueries({ queryKey: ["list_all_learning_assignments"] })`
- `queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] })` (broad)
- `queryClient.invalidateQueries({ queryKey: ["list_mentor_trainees"] })`
- Clear dialog selections / table row selections.

## Conventions

- `useQuery` / `useQueryClient` from `@tanstack/react-query`.
- `supabase` from `@/integrations/supabase/client`.
- All shadcn primitives from `@/components/ui/*` (Card, Tabs, Dialog, Select, Input, Textarea, Button, Badge, Checkbox, Table).
- RPC calls use `supabase.rpc("name" as never, {...} as never)` pattern from mentor panels.
- Copy uses "trainee"/"learner", never "coach".
- No localStorage/sessionStorage, no backend changes.
- Loading + empty states for every picker and the unassign table.

## Verification

1. Build compiles; no TS or console errors.
2. "Learning Admin" appears in super-admin sidebar; route loads.
3. Bulk enroll in cert path shows real succeeded/failed summary (already-enrolled = expected failure).
4. Bulk curriculum and mentor assigns show real summaries.
5. Cross-trainee curriculum unassign removes items and updates Mentor Portal progress trees after invalidation.
6. Unassign table search filters by trainee + target name.
7. Partial-failure batches list per-row failures; too-short justification surfaces RPC error inline, no crash.
