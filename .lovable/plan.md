# Plan confirmed — proceed as written

I verified every load-bearing claim against the actual codebase and database. No adjustments needed.

## Verification results

- `public.users.one_time_chat_credits` exists. Safe to add to the `useUserProfile` select.
- `public.subscription_plans` active rows match the spec exactly: base 10/90, premium 15/130, individual one_time 29.99.
- `src/pages/AiChat.tsx`: `UsageCounter` renders at line 628, `LimitReached` at line 752, `CorpUsageCounter` at line 623 (untouched). Line references in the plan are accurate.
- `src/pages/BillingSettings.tsx`: line 204 (`plan.ai_limit` text) and line 223 (`PLANS.premium.monthly.price`/`annual.price`) match.
- `SubscriptionGate.tsx` individual branch is exactly as the plan describes (redirect when `subscription_status !== "active"`); the proposed `feature === "ai_chat"` carve-out is the right surgical change.
- `useAiUsage.ts` already declares `remaining`, `message`, `counts_by_type` as optional and never reads them — adding `credit_balance`, `subscription_active`, `used_credit` as optional is type-safe and consumer-compatible.
- `stripe.ts` price drift confirmed: monthly base 10 (correct), annual base 100 (DB says 90), premium monthly 18 (DB 15), premium annual 180 (DB 130). The corrections in step 5 align statics to DB.

## One small note (not a blocker)

Step 9's `LimitReached` prop signature is backward-compatible because all three new props have defaults — confirmed the only existing call site (`AiChat.tsx:752`) will keep compiling. Step 10 will then pass the new props at that same site.

## Confirmed scope (no backend, no corp, no checkout payload)

1. `useUserProfile.tsx` — add `one_time_chat_credits` to interface + select.
2. `SubscriptionGate.tsx` — individual branch: allow through when `feature === "ai_chat"` AND credits > 0, even without active sub. All other features unchanged.
3. `useAiUsage.ts` — extend `UsageData` with three optional fields.
4. `useSubscriptionPlans.ts` (new) — read active rows from `subscription_plans`, expose `priceFor(tier, interval)` + one-time lookup.
5. `stripe.ts` — update `ai_limit` (30→200, 150→400), feature copy strings, and stale prices (base annual 90, premium 15/130). Keep all `price_id`s and base.monthly=10, ASSESSMENT_PURCHASE=29.99.
6. `Pricing.tsx` — display price via `priceFor` with PLANS fallback; checkout still uses `price_id` from PLANS.
7. `BillingSettings.tsx` — line 223 prices via `priceFor`; line 204 auto-corrects via step 5.
8. `UsageCounter.tsx` — no change.
9. `LimitReached.tsx` — add `creditBalance`, `subscriptionActive`, `premiumLimit` props with defaults; credit-only out-of-credit copy with no reset date and no upgrade button; subscriber copy uses dynamic `${premiumLimit}`.
10. `AiChat.tsx` — individual counter area: subscriber renders `UsageCounter` + optional "+ {n} one-time messages" muted line; credit-only renders only "{n} one-time message(s) remaining". Pass new props to `LimitReached` at line 752.
11. `PrivacySettings.tsx` (~527-545) — append credit line when `credit_balance > 0`; relabel as one-time when `subscription_active === false`.

Untouched: edge functions, `CorpUsageCounter`, corp branches, checkout `price_id` wiring, scheduled-publish or backend paths.

Ready to build on approval.
