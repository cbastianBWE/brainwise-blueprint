## Step 0 — Inventory findings

**Where access is gated today:**

1. **`src/components/SubscriptionGate.tsx`** — already has `isBypassAdmin` short-circuit (line 52: `if (isBypassAdmin) return <>{children}</>;`). `isBypassAdmin` from `useAccountRole()` already includes `brainwise_super_admin`. So `/ai-chat`, `/ai-chat/history`, `/resources` already work for super admin. ✅ No change needed.

2. **`src/lib/accountRoles.ts`** — `BYPASS_ROLES = ["brainwise_super_admin", "coach"]`; super admin returns `isBypassAdmin: true`, `isCorp: false`, `isIndividual: false`. The existing useAccountRole hook is the right primitive — we just need to consume it where assessment access is decided.

3. **`src/components/assessment/InstrumentSelection.tsx`** — the access decider. Logic at lines 201–205 (`canAccessBySubscription`) and 304–358 (button rendering branches: `isCorp` → corp feature check, `subscriptionAccess` → premium individual, `coachPaid`/`purchaseAccess`/`selfPayCoachInvited` → coach paths, else → "Upgrade to Premium" CTA). Super admin currently falls through to the upgrade branch because `subscription_status` is "inactive" and tier is not "premium". This is the primary surface to fix.

4. **`src/components/AppSidebar.tsx`** — `superAdminNav` (lines 80–89) does NOT include "Assessment" or "My Results". Super admin has no nav entry to reach `/assessment` or `/my-results` even though the routes are open at the route level.

5. **`src/App.tsx`** — `/assessment`, `/dashboard`, `/my-results` are wrapped only in `<ProtectedRoute>`, no `<RoleGuard>` and no `<SubscriptionGate>`. Super admin can already navigate to them by URL; the only blocker is the in-page UI gating in InstrumentSelection.

6. **`src/pages/MyResults.tsx`** — Retake mechanism is just `navigate('/assessment?instrument=...')` (line 901–905). No cooldown, no gating beyond what InstrumentSelection enforces. The two "Upgrade to Premium" prompts (lines 1125, 1340) are tied to AI-chat-specific paywalls inside MyResults; they check `subscription_status === 'active'`. Super admin will hit these. Also the report/AI chat consumption flows reference `profile?.subscription_tier ?? 'base'` which would treat super admin as base-tier for usage limits.

7. **Retake behavior for individuals today** — no cooldown, no special UI; "Retake Assessment" button on results page just routes back to `/assessment?instrument=<id>&autostart=true`. The flow re-runs the assessment and inserts a new `assessments` + `assessment_results` row. Super admin gets identical behavior automatically once InstrumentSelection lets them start.

## Backend (you've stated these are applied directly outside this build)

- A1: `is_internal_test = true` for super admin users
- A2: `is_internal_user(uuid)` helper function
- A3: delete stale coach_clients rows

No frontend dependency on these — purely defense-in-depth for downstream filtering. Frontend work can ship independently.

## Frontend changes

### 1. `src/components/assessment/InstrumentSelection.tsx`

- Pull `isSuperAdmin` from `useAccountRole()` (already exists on the returned object).
- Update `canAccessBySubscription` to short-circuit `true` when super admin.
- In the button-rendering branch, check `isSuperAdmin` first (before `isCorp`, before `subscriptionAccess`) so super admin always sees a plain "Start Assessment" button on all four cards (PTP, NAI, AIRSA, HSS).
- In the card wrapper className that controls hover/dim opacity, treat super admin as having access.
- The "any visible" empty-state check at line 280 is gated on `isCorp`, so super admin is unaffected.

### 2. `src/components/AppSidebar.tsx`

- Add two nav items to `superAdminNav`: "Assessment" → `/assessment` and "My Results" → `/my-results`. Place them at the top of the array so they're visible above the admin-tools section.

### 3. `src/pages/Dashboard.tsx`

- Currently a placeholder welcome card. No changes required for definition-of-done — super admin reaches assessments via the sidebar link, not via dashboard tiles. (DoD says "navigate to dashboard… and see assessment-take entry surface" — sidebar nav satisfies this. Confirming in plan rather than expanding scope.)

### 4. `src/pages/MyResults.tsx`

- Two "Upgrade to Premium" alert dialogs (report regeneration limit, AI chat) check `profile?.subscription_status === 'active'`. For super admin, treat as if subscription is active so those upgrade prompts never fire. Use `isBypassAdmin` from `useAccountRole()` as the OR clause.
- For AI usage tier resolution (`profile?.subscription_tier ?? 'base'` at lines 521, 663), substitute `'premium'` when super admin so they get premium-tier limits rather than base-tier. (Single, contained change; doesn't alter individual behavior.)

## Out of scope (confirmed)

- No route changes in App.tsx
- No new RoleGuard wrappers
- No changes to scoring, narrative generation, dashboards, or coach UI
- No changes to other roles' experience — all branches that don't match super admin are untouched

## Definition-of-done verification (post-build)

Sign in as cbastian@brainwiseenterprises.com and confirm:
1. Sidebar shows "Assessment" and "My Results" links
2. /assessment shows all 4 cards with "Start Assessment" buttons (no Premium lock, no upgrade CTA)
3. Can complete a PTP run end-to-end and see it on /my-results
4. "Retake Assessment" button on results page works (navigates to /assessment with autostart, runs again, new result appears)
5. No "Upgrade to Premium" dialogs fire from PDF regeneration or AI-chat-from-results entry points
6. Sign in as a regular individual user — flow is unchanged (still sees Premium lock on NAI/AIRSA/HSS until they subscribe)

## Files to edit

- `src/components/assessment/InstrumentSelection.tsx` — add super admin to access logic
- `src/components/AppSidebar.tsx` — add Assessment + My Results to superAdminNav
- `src/pages/MyResults.tsx` — bypass upgrade dialogs and treat super admin as premium for usage tier
