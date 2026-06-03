# Operations Phase 2 — Time logging + rollups

Additive only. No existing query, type, or component behavior is altered. All work uses `opsSupabase` (operations schema) and follows the `TaskFormDialog.tsx` patterns (sonner toasts, `useQueryClient.invalidateQueries`, `useEffect` reset on open, error state).

## 1. `src/integrations/supabase/operations-types.ts`

Surgical edits to two regions, nothing else touched.

- **time_entries.Insert (lines 1642–1663)**: change `org_id: string` → `org_id?: string` and `user_id: string` → `user_id?: string`. `Row` (1620–1641) and `Update` (1664–1685) untouched. DB defaults populate these.
- **Views block (line 1731)**: add a new view entry `project_time_rollup` with the exact Row shape from the request (org_id, customer_id, customer_name, project_id, project_name, entry_count, total_hours, billable_hours, nonbillable_hours, invoiced_hours, uninvoiced_hours, unbilled_billable_hours — all nullable) and `Relationships: []`. Inserted alongside existing views; existing views (`ar_aging_detail`, `ar_aging_summary`, `customer_balance_summary`, …) unchanged.

## 2. `src/pages/operations/LogTimeDialog.tsx` (new)

Mirrors `TaskFormDialog.tsx` structure: same imports for Dialog/Button/Input/Label/Textarea/Checkbox, plus `Select` family from `@/components/ui/select`, `useQuery` + `useQueryClient` from TanStack, `toast` from sonner, `opsSupabase`.

Props: `{ open, onOpenChange, projectId }`.

State (controlled, reset on `open`):
- `date` (default `new Date().toISOString().slice(0,10)`)
- `taskId` (string, "" = No task)
- `memberId` (string)
- `hours` (string)
- `is_billable` (boolean, default true)
- `description` (string)
- `submitting`, `error`

Queries (enabled when `open`):
- `["ops","project-tasks-select", projectId]` → `project_tasks` select `id, name` filtered by `project_id`, ordered by `sort_order`.
- `["ops","ops-users"]` → `users` select `id, full_name, email` where `status = "active"`, ordered by `full_name`.

Default member resolution effect: when dialog opens and `memberId` empty, call `opsSupabase.auth.getUser()`; if the returned `user.id` exists in the members list use it, otherwise use the first member id.

Validation: `hours` parsed as Number, must be finite and > 0; `memberId` and `date` required. On failure: set `error`, no insert.

Submit:
```
await opsSupabase.from("time_entries").insert({
  project_id: projectId,
  project_task_id: taskId || null,
  user_id: memberId,
  date,
  hours: Number(hours),
  is_billable,
  description: description.trim() || null,
});
```
No `org_id`, no `created_by`. On success: `toast.success("Time logged")`, close dialog, then invalidate the three keys exactly as specified (`["ops","project-time", projectId]`, `["ops","project-time-rollup", projectId]`, `["ops","customer-time-rollup"]`). On error: `toast.error(err?.message ?? "Failed to log time")` in the `catch`; `finally` clears `submitting`.

UI layout (matches TaskFormDialog spacing): Title "Log time", grid for Date/Hours, full-width Select for Task ("No task" first option → ""), full-width Select for Team member, Billable checkbox row, Description textarea, DialogFooter Cancel/Submit.

## 3. `src/pages/operations/OperationsProjectDetail.tsx` — additive

No edits to existing imports/queries/JSX beyond additions:
- Import `LogTimeDialog`, `useState` already imported.
- Add `const [logTimeOpen, setLogTimeOpen] = useState(false)`.
- Add two queries alongside existing ones:
  - `["ops","project-time-rollup", id]` → `project_time_rollup` select `total_hours, billable_hours, unbilled_billable_hours` `.eq("project_id", id).maybeSingle()`.
  - `["ops","project-time", id]` → `time_entries` select `id, date, hours, is_billable, is_invoiced, description, project_tasks(name), users!time_entries_user_id_fkey(full_name, email)` `.eq("project_id", id).order("date", { ascending: false })`.
- New "Time" Card inserted **after** the Tasks Card and **before** the existing `ProjectFormDialog`/`TaskFormDialog` renders. Header has title "Time" with right-aligned "Log time" Button (`disabled={!p}`, sets `logTimeOpen`).
- Card body: summary line `Total {…||0} h · Billable {…||0} h · Unbilled {…||0} h`. Then `Table` with columns Date, Task, Member, Hours (right), Billable, Status (Invoiced/Unbilled). Loading and empty ("No time logged yet.") states match the Tasks card style.
- Render `<LogTimeDialog open={logTimeOpen} onOpenChange={setLogTimeOpen} projectId={id} />` next to existing `TaskFormDialog`.

## 4. `src/pages/operations/OperationsCustomerDetail.tsx` — additive

- Add query `["ops","customer-time-rollup", id]` → `project_time_rollup` select `total_hours, billable_hours, unbilled_billable_hours` `.eq("customer_id", id)` (returns array of rows, one per project).
- Insert a new compact "Time" Card **after the Projects Card and before the Invoices Card**. No button.
- Sum each field across rows in a small helper (treating nulls as 0); display three figures: Total, Billable, Unbilled (each suffixed with " h"). Loading shows "Loading…"; zero-row case shows zeros.

## Untouched (verified)
- Existing time/queries: none exist yet, so nothing to regress.
- Tasks card, Project/Task dialogs, Customer invoices/projects tables, all `ops_*` RPC flows in the invoice detail page — none modified.
- `time_entries.Row` and `.Update` typings, all existing view typings, and every other table block in `operations-types.ts` remain byte-identical.

## Type-check expectations
- The Insert relaxation makes `org_id`/`user_id` optional, matching the request; existing code does not insert into `time_entries` anywhere yet, so no callers break.
- The new view typing only adds a key under `Views`, additive to `OperationsDatabase`.

Awaiting approval to build.
