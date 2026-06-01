# Corporate dashboard contract gating — confirmed

Verified against the codebase. The plan as written is correct. One small adjustment plus a typing note.

## What I verified

- `organization_features_view` exists in `types.ts` (line 9744) with `instruments_included: Json | null` — RLS-scoped per the brief, single row via `.maybeSingle()` is fine. `src/pages/company/Features.tsx:112` already uses the same pattern.
- `useAccountRole()` exposes `isSuperAdmin` (true only for `brainwise_super_admin`).
- Routes confirmed in `src/App.tsx:204–207` — `RoleGuard` allows `company_admin | org_admin | brainwise_super_admin` for all three dashboards. Plan correctly keeps these untouched.
- `AppSidebar.tsx` `showDashboardsMenu` block (lines ~317–375) contains exactly the three NAI/PTP/AIRSA `SidebarMenuItem`s as described.
- The three pages (`CompanyDashboard`, `PTPDashboard`, `AirsaDashboard`) exist at the stated routes.
- UUIDs map to: CompanyDashboard→NAI, PTPDashboard→PTP, AirsaDashboard→AIRSA — consistent with existing usage.

## Adjustments

1. **Type cast for `instruments_included`** — `types.ts` types it as `Json | null`, not `string[]`. Read as `Json`, then narrow:
   ```ts
   const arr = Array.isArray(row?.instruments_included) ? (row.instruments_included as string[]) : [];
   const set = new Set(arr);
   ```
   No `as any` on the row needed; just guard the array. (`Features.tsx` gets away with `string[]` because of a hand-typed local interface; the hook should be safe.)

2. **Sidebar parent visibility** — keep `showDashboardsMenu` (the existing role check) as the outer gate, AND require `isSuperAdmin || NAI.included || PTP.included || AIRSA.included` before rendering the parent. Brief already says this; just confirming it stays inside the existing block, not replacing it.

3. **Loading behavior in pages** — while `orgAccessLoading`, render existing loading UI (each page already has one); after load, if `!allowed`, the effect fires `navigate("/dashboard", { replace: true })` and the component returns `null`. Do not redirect during loading (prevents flicker/false negatives on slow networks).

4. **Super-admin bypass** — hook short-circuits before the query when `isSuperAdmin` is true, returning `loading=false` and `orgInstrumentIncluded` always true. Confirmed super admins have no org row, so without this they'd be wrongly blocked.

## Files

- NEW `src/hooks/useOrgInstrumentAccess.ts`
- EDIT `src/components/AppSidebar.tsx` (Dashboards submenu only)
- EDIT `src/pages/company/CompanyDashboard.tsx` (NAI guard)
- EDIT `src/pages/company/PTPDashboard.tsx` (PTP guard)
- EDIT `src/pages/company/AirsaDashboard.tsx` (AIRSA guard)

No changes to `App.tsx`, `RoleGuard`, `types.ts`, individual gating, super-admin Features page, or any backend.

Type-check will be run after build.
