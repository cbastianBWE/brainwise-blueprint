# Phase 8 Security Hardening — Edge Functions Only

All 8 target files match the prior diagnostic (line numbers within ±2; no structural rewrites). Safe to proceed. **No frontend changes. No DB migrations.**

Confirmed clarifications from user:
- **Field names preserved**: existing response uses `current_count` (not `used`). Keep `current_count`; add `reason`/`message` additively. For corp tier, map `chat_used_this_month` → `current_count`.
- **Branch order**: `subscription_status !== 'active'` checked **before** tier (canceled premium → free path).
- **Defensive defaults**: tier null/unknown → `'base'`; status null/non-active → `'inactive'`; missing user row → `free_tier_no_chat`.

---

## Item A — Server-side AI tier resolution

### `supabase/functions/check-ai-usage/index.ts` (rewrite tier logic)

1. Stop reading `body.subscription_tier` entirely. Body parses only `check_only` and `usage_type`.
2. After `auth.getUser()`, look up caller via service-role client:
   ```
   SELECT account_type, subscription_tier, subscription_status FROM users WHERE id = user.id
   ```
   If zero rows → return `{ allowed:false, reason:'free_tier_no_chat', message:'Upgrade to a paid plan to chat with the AI coach.' }`.
3. Branch by `account_type`:
   - **`corporate_employee` | `company_admin` | `org_admin`** → call `user_effective_allowances` via a **user-JWT-scoped client** (built from request's Authorization header):
     - `!ai_chat_enabled` → `{ allowed:false, reason:'chat_disabled_by_contract', message:"AI chat is not enabled on your organization's plan. Contact your administrator." }`
     - `chat_remaining <= 0` → `{ allowed:false, reason:'limit_exceeded', current_count:chat_used_this_month, limit:chat_allowance_per_user, remaining:0, message:"You've used your monthly AI chat allowance." }`
     - else → allowed; `current_count=chat_used_this_month`, `limit=chat_allowance_per_user`, `remaining=chat_remaining`
   - **`brainwise_super_admin`** → `limit=9999`; used = sum from `ai_usage` for current month_year
   - **`individual`** → `subscription_status` check first: if not `'active'` → `free_tier_no_chat`. Then tier: `'premium'` → 150, anything else (incl. null/unknown) → 30.
   - **`coach` | null | unknown account_type** → `free_tier_no_chat`
4. For non-corp allowed paths, retain existing `increment_ai_usage` RPC + manual upsert fallback and `check_only` short-circuit. For corp allowed paths, also still increment `ai_usage` so analytics tracking stays intact (per "do NOT remove the corp-employee usage tracking already in place").
5. Response shape stays backward compatible: `allowed`, `current_count`, `limit`, `remaining`, `tier`, `counts_by_type` (where applicable), plus additive `reason`/`message` on denials.

### `supabase/functions/ai-chat/index.ts`

- Remove `subscription_tier` from the JSON body forwarded to `check-ai-usage`. Stop destructuring `subscription_tier` from inbound body. All other logic untouched. Catch block also gets `serverError` (Item B).

---

## Item B — Sanitized 5xx errors

### New file `supabase/functions/_shared/errors.ts`

Exports `serverError(label, err, headers)`: `console.error`s full error, returns generic `{ error: 'Internal server error' }` 500 with CORS headers merged.

### Apply in catch blocks of:

| File | Lines |
|---|---|
| `ai-chat/index.ts` | ~222 catch-all |
| `check-ai-usage/index.ts` | selectError 500, insertError 500, outer catch |
| `calculate-scores/index.ts` | ~369 catch |
| `check-subscription/index.ts` | ~122-128 catch (preserve `logStep('ERROR', ...)`) |
| `create-checkout/index.ts` | ~95-101 catch (do NOT touch `coach_user_id` metadata) |
| `customer-portal/index.ts` | ~49-54 catch |
| `generate-report/index.ts` | ~322 catch |
| `log-audit/index.ts` | ~75 catch |

Each gets `import { serverError } from "../_shared/errors.ts";`. **All 4xx validation responses left untouched.**

---

## Out of scope

- `src/` frontend, DB schema/RLS/migrations, `set-account-type`, Stripe price IDs/webhooks/`subscription_plans`, `create-checkout` Stripe metadata, `generate-report` auth model, `supabase/config.toml`.

---

## Post-edit deliverables (per user request)

1. Diff of `check-ai-usage/index.ts` tier-resolution block
2. Full `_shared/errors.ts` contents
3. One-line confirmation per Item B file that only the catch block changed
4. `rg "subscription_tier" supabase/functions/check-ai-usage` and `rg "subscription_tier" supabase/functions/ai-chat` output

## Verification checklist

1. No `body.subscription_tier` reads in `check-ai-usage`
2. `ai-chat` no longer forwards `subscription_tier` to `check-ai-usage`
3. `user_effective_allowances` invoked via user-JWT-scoped client
4. `_shared/errors.ts` exists; imported by all 8 listed functions
5. Corp disabled → `reason:'chat_disabled_by_contract'`
6. Free/coach/inactive → `reason:'free_tier_no_chat'` with exact upgrade message
7. `brainwise_super_admin` → `limit:9999`
8. `coach` → `free_tier_no_chat`

## Smoke-test scenarios (described, not executed)

- Inactive individual → `free_tier_no_chat`
- Premium-tier but inactive individual → `free_tier_no_chat` (status checked first)
- Corp employee, org `ai_chat_enabled=false` → `chat_disabled_by_contract`
- Premium active individual → `limit=150`
- Base active individual → `limit=30`
- Cole (super admin `1d14e510-d0d0-4687-9741-4ddfc0c37253`) → `limit=9999`
