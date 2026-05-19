# Session 84 — Notification Read Surface (revised)

Frontend-only. All RPCs exist; no migrations, no edge function changes.

## Pre-flight (verified)

- `date-fns ^4.1.0` is in `package.json` → use `formatDistanceToNow`.
- `src/integrations/supabase/types.ts` already includes all 8 functions (`archive_notification`, `get_notification_preferences`, `get_unread_notification_count`, `get_user_notifications`, `mark_all_notifications_read`, `mark_notifications_read`, `notification_display`, `set_notification_preference`). No regeneration needed.
- Args are strongly typed; Returns are `Json` for most. I will define narrow local response interfaces (in a new `src/types/notifications.ts`) matching the documented RPC shapes and cast each call's `data` to that interface (no `as any` — typed cast through `unknown` only where needed). Args always typed.

## 1. Notification bell (header)

**New:** `src/components/notifications/NotificationBell.tsx`
- Lucide `Bell`, white.
- React Query: `get_unread_notification_count`, `refetchInterval: 60_000`. No realtime.
- Badge over bell; shows count when > 0, capped "9+".
- Wraps shadcn `Popover` trigger; popover content is `NotificationDropdown`.

**Edit:** `src/components/AppLayout.tsx` — push bell to right of header (`ml-auto` on bell wrapper); brand lockup unchanged. Bell scoped to AppLayout (authenticated chrome only).

## 2. Notification dropdown

**New:** `src/components/notifications/NotificationDropdown.tsx` — shadcn `Popover`.

- On open: `get_user_notifications(10, null, 'all')` via React Query.
- Snapshot unread ids from first payload into a ref so accent persists after mark-read.
- If unreadIds.length > 0, single `mark_notifications_read(unreadIds)` call → invalidate unread-count query (list query left cached so accent stays from snapshot).
- Row: title (bold), body (muted, 2-line clamp), relative timestamp via `formatDistanceToNow(new Date(created_at), { addSuffix: true })`. Unread = primary-tinted dot + subtle bg.
- Row click: if `action_url`, `new URL(action_url)` → `navigate(parsed.pathname + parsed.search + parsed.hash)`. If null, non-clickable.
- Footer: "View all" → `/notifications`; "Mark all read" → `mark_all_notifications_read()` → invalidate list + count.
- Empty state: Bell icon + "You're all caught up".

## 3. Notifications page

**New:** `src/pages/Notifications.tsx`, route `/notifications`.
**Edit:** `src/App.tsx` — add route inside the `AppLayout` `ProtectedRoute` block alongside `/my-results`.

- shadcn `Tabs`: all / unread / archived → drives `p_filter`.
- Keyset pagination: "Load more" passes `p_before = lastItem.created_at`, `p_limit = 20`. Page arrays accumulated in local state; resets on filter switch.
- Row: title, body, relative time; whole row links to `action_url` path portion when present; trailing `Archive` icon-button → `archive_notification(id)` → invalidate list + count (`e.stopPropagation()` on click).
- Top-right "Mark all read" button.
- Per-filter empty states: "No notifications" / "Nothing unread" / "Nothing archived".
- Loading: 5 `Skeleton` rows for first page. Error: inline Card with Retry.

## 4. Notification preferences page

**New:** `src/pages/NotificationSettings.tsx`, route `/settings/notifications`.
**Edit:** `src/App.tsx` — add route alongside `/settings/privacy` inside AppLayout block.
**Edit:** `src/components/AppSidebar.tsx`
- Add `Bell` to existing lucide-react import.
- Insert `{ title: 'Notifications', url: '/settings/notifications', icon: Bell }` as the SECOND item in BOTH `settingsSubItems` (line 167) and `coachSettingsSubItems` (line 174), immediately after General Settings.

Page (**revised** — single Card with category sub-headings):
- Fetch `get_notification_preferences()`.
- One outer `Card` wrapping all preferences. Inside `CardContent`: group rows by `category`; render each category as a small uppercase muted heading + horizontal divider, followed by its rows. All categories live inside the same Card.
- Row: description (left) + channel `Select` (right) with 4 options — Both (`both`), Email only (`email`), In-app only (`in_app`), Off (`none`). Value = `effective_channel`.
- If `user_configurable === false`: Select `disabled`, value pinned to `default_channel`, small muted label "Always on".
- **Per-row optimistic with isolated revert:** keep current channels in a React Query cache (`['notif','prefs']`). On change for row X:
  1. Capture `previousChannel = current[X]`.
  2. Optimistically set `current[X] = newChannel` via `queryClient.setQueryData` updater that only mutates that one row.
  3. Call `set_notification_preference(type, channel)`.
  4. On success: success toast (sonner). Do NOT blanket-invalidate; the optimistic value is already the truth, and any other in-flight row change has its own independent optimistic write.
  5. On error: revert only that row via another `setQueryData` updater that restores `previousChannel` for row X (leaving every other row alone, including any sibling in-flight change). Error toast.
- Loading: skeleton rows. Error (initial fetch): inline retry card.

## 5. Remove fake notifications from Settings

**Edit:** `src/pages/Settings.tsx`:
- Delete `notificationKeys` (lines ~284–289), `Notifications` interface + `defaultNotifications` (lines ~302–313), `notifications` state (line ~328).
- Remove `notifications` from `.select(...)` (line ~340) and the `setNotifications(...)` call (line ~353).
- Delete `toggleNotification` (lines ~386–391).
- Delete the `{/* Notifications */}` Card block (lines ~516–537).
- Replace with a small Card: `Bell` icon + title "Notifications" + line "Manage which notifications you receive and how." + Button "Manage notifications" → `navigate('/settings/notifications')`.
- No other Settings changes.

## Files touched

Created: `src/components/notifications/NotificationBell.tsx`, `src/components/notifications/NotificationDropdown.tsx`, `src/pages/Notifications.tsx`, `src/pages/NotificationSettings.tsx`, `src/types/notifications.ts`.
Edited: `src/components/AppLayout.tsx`, `src/App.tsx`, `src/components/AppSidebar.tsx`, `src/pages/Settings.tsx`.
