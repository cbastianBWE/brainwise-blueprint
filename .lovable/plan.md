## Slice 5: My Time tabs + month calendar

Single-file additive edit to `src/pages/operations/OperationsMyTime.tsx`. Existing weekly grid behavior is preserved verbatim — it just moves inside the Entry tab.

### Imports to add
- `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
- `Dialog, DialogContent, DialogHeader, DialogTitle` from `@/components/ui/dialog`

### Module-scope helpers (local time)
- `startOfMonth(d)` → `new Date(d.getFullYear(), d.getMonth(), 1)`
- `addDaysLocal(d, n)` → clones and `setDate(getDate()+n)`

Reuses existing `toISODate`, `startOfWeekMon`, `fmtHM`.

### Component state (additive)
- `tab` (default `"entry"`)
- `monthCursor` (default `startOfMonth(new Date())`)
- `selectedDate: string | null`
- `calProjectId`, `calTaskId`, `calHours`, `calSaving`

### Month grid + query
- `monthGridStart = startOfWeekMon(startOfMonth(monthCursor))`
- 42-day array via `addDaysLocal`
- `monthEntriesQ` keyed `["ops","my-time","month", toISODate(monthGridStart), currentUid]`, selects `id, date, hours, project_id, project_task_id, timer_running, description` for the user across the 42-day range
- `useMemo` builds `Map<dateISO, { total, entries[] }>`, skipping `timer_running` rows
- Key sits under `["ops","my-time"]` prefix → existing `addTime` invalidations already refresh it; no new invalidations added

### Render structure
- Keep the existing `<h1>My Time</h1>`
- Wrap the rest in `<Tabs value={tab} onValueChange={setTab}>` with two triggers: Entry / Overview
- **Entry tab**: existing week Card + add-row block moved unchanged
- **Overview tab**: month calendar Card

### Calendar Card (Overview)
- Header: prev-month (`ChevronLeft` → `startOfMonth(addDaysLocal(startOfMonth(monthCursor), -1))`), month/year label, next-month (`ChevronRight` → `startOfMonth(addDaysLocal(startOfMonth(monthCursor), 32))`), ghost "This month" button
- 7-col CSS grid; weekday header row Mon..Sun
- 42 day cells: clickable buttons (`text-left`, `min-h-[80px]`, border, rounded, p-2)
  - Day number (small)
  - Dimmed (`text-muted-foreground opacity-50`) when not in `monthCursor` month
  - If `total > 0`: show `fmtHM(total)` and `(n)` count
  - `onClick` → `setSelectedDate(toISODate(day))`

### Day Dialog
- Open when `selectedDate != null`; onClose resets `selectedDate` and cal* form fields
- Title: selectedDate parsed as `selectedDate + "T00:00:00"`, formatted `{weekday, month, day, year}`
- Body:
  - Entry list from month map for that date: `projectName — taskName · fmtHM(Number(hours))` + muted description; "No entries." when empty
  - Add form: Project Select (resets `calTaskId` on change), Task Select scoped to `calProjectId` with "Untasked" option, `DurationPicker`, Add button
  - Add button calls existing `addTime(calProjectId, calTaskId || null, selectedDate!, calHours)` wrapped in `setCalSaving`; clears fields after
  - Disabled when `!calProjectId || Number(calHours) <= 0 || calSaving || !selectedDate`

### Notes
- `addTime` already validates `>0`, toasts, and invalidates `["ops","my-time"]` (covers the month query), `project-time`, `project-time-rollup`, `customer-time-rollup`, `project-financials` — reused as-is.
- Cross-project task mismatch prevented identically to the entry add-row (`calTaskId` resets on project change; task list filtered to `calProjectId`).
- No other files touched.

### Acceptance
- Entry / Overview tabs; Entry is the existing weekly grid unchanged.
- Overview month calendar with prev/next/this-month (local date math), totals + entry count on day cells, out-of-month cells dimmed.
- Day click opens dialog with entries + add form; insert refreshes calendar, week grid, and rollups.
- tsc clean.
