# Gate coaches on assessment-take paywall

## Inventory results

**`src/lib/accountRoles.ts`** — `BYPASS_ROLES = ["brainwise_super_admin", "coach"]`. `useAccountRole()` exposes `isBypassAdmin` (true for super admin OR coach) and `isSuperAdmin` (super admin only).

**`src/components/SubscriptionGate.tsx`** (line 52) — `if (isBypassAdmin) return <>{children}</>;`. Used to wrap `/ai-chat`, `/ai-chat/history`, `/resources` in `App.tsx`. Coaches must keep passing through here.

**`src/components/assessment/InstrumentSelection.tsx`** — `canAccessBySubscription` already short-circuits on `isSuperAdmin` only (not `isBypassAdmin`), and the button-rendering branch likewise checks `isSuperAdmin`. So this file is technically already correct in its bypass — but it has no explicit "coach" handling and relies on coaches not having an active premium subscription_status. Risk: any coach row with `subscription_status='active'` would unlock the base-tier PTP card. We will tighten this so coaches are unambiguously gated regardless of their `users.subscription_status`/`subscription_tier` values.

**`src/pages/MyResults.tsx`** (lines 160–162) — uses `isBypassAdmin` to grant `effectiveTier='premium'` and `hasActiveAccess=true`. This bypasses paywalls on the results surface (AI chat, report generation) for coaches. The bug report explicitly preserves coach AI-chat access, so MyResults should keep using `isBypassAdmin`. No change here.

**`/assessment` route** — no `SubscriptionGate` wrapper; gating happens entirely inside `InstrumentSelection.tsx`.

`isBypassAdmin` is consumed in exactly three places: `SubscriptionGate.tsx`, `MyResults.tsx`, `accountRoles.ts` itself.

## Fix shape

Introduce a new derived flag `canBypassAssessmentPaywall` on `useAccountRole()` that returns `isSuperAdmin` only. Then have `InstrumentSelection.tsx` consume that flag instead of `isSuperAdmin` directly, and treat coaches as ordinary individuals on the assessment surface.

This keeps the semantic distinction explicit: `isBypassAdmin` = "skip subscription gate on AI/resources surfaces"; `canBypassAssessmentPaywall` = "skip the paywall on the assessment-take surface". Future role tweaks (e.g., a coach tier that includes assessments) flow through this single flag.

## Changes

### 1. `src/lib/accountRoles.ts`

- Add `canBypassAssessmentPaywall: boolean` to the `AccountRoleInfo` interface.
- In the loading/no-account branch, return `canBypassAssessmentPaywall: false`.
- In the main return, set `canBypassAssessmentPaywall: accountType === "brainwise_super_admin"` (i.e. equal to `isSuperAdmin`, but a named, intent-revealing flag).
- Update the JSDoc to document that `isBypassAdmin` covers AI/resources surfaces while `canBypassAssessmentPaywall` is the assessment-take override.

### 2. `src/components/assessment/InstrumentSelection.tsx`

- Pull `canBypassAssessmentPaywall` from `useAccountRole()` alongside the existing destructure (keep `isSuperAdmin` for now if any UI copy references it; otherwise replace).
- Replace the `if (isSuperAdmin) return true;` short-circuit inside `canAccessBySubscription` with `if (canBypassAssessmentPaywall) return true;`.
- Replace the `if (isSuperAdmin)` branch in the button-rendering block with `if (canBypassAssessmentPaywall)`.
- Replace `isSuperAdmin` in the Card `className` ternary (which decides `hover:shadow-md` vs `opacity-80`) with `canBypassAssessmentPaywall`.
- Net result for coaches: they fall through every branch the same way a base-tier individual with `subscription_status !== 'active'` does, landing on the "Purchase to Access" outline button that routes to `/pricing`. Cards render with `opacity-80` (consistent with base-tier individuals).

### 3. No changes elsewhere

- `SubscriptionGate.tsx`: untouched — coaches keep AI chat and resources access via `isBypassAdmin`.
- `MyResults.tsx`: untouched — coach AI-chat / report-generation bypass preserved per spec.
- `BYPASS_ROLES` constant: untouched.
- Coach routes (`/coach/*`) and `RoleGuard`: untouched.

## Verification checklist

- Coach signs in → `/assessment` shows all 4 cards with grey "Purchase to Access" outline buttons routing to `/pricing`.
- Coach can still open `/ai-chat`, `/ai-chat/history`, `/resources` without paywalls.
- Coach can still navigate `/coach/clients`, `/coach/order-assessment`, etc.
- Super admin: all 4 cards still show "Start Assessment" / "Continue Assessment" with full bypass.
- Individual base-tier user (cplummer): no behavior change — PTP unlocks if subscription_status='active' base, premium cards show "Upgrade to Premium".
- Corp user: no behavior change — feature-gated cards as before.
