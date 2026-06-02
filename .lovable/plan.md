## Confirmation

The instructions are accurate. The `plan_tiers` table exists and already contains rows for `free`, `base`, `premium` with the exact feature copy specified in Prompt 2 Part A. Backend is ready; this is a pure frontend rewire.

One small adjustment from the prompt as written:

- **`src/pages/marketing/Pricing.tsx`** — the `plan.features.map(...)` is inside the `PricingIndividual` subcomponent (line 152), not in the top-level `MarketingPricing`. The hook must be called inside `PricingIndividual` (where `tier` is in scope via the `Object.entries(PLANS)` map at line 73). The prompt's wording ("it already imports PLANS … call it") works as long as the call lives in `PricingIndividual`. I'll add it there.

Everything else in both prompts matches the codebase exactly:
- `src/hooks/useSubscriptionPlans.ts` has the `PlanRow`, `useEffect`, `cancelled` guard, and returned `priceFor`/`oneTimePrice`/`loading` shape described.
- `src/pages/Pricing.tsx` already calls `useSubscriptionPlans()` and renders `plan.features.map` at line 132 with `tier` in scope.
- `src/pages/BillingSettings.tsx` already calls `useSubscriptionPlans()`, has `tier` in scope for the active-plan block, renders `plan.features.map`, the upgrade card `PLANS.premium.features.map`, the three hardcoded free-state `<li>`s, and the "AI chat limit:" label exactly as described.
- `src/lib/stripe.ts` `PLANS.base.features`, `PLANS.premium.features`, and `ASSESSMENT_PURCHASE.instruments` match the pre-edit state.

## Plan

### Step 1 — `src/hooks/useSubscriptionPlans.ts`
- Add `TierRow` interface (tier, display_name, features, ai_coaching_limit, one_time_credit_grant).
- Add `tierRows` state.
- Inside the existing `useEffect`, after the `subscription_plans` query resolves, run a second query against `plan_tiers` under the same `cancelled` guard; map into `tierRows`.
- Add `featuresFor(tier)` and `limitsFor(tier)` callbacks.
- Return `featuresFor` and `limitsFor` alongside existing `priceFor`, `oneTimePrice`, `loading`. No existing behavior changes.

### Step 2A — `src/lib/stripe.ts` fallback constants
- Update `PLANS.base.features` to the 3-item list.
- Update `PLANS.premium.features` to the 3-item list.
- Change `ASSESSMENT_PURCHASE.instruments` to `["PTP"]`.
- Leave all `price_id`, `price`, and `ai_limit` values untouched.

### Step 2B — Rewire 4 render sites (hook value, constant fallback)
1. **`src/pages/Pricing.tsx`** — destructure `featuresFor` from `useSubscriptionPlans()`; change `plan.features.map(...)` → `(featuresFor(tier) ?? plan.features).map(...)`.
2. **`src/pages/marketing/Pricing.tsx`** — add `useSubscriptionPlans` import; call hook inside `PricingIndividual` and destructure `featuresFor`; change line 152 `plan.features.map(...)` → `(featuresFor(tier) ?? plan.features).map(...)`.
3. **`src/pages/BillingSettings.tsx` active-plan block** — destructure `featuresFor`; change `plan.features.map(...)` → `(featuresFor(tier) ?? plan.features).map(...)`.
4. **`src/pages/BillingSettings.tsx` upgrade card** — `PLANS.premium.features.map(...)` → `(featuresFor("premium") ?? PLANS.premium.features).map(...)`.
5. **`src/pages/BillingSettings.tsx` free state** — replace 3 hardcoded `<li>`s with a `.map` over `featuresFor("free") ?? [the 3 new defaults]`.
6. **`src/pages/BillingSettings.tsx` AI-limit label** — rename "AI chat limit:" → "AI coaching limit:"; keep `{plan.ai_limit}` value untouched.

### Out of scope (untouched)
Per-assessment purchase card grid logic, pricing numbers, checkout calls, `price_id` references, backend.

### Verification
Type-check after edits.
