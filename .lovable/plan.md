## Add "Week" timesheet card to Operations project detail

Single file edit: `src/pages/operations/OperationsProjectDetail.tsx`. Fully additive — no changes to Tasks/Time/Expenses/Charges/Team cards or their queries/handlers.

### Imports
- Add `ChevronLeft, ChevronRight` to existing lucide-react import.
- Add `Popover, PopoverTrigger, PopoverContent` from `@/components/ui/popover`.
- (DurationPicker already imported via LogTimeDialog path; add `import DurationPicker from "./DurationPicker"`.)

### Date helpers (top of file, module scope)
- `toISODate(d)` — local YYYY-MM-DD (not UTC).
- `startOfWeekMon(d)` — clone, snap to Monday 00:00 local.
- `fmtHM(dec)` — `H:MM` or `"·"` when zero.

### State (inside component)
- `weekStart` initialised to `startOfWeekMon(new Date())`.
- Derive `days` (7 Date objects Mon..Sun) and `daysISO`.

### Query (additive)
- `weekEntriesQ` keyed `["ops","project-week", id, daysISO[0], currentUid]`, enabled on both ids.
- Selects `id, date, hours, project_task_id, timer_running` filtered by project + user + date range.
- In-memory: drop `timer_running` rows; build `Map<"taskId|date", sumHours>`.

### Rows / totals
- `rows` = tasks from existing `tasksQ` + trailing `{ taskId: null, name: "Untasked" }`.
- Compute per-cell sum, row totals, column totals, grand total.

### addTime handler
- Insert minimal row `{ project_id, project_task_id, date, hours }` (user_id/org_id/is_billable DB-defaulted).
- On success: toast + invalidate `project-week`, `project-time`, `project-time-rollup`, `customer-time-rollup`, `project-financials` keys.

### Inline `WeekCell` component (same file)
- Popover with full-width ghost Button trigger showing `display`.
- PopoverContent (`w-56`): DurationPicker + Save button (disabled when hours ≤ 0 or saving).
- On save: await `onAdd(hours)`, reset hours, close popover.

### Card render (immediately after existing Time card)
- Header: prev-week (ChevronLeft), date range label, next-week (ChevronRight), "This week" ghost button.
- Body: Table with `Task` + 7 day columns (`Mon 3` style) + `Total`.
- One row per task + Untasked; 7 WeekCells per row; row total.
- Footer row with column totals + grand total.
- Loading message while `weekEntriesQ.isLoading`.

### Acceptance
- Week grid for current user shows hours per task/day as `H:MM` or `·`, with row/col/grand totals.
- Cell popover with DurationPicker appends a new `time_entries` row; existing Time card and rollups refresh.
- Prev/Next/This-week navigation refetches correctly.
- No existing cards modified; tsc clean.
