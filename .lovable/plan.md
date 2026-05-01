## Coordinated change: align repo with deployed v38 + add re-onboarding guard

### Change 1 — Replace `supabase/functions/set-account-type/index.ts`

Full-file replacement with the v38 source provided. Key behavioral changes vs current repo:

- Adds `POST`-only method check (returns 405 otherwise).
- Wraps everything in try/catch with structured `[SET-ACCOUNT-TYPE]` logging.
- Accepts either `{ account_type }` or `{ invite_code }` in the body.
- **Onboarding-state guard**: fetches `users.account_type` first via service role; if non-null, returns 409 "Account already configured."
- **Corporate path**: if `invite_code` is present, delegates to `userClient.rpc("invitation_redeem", { p_invite_code, p_user_id })` and maps PG error codes (`P0002` → 404, `42501` → 403, "expired"/"already been redeemed" → 410).
- **Individual path**: only `account_type === "individual"` is accepted. `coach` and `corporate_employee` are no longer in any allowlist. Update uses `.eq("id", userId).is("account_type", null).select("id")` as defense-in-depth; empty result → 409.
- Only mention of "coach" in the new file is a comment noting coach assignment must come from `accept-coach-invitation`.

### Change 2 — Add re-onboarding guard to `src/pages/Onboarding.tsx`

At the top of the `Onboarding` component (before the existing `useState`/`useEffect` block does its work), consume the existing `useAccountType` hook from `@/hooks/useOnboardingStatus`:

```ts
import { Navigate, useNavigate } from "react-router-dom";
import { useAccountType } from "@/hooks/useOnboardingStatus";
...
const { data: existingAccountType, isLoading: accountTypeLoading } = useAccountType(user?.id);
```

Render-path guard, placed before the existing `if (checking)` branch:

1. If `user` exists and `accountTypeLoading` is true → render the same centered spinner used by the `checking` branch.
2. If `existingAccountType` is a non-empty string → `return <Navigate to="/" replace />;` (already-onboarded users never see the picker, even though `/onboarding` is in `EXEMPT_PATHS`).
3. Otherwise (null/undefined) → fall through to the existing logic unchanged.

The hook already caches with `staleTime: 60_000` and is keyed on `userId`, so this adds no extra round-trip when navigating from `ProtectedRoute` (which uses the same query key).

### Out of scope

- `ProtectedRoute.tsx`, `useUserProfile`, `useOnboardingStatus` hook internals — consume only.
- Other Edge Functions, other pages, DB migrations.

### Verification after apply

- `rg "coach" supabase/functions/set-account-type/index.ts` should show only the explanatory comment, no allowlist/validation entry.
- `src/pages/Onboarding.tsx` imports `Navigate` and `useAccountType`, with the guard above the existing `checking` spinner.
