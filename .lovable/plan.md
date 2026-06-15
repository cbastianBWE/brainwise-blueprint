Gate company dashboards + interventions on `dashboard_access` feature.

## File 1: `src/App.tsx`
Wrap four route elements with `<SubscriptionGate feature="dashboard_access">` inside the existing `RoleGuard`:
- `/company/nai-dashboard` → CompanyDashboard
- `/company/ptp-dashboard` → PTPDashboard
- `/company/airsa-dashboard` → AirsaDashboard
- `/dashboard/interventions` → InterventionsPage

`/company/dashboard` redirect and all other routes untouched. `/dashboard` (personal) untouched.

## File 2: `src/components/AppSidebar.tsx`
1. Add `hasDashboardAccess` state + `useEffect` calling `supabase.rpc("user_has_feature", { p_user: user.id, p_feature: "dashboard_access" })`, mirroring the existing opsModuleAccess pattern.
2. Update Dashboards submenu render condition to `showDashboardsMenu && hasAnyDashboard && hasDashboardAccess`.
3. Update Interventions nav item render condition to also require `&& hasDashboardAccess`.

Super admins keep access since the RPC returns true for them. No other changes.
