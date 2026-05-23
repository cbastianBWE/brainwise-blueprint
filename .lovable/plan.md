## Phase 10 Round 6 — Notification surfaces polish

Frontend-only a11y polish across 3 of the 4 notification UI files (Bell is already clean). No RPC, types, or backend changes. ~12 surgical edits.

### Files to edit

1. **src/components/notifications/NotificationDropdown.tsx**
   - Loading branch: wrap in `role="status"` + `aria-label="Loading notifications"`, add `aria-hidden="true"` to Loader2.
   - Notification rows (`data.map`): conditionally add `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space → `handleRowClick`) when `clickable`; add `focus:bg-accent` to the clickable className branch.
   - "Mark all read" header button: add `aria-label="Mark all notifications as read"`.
   - "View all" footer button: add `aria-label="View all notifications"`.

2. **src/pages/Notifications.tsx**
   - Page-level Skeleton loading: wrap Card in `<div role="status" aria-label="Loading notifications">`.
   - "Load more" button: add dynamic `aria-label` (loading vs idle), add `aria-hidden="true"` to inner Loader2.
   - Notification rows: conditional `role="button"`, `tabIndex={0}`, `onKeyDown` when `clickable`; add `focus:bg-accent`. Keep Archive button + `e.stopPropagation()` intact.

3. **src/pages/NotificationSettings.tsx**
   - Loading branch: wrap in `role="status"` + `aria-label="Loading preferences"`, `aria-hidden="true"` on Loader2.
   - H1: change `"Notifications"` → `"Notification preferences"`.

4. **src/components/notifications/NotificationBell.tsx** — NO CHANGES (verified clean).

### Guardrails

- Do NOT modify `src/integrations/supabase/types.ts` or `src/types/notifications.ts`.
- Preserve all `(data ?? {}) as unknown as <Result>` unwrap patterns verbatim.
- No new imports, no new files, no deletions.
- Keep all existing query keys, invalidations, retry buttons, optimistic-update patterns, `safeInternalPath`, `unreadSnapshot`, `emptyCopy`.

### Self-check after edits (across the 4 files)

- `as any` → 0 hits
- `as unknown as` → exactly 3 hits (Dropdown, Notifications page, Settings)
- `role="status"` → exactly 3 hits
- `tabIndex={clickable` → exactly 2 hits
- `aria-hidden="true"` → ≥ 4 hits (3 status Loader2 + 1 Load-more Loader2)
- Archive button `e.stopPropagation()` preserved on Notifications page rows
