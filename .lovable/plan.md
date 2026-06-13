# Open /operations to operations members (gated by membership + module entitlement)

Today every `/operations/*` route and the CRM + Operations sidebar sections are locked to super admins via `RoleGuard`. Backend already exposes `ops_my_membership()` and `user_has_feature(p_user, 'module:CRM' | 'module:OPERATIONS')`. This change moves frontend gating to: **must be an operations member AND have the corresponding module entitlement** (super admins keep access since they satisfy both checks).

## 1. New hook: `src/hooks/useOpsMembership.ts`

- Calls `supabase.rpc("ops_my_membership")` once per signed-in user.
- Returns `{ membership, loading }` where `membership` is `{ org_id, role, org_name, stripe_collection_enabled } | null`.
- Module-level cache keyed by `user.id` so the RPC fires once across all consumers; resets on user change/sign-out. No refetch per render.

## 2. New component: `src/components/OperationsGuard.tsx`

- Props: `{ module: "CRM" | "OPERATIONS"; children }`.
- Renders `<SubscriptionGate feature={`module:${module}`}>` wrapping an inner membership check:
  - `useOpsMembership()` loading → render `null`.
  - `membership === null` → `toast.error("You don't have access to this workspace.")` + `<Navigate to="/dashboard" replace />`.
  - Otherwise → render `children`.
- Module entitlement enforcement + super-admin bypass are delegated entirely to `SubscriptionGate`.

## 3. `src/App.tsx`

- Add imports: `OperationsGuard`, and `Outlet` from `react-router-dom`.
- Replace the ~43 individually-wrapped `/operations/*` routes (lines ~290–334, each `<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider>…`) with two pathless layout-route groups inside the existing `<ProtectedRoute><AppLayout/>` block:

```text
<Route element={<OperationsGuard module="CRM"><SuperAdminSessionProvider><Outlet/></SuperAdminSessionProvider></OperationsGuard>}>
  pipeline, dashboard, leads, leads/:id, lead-capture,
  accounts, accounts/:id, contacts, contacts/:id,
  deals, deals/:id, campaigns, activities, email-templates, inbound
</Route>

<Route element={<OperationsGuard module="OPERATIONS"><SuperAdminSessionProvider><Outlet/></SuperAdminSessionProvider></OperationsGuard>}>
  customers, customers/:id, my-time, items,
  invoices(+new, /from-work, /:id/edit, /:id),
  estimates(+new, /:id/edit, /:id),
  retainers(+new, /:id),
  credit-notes(+new, /:id),
  recurring-expenses,
  recurring-invoices(+new, /:id/edit, /:id),
  projects/:id, reports, settings, import
</Route>
```

- Every child route keeps its exact path and element component — only the wrapper changes.

## 4. `src/components/AppSidebar.tsx`

- Extract the CRM block (Pipeline → Inbound, currently starting at line 120) into `const crmNav`, with the `sectionHeader: "CRM"` preserved on its first item.
- Extract the Operations block (Customers → Settings, currently starting at line 131) into `const operationsNav`, with `sectionHeader: "Operations"` on its first item.
- Remove both blocks from `superAdminNav`.
- In `AppSidebar()`:
  - Call `useOpsMembership()`.
  - When `membership` is non-null, run two `supabase.rpc("user_has_feature", { p_user, p_feature: "module:CRM" | "module:OPERATIONS" })` calls (stored in local state, fired once per user) to decide each section independently.
  - Append `crmNav` to `navItems` when CRM is entitled; append `operationsNav` when OPERATIONS is entitled.
  - When `membership` is null, neither section is shown.
- All other nav sections (assessments, LMS, coach, admin, super admin) are untouched.

## Out of scope (intentionally untouched)

- Operations page components, their RPC calls.
- Assessments / LMS / coach / admin nav and routes.
- `/super-admin/*` routes.

## Technical notes

- `SubscriptionGate` already short-circuits to `<Navigate to="/dashboard" replace />` on denied module keys and resolves true for super admins via the `user_has_feature` RPC, so `OperationsGuard` only needs to add the membership-existence check.
- Caching strategy for `useOpsMembership` and the sidebar `user_has_feature` results: module-level `Map<userId, Promise<…>>` to dedupe concurrent callers; invalidate on `user.id` change.
- The two pathless layout groups must live inside the existing `<Route element={<ProtectedRoute><AppLayout/></ProtectedRoute>}>` parent so layout + auth wrapping is preserved.
