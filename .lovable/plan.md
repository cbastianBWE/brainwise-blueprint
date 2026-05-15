## Pattern C Frontend: Super Admin as Practitioner Coach + Comp Coupons UI

Implements role plumbing so a super admin with `is_practitioner_coach=true` gets coach-affordance routes and a Coach Tools sidebar section, plus a new `/super-admin/coupons` admin page for managing Stripe comp coupons.

### Files

**1. `src/hooks/useUserProfile.tsx` — EDIT**
- Add `is_practitioner_coach: boolean` to `UserProfile` interface
- Add `is_practitioner_coach` to the supabase `.select(...)` columns

**2. `src/lib/accountRoles.ts` — EDIT**
- Add `isPractitionerCoach: boolean` to `AccountRoleInfo` interface (with JSDoc explaining decoupling from account_type)
- Set `isPractitionerCoach: false` in the loading-state early return
- Derive `const isPractitionerCoach = profile?.is_practitioner_coach === true` and include in returned object
- Leave `isCoach` literal (`accountType === "coach"`) — unchanged

**3. `src/components/PractitionerCoachGuard.tsx` — NEW**
- Route guard using `useAccountRole()`; loading → spinner; `!isPractitionerCoach` → `<Navigate to="/dashboard" replace />`; otherwise render children
- Mirrors `RoleGuard.tsx` styling

**4. `src/App.tsx` — EDIT**
- Import `PractitionerCoachGuard` and `CompCouponsManagement`
- Swap 6 coach routes from `RoleGuard allowedRoles={["coach"]}` → `PractitionerCoachGuard`: `/coach/clients`, `/coach/order-assessment`, `/coach/client-results`, `/coach/invoices`, `/coach/profile`, `/coach/certification`
- Leave `/coach/resources` on `RoleGuard` (intentionally unchanged)
- Add `/super-admin/coupons` route guarded by `RoleGuard allowedRoles={["brainwise_super_admin"]}` + `SuperAdminSessionProvider`, placed after `/super-admin/resources`

**5. `src/components/AppSidebar.tsx` — EDIT**
- Import `Ticket` from lucide-react and `Fragment` from react
- Extend `NavItem` type with optional `sectionHeader?: string`
- Insert `{ title: "Comp Coupons", url: "/super-admin/coupons", icon: Ticket }` in `superAdminNav` between "Resource Authoring" and "AI Chat"
- Change `getNavItems` signature to accept the full profile object; in the `brainwise_super_admin` case, when `is_practitioner_coach === true`, append `coachNav` (filtered to drop `/coach/resources` since super admin already has its own Resources entry — optional polish noted in prompt; will apply) with the first appended item carrying `sectionHeader: "Coach Tools"`
- Update call site to `getNavItems(profile)`
- Render loop emits a section-header element above any item with `sectionHeader` set; header label uses small uppercase muted text and `sr-only` when sidebar is collapsed; wrap each iteration in `<Fragment key={...}>`

**6. `src/pages/super-admin/CompCouponsManagement.tsx` — NEW**
- Full page per prompt: header with "Create Coupon" CTA, "Show archived" switch, table (Name / % Off / Duration / Applies to / Stripe ID / Expires / Status / Action), empty state, loading skeleton, error state
- React Query `["comp-coupons", showArchived]` reading directly from `comp_coupons` table (RLS allows super admin)
- `CreateCouponModal`: form fields for internal_name, description, percent_off (default 100), duration (once/repeating/forever), duration_in_months (conditional), max_redemptions, redeem_by days (default 60), applicable_account_types (multi-select badges, default `["brainwise_super_admin"]`), reason (min 10 chars), notes; client-side validation; confirmation dialog summarizing values; calls `supabase.functions.invoke("create-comp-coupon", { body: {...} })` with `redeem_by_iso` computed from days
- `ArchiveCouponModal`: reason field (min 10 chars); calls `supabase.rpc("archive_comp_coupon", { p_coupon_id, p_reason })`
- Toasts via `@/hooks/use-toast`; status badges (Active forest, Expired/Archived muted); query invalidation on success

### Out of scope (explicitly do NOT touch)
- `RoleGuard.tsx`, `/coach/resources` route, `create-checkout` and `stripe-webhook` Edge Functions, any SQL migrations

### Verification after build
- TypeScript clean
- Visit `/super-admin/coupons` (super admin) → page renders; non-super-admin → redirected
- Visit `/coach/clients` etc. as super admin (with flag) → loads; as individual → redirected
- Sidebar shows Comp Coupons entry and Coach Tools section header for super admin practitioner coach
