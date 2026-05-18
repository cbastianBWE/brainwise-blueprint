## Scope

Single-file extension of `src/pages/super-admin/LearningAdmin.tsx` — specifically the existing `AssignUnassignTab` component. No backend, no migrations, no edge functions. `xlsx` is already installed.

Untouched: `TraineesTab`, `SingleUserAssignDialog`, `ResultPanel`, `TraineeMultiSelect`, `App.tsx`, `AppSidebar.tsx`.

## 1. Due date + schedule-for-later (assign flow only)

In `AssignUnassignTab`, add state:
- `dueDate: string` (YYYY-MM-DD, optional)
- `scheduleLater: boolean`
- `scheduledFor: string` (required when `scheduleLater`)
- `mentorCertId: string | null` — already-needed for mentor scheduling; also surface a certification picker in the mentor assign panel (loaded from `certification_paths`) when `scheduleLater && type === "mentor"`. Required in that case.

Render below the justification textarea (only when `op === "assign"`):
- `<Input type="date" />` labeled "Due date (optional)" — hidden when `type === "mentor"` (no due date support).
- `<Checkbox />` "Schedule for a future date instead of assigning now."
- When checked: required `<Input type="date" />` "Scheduled date" with `min={today}`.
- When checked + mentor type: required certification `Select`.

`handleAssign` changes:
- Compute `dueAtIso = dueDate ? new Date(dueDate).toISOString() : null`.
- If `!scheduleLater`: keep existing branch structure, but pass `p_due_at: dueAtIso` for cert_path / curriculum / module. Mentor branch unchanged.
- If `scheduleLater`:
  - Validate scheduled date present and `>= today` client-side (server also rejects).
  - For mentor type, require `mentorCertId`.
  - Call `supabase.rpc("create_scheduled_assignment" as never, { p_assignment_type, p_target_id, p_user_ids, p_scheduled_for, p_reason, p_mentor_certification_id } as never)` where `p_assignment_type` ∈ `"cert_path" | "curriculum" | "module" | "mentor"`, `p_target_id` is `targetId` (or `mentorId` for mentor), `p_user_ids` is `traineeIds`, `p_scheduled_for` is the YYYY-MM-DD string, `p_mentor_certification_id` is `mentorCertId` for mentor else `null`.
  - On success: `toast({ title: "Assignment scheduled for " + scheduledFor })`, reset form, invalidate `["list_scheduled_assignments"]` + the existing three keys.
  - On error: surface `err.message` in destructive toast (covers past-date rejection).

## 2. Bulk Excel import section

New "Import from spreadsheet" card inside `AssignUnassignTab`, rendered above the existing assign/unassign panels and visible regardless of `op`. Local state for the parsed-result panel and a hidden `<input type="file">` ref.

**Download template button:**
- `import * as XLSX from "xlsx"` at top of file.
- Fetch reference via `useQuery(["learning_import_reference"], () => supabase.rpc("get_learning_import_reference" as never, {} as never))` — enabled lazily on first dropdown open or button click is fine; simplest: always enabled when tab mounts.
- On click: build a workbook with two sheets:
  - `Assignments`: header `["operation","type","target_name","user_email","reason"]` + one example row `["assign","curriculum","PTP VILT 1","someone@example.com","Example justification text"]`.
  - `Reference`: a labeled grid (parallel columns) listing `certification_paths[].name`, `curricula[].name`, `modules[].name`, `mentors[].email`. Build via `XLSX.utils.aoa_to_sheet` padding to equal length.
- `XLSX.writeFile(wb, "learning-admin-import-template.xlsx")`.

**File picker:**
- `<Input type="file" accept=".xlsx,.xls,.csv" />` → on change:
  - Read file as `ArrayBuffer`, `XLSX.read`, pick `wb.Sheets["Assignments"]` (fallback to first sheet), `XLSX.utils.sheet_to_json(sheet, { defval: "" })`.
  - Map each non-empty row to `{ row_number: index + 2, operation, type, target_name, user_email, reason }` trimmed.
  - `supabase.functions.invoke("learning-admin-import", { body: { rows } })`.
  - Store `{ total, succeeded, failed, rows }` in local state and render below picker: summary line + a list of `failed` rows (`Row {row_number}: {detail}`).
  - On transport error: destructive toast.
  - On success: invalidate `["list_all_learning_assignments"]`, `["get_user_learning_state"]`, `["list_mentor_trainees"]`, `["list_scheduled_assignments"]`.
- Reset the file input value so the same file can be reuploaded.

## 3. Scheduled assignments list section

New "Scheduled assignments" card inside `AssignUnassignTab`, always visible (below the import card or below the assign/unassign panels — place at the bottom of the tab).

- `useQuery(["list_scheduled_assignments"], () => supabase.rpc("list_scheduled_assignments" as never, {} as never))` returning `{ scheduled_assignments: ScheduledRow[] }`.
- `Table` columns: Scheduled date · Type · # users · Status · Scheduled by · Created · Actions.
- Status rendered via `Badge` with variant by status (`pending`→default, `processing`→secondary, `completed`→default (success-styled via className), `partial`→secondary, `failed`→destructive, `cancelled`→outline).
- For `partial` / `failed`, show `failure_summary` under the row (expandable detail cell or muted text below status).
- Actions: when `status === "pending"`, a "Cancel" button → `AlertDialog` confirm → `supabase.rpc("cancel_scheduled_assignment" as never, { p_id: row.id } as never)` → toast + invalidate `["list_scheduled_assignments"]`. Non-pending: empty cell.
- Loading skeleton row; empty state ("No scheduled assignments.").

## Types

Add light local types (no edit to `supabase/types.ts`):
```ts
type ScheduledStatus = "pending" | "processing" | "completed" | "partial" | "failed" | "cancelled";
interface ScheduledRow { id: string; assignment_type: string; user_count: number; scheduled_for: string; status: ScheduledStatus; reason: string | null; scheduled_by_name: string | null; created_at: string; processed_at: string | null; result: any; failure_summary: string | null; }
interface ImportResult { total: number; succeeded: number; failed: number; rows: { row_number: number; status: string; detail: string | null }[]; }
```

## Verification

- `bun run build` clean.
- Assign curriculum to a trainee with a due date → succeeds; due date visible on the trainee's progress tree.
- Schedule for tomorrow → success toast, row appears in Scheduled list as `pending`.
- Cancel that row → status flips to `cancelled`.
- Download template → xlsx with `Assignments` + `Reference` sheets containing real values.
- Upload template with one good row + one bad email → result shows 1/1 with the failure's `detail`; good row visible in Mentor Portal.
- Past scheduled date → RPC error surfaced in destructive toast, no crash.
