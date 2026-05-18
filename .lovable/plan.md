# Mentor Role — Frontend Wiring (Session 82, P1)

Backend (`users.is_mentor`, `set_mentor_role` RPC, `assign_mentor` gate) is already live. This is frontend-only — no migrations, no RPC definitions.

## Changes

### 1. `src/hooks/useUserProfile.tsx`
- Add `is_mentor: boolean;` to `UserProfile` interface.
- Add `is_mentor` to the `.select(...)` column string.

### 2. `src/lib/accountRoles.ts`
- Add `isMentor: boolean` to `AccountRoleInfo` with a doc comment: standalone capability independent of `account_type` and of trainee assignments.
- In the loading/no-account branch, default `isMentor: false`.
- In the returned object, derive `isMentor: profile?.is_mentor === true` (mirrors `isPractitionerCoach` exactly).

### 3. NEW `src/components/MentorGuard.tsx`
Copy `PractitionerCoachGuard` shape. Pull `isMentor`, `isSuperAdmin`, `loading` from `useAccountRole`. While loading → spinner. Allows when `isMentor || isSuperAdmin`; otherwise `<Navigate to="/dashboard" replace />`.

### 4. `src/App.tsx`
Swap the two `/mentor` routes from `PractitionerCoachGuard` to `MentorGuard`:
- `/mentor` → `<MentorGuard><MentorPortal /></MentorGuard>`
- `/mentor/trainee/:traineeId` → `<MentorGuard><MentorTraineeDetail /></MentorGuard>`

Add `MentorGuard` import. Leave `PractitionerCoachGuard` import and all other coach routes alone.

### 5. `src/components/AppSidebar.tsx`
- Remove the hardcoded `{ title: "Mentor Portal", url: "/mentor", icon: GraduationCap }` line from `coachNav`.
- In the component body, after computing `navItems = getNavItems(profile)`, conditionally inject the Mentor Portal entry immediately after the "My Clients" entry when `isMentor || isSuperAdmin`. Pull `isMentor, isSuperAdmin` from `useAccountRole()` (already imported). Implementation: find index of item with `url === "/coach/clients"`; if found and gate passes, splice a new `{ title: "Mentor Portal", url: "/mentor", icon: GraduationCap }` after it into a local copy of `navItems`.

### 6. `src/pages/super-admin/LearningAdmin.tsx`
Add a third tab "Assign Mentor Role":
- New `MentorRoleTab` component reusing the `TraineesTab` search pattern: debounced query + `search_impersonation_targets` RPC + paginated table.
- Columns: Name, Email, Account Type, Mentor Status (Badge: "Mentor" / "—"), Action button (Grant / Revoke).
- Action opens a reason dialog (Textarea, min 10 chars) that calls `supabase.rpc("set_mentor_role", { p_user_id, p_is_mentor, p_reason })`.
- On success: toast + invalidate the search query so the badge refreshes.
- Mentor status comes from the search RPC if it returns `is_mentor`; otherwise fetch in a separate batched query keyed by visible user ids using `users` table select on `id, is_mentor` (read-only). Confirm in implementation which is available; prefer extending nothing backend-side — if `search_impersonation_targets` lacks `is_mentor`, do the supplementary `users` select.
- Add the third `<TabsTrigger value="mentor-role">Assign Mentor Role</TabsTrigger>` and matching `<TabsContent value="mentor-role"><MentorRoleTab /></TabsContent>` in the existing `<Tabs defaultValue="trainees">` block at line ~1757.

## Acceptance
1. Non-mentor, non-super-admin user visiting `/mentor` is redirected to `/dashboard`.
2. User with `is_mentor=true` (any `account_type`) can access `/mentor` and `/mentor/trainee/:id`.
3. Super admin can access `/mentor` even without `is_mentor=true`.
4. "Mentor Portal" sidebar entry only appears for `isMentor || isSuperAdmin`; it sits directly after "My Clients" for coaches and super-admin-as-coach.
5. Coaches who are not mentors no longer see the Mentor Portal entry.
6. Learning Admin shows a third "Assign Mentor Role" tab for super admins.
7. Granting mentor role via the new tab causes the target user's sidebar to show Mentor Portal on next load.
8. Revoking mentor role removes their `/mentor` access on next navigation.
