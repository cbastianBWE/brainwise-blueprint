# Live timer on Operations project Time card

Single-file edit: `src/pages/operations/OperationsProjectDetail.tsx`. Reuse existing `LogTimeDialog` for the post-stop details step. No new files, no migrations, no changes to Tasks/Expenses/Charges/Team or to existing Log time / edit / delete flows.

## Changes to `OperationsProjectDetail.tsx`

1. **Imports**: add `Play`, `Square`, `X` to the existing `lucide-react` import. Add `useEffect` to the `react` import.

2. **Current user state**: add `const [currentUid, setCurrentUid] = useState<string | null>(null);` and a `useEffect([])` that calls `opsSupabase.auth.getUser()` and stores the user id.

3. **timeEntriesQ**: append `, timer_running, timer_started_at` to the existing select list. No other changes to the query.

4. **Derived values** (after timeEntriesQ):
   - `visibleTimeEntries` = entries where `!timer_running`
   - `runningEntry` = entry where `timer_running && user_id === currentUid` (or null)
   
   Time table renders `visibleTimeEntries`; empty-state checks `visibleTimeEntries.length === 0`. Running timer never shows as a 0-hour row.

5. **Handlers**:
   - `startTimer`: `supabase.rpc("ops_start_timer" as any, { p_project: id, p_project_task: null, p_description: null })` → toast + invalidate `["ops","project-time", id]`.
   - `stopTimer`: `supabase.rpc("ops_stop_timer" as any, { p_id: runningEntry.id })`, on success invalidate project-time, project-time-rollup, customer-time-rollup, project-financials; toast `Logged {h} h — add details`; set `editingTime` from runningEntry with `hours: Number(data)`; open existing `LogTimeDialog` in edit mode.
   - `discardTimer`: `opsSupabase.from("time_entries").delete().eq("id", runningEntry.id)` → invalidate project-time + toast.

6. **Time CardHeader**: keep existing "Log time" button; left of it add:
   - If `runningEntry`: pulsing dot + `<RunningTimerLabel startedAt={runningEntry.timer_started_at} />` + Stop button (outline, sm, Square icon) + Discard button (ghost, sm, X icon).
   - Else: "Start timer" button (outline, sm, Play icon), disabled when `!p`.

7. **Inline `RunningTimerLabel` component** in the same file: useState/useEffect 1s interval, renders `HH:MM:SS` from `Date.now() - new Date(startedAt).getTime()`, `font-mono tabular-nums text-sm`.

## Acceptance
- Start creates a running entry (hours 0); header shows live ticker + Stop + Discard; entry not in table.
- Stop persists elapsed hours server-side, opens LogTimeDialog prefilled; dismissing leaves entry saved.
- Discard deletes the running entry.
- Only one timer at a time (server-enforced). All other card behavior unchanged. tsc clean.
