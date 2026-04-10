

# Plan: Sidebar Privacy Link + Coach Toggle Wiring + Coach Results Filtering

## What This Does

1. **Sidebar**: Adds "Privacy & Permissions" nav link under Settings for individual/corporate users
2. **My Coach toggle**: Reads/writes `share_results_with_coach` from the `users` table
3. **Coach results filtering**: When `share_results_with_coach` is false, only shows assessments linked via `coach_clients`; when true, shows all completed assessments

## Changes

### 1. `src/components/AppSidebar.tsx`
Add a new nav item to `individualNav` array after the Settings entry:
```ts
{ title: "Privacy & Permissions", url: "/settings/privacy", icon: Shield },
```
Import `Shield` from lucide-react (already imported in PrivacySettings but not in AppSidebar).

### 2. `src/pages/PrivacySettings.tsx`
Wire the "My Coach" toggle to `share_results_with_coach`:
- In the `load` function, also fetch `share_results_with_coach` from the users table (already fetching `organization_id`)
- Initialize the `coach` state's `enabled` from `share_results_with_coach`
- In `handleToggle`, when the key is `"coach"`, also update `users.share_results_with_coach` to match the new toggle state
- Keep existing permissions logic unchanged — just add the column write alongside it

### 3. `src/pages/MyResults.tsx`
Add coach-side filtering when `isCoachView` is true:
- Accept an additional prop: `coachUserId` (the logged-in coach's user ID)
- After fetching `assessment_results`, check the client's `share_results_with_coach` value (already fetching from `users` table for `clientName`)
- If `share_results_with_coach` is false:
  - Fetch `coach_clients` rows where `coach_user_id = coachUserId` and `client_user_id = targetUserId` and `assessment_id IS NOT NULL`
  - Filter the results to only include those whose `assessment_id` matches a `coach_clients.assessment_id`
- If `share_results_with_coach` is true: show all results (current behavior)

### 4. `src/pages/coach/ClientResults.tsx`
Pass the coach's user ID to `MyResults`:
- Import `useAuth` and pass `coachUserId={user?.id}` to `MyResults`

## Technical Notes
- The `users` table already has `share_results_with_coach` (boolean, default false)
- The existing RLS policy `users: update own safe fields` allows updating this column (it's not in the immutable fields list, and the `enforce_immutable_user_fields` trigger doesn't block it)
- No database migration needed
- The coach can already read client user rows via `users: coaches can read their clients` RLS policy

