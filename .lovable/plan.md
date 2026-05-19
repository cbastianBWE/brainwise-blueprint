## Bug fix: notification RPC wrapper unwrapping

Three RPCs return wrapper objects, but the code casts them to arrays. Fix in 4 files.

### 1. `src/types/notifications.ts`
Add two wrapper types alongside existing ones:
```ts
export interface GetUserNotificationsResult {
  items: NotificationRow[];
  unread_count: number;
  limit: number;
  filter: string;
}
export interface GetNotificationPreferencesResult {
  preferences: NotificationPreferenceRow[];
}
```

### 2. `src/components/notifications/NotificationDropdown.tsx`
In the `queryFn` for `["notif","dropdown"]`, replace the cast:
```ts
const result = (data ?? {}) as unknown as GetUserNotificationsResult;
return result.items ?? [];
```
Import `GetUserNotificationsResult`. No other changes — downstream consumers already treat `data` as `NotificationRow[]`.

### 3. `src/pages/Notifications.tsx`
In `fetchPage`, replace:
```ts
const rows = (data ?? {}) as unknown as GetUserNotificationsResult;
const items = rows.items ?? [];
setItems((prev) => (replace ? items : [...prev, ...items]));
setReachedEnd(items.length < PAGE_SIZE);
```
Import `GetUserNotificationsResult`. The end-check now runs on the array, not the wrapper.

### 4. `src/pages/NotificationSettings.tsx`
In the prefs `queryFn`:
```ts
const result = (data ?? {}) as unknown as GetNotificationPreferencesResult;
return result.preferences ?? [];
```
Import `GetNotificationPreferencesResult`. The `grouped` memo is unchanged.

### Out of scope
- `get_unread_notification_count` already returns a bare number — leave `NotificationBell.tsx` alone.
- No backend changes, no behavior changes beyond unwrapping.

### Verification
- Bell click → dropdown opens with rows, no navigation away.
- `/notifications` page lists notifications across filters; "Load more" stops correctly.
- `/settings/notifications` shows all 16 types grouped by category.
