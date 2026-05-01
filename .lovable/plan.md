# Coordinated security fixes — generate-report auth + coach invite token leak

Four file changes across two findings. No DB migrations, no other auth flows touched.

## Prerequisites (already confirmed)

- `INTERNAL_FUNCTION_SECRET` is set in Supabase Edge Function secrets.
- `validate-coach-invite` Edge Function will be deployed by you separately and returns `{ first_name, last_name, email, certification_type }`.

---

## Change 1 — NEW FILE: `supabase/functions/_shared/secrets.ts`

Constant-time string comparison helper.

```ts
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

## Change 2 — `supabase/functions/generate-report/index.ts`

**a)** Add import at top (after existing imports, line 2):

```ts
import { safeEqual } from "../_shared/secrets.ts";
```

**b)** Insert hybrid auth gate immediately after the OPTIONS handler (after line 13), **before** the existing `admin` client creation at line 15:

```ts
  // Hybrid auth: internal-secret bypass OR user JWT with ownership check
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  const headerSecret = req.headers.get("x-internal-secret");
  const isInternal = !!(internalSecret && headerSecret && safeEqual(internalSecret, headerSecret));

  let callerUserId: string | null = null;

  if (!isInternal) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    callerUserId = user.id;
  }
```

**c)** Insert ownership check after the `assessment_results` row is fetched and validated (i.e. after the `if (resultErr || !result)` early-return block ending at line 53), before any Anthropic / heavy work. Note: the existing variable name is `admin` (not `supabaseAdmin` as in your spec) — using the existing name to avoid an undefined reference:

```ts
    // Ownership check (skip for internal calls)
    if (!isInternal && callerUserId) {
      if (result.user_id !== callerUserId) {
        const { data: callerProfile } = await admin
          .from("users")
          .select("account_type")
          .eq("id", callerUserId)
          .single();
        if (callerProfile?.account_type !== "brainwise_super_admin") {
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }
```

This sits inside the existing `try` block, immediately after the user-name fetch can begin — placing it right after line 53 means the super-admin lookup only happens when ownership doesn't match, before any Anthropic spend.

## Change 3 — `supabase/functions/calculate-scores/index.ts` (lines 319-326)

Replace the `fetch()` headers block to drop the anon-key Authorization and add the internal-secret header:

```ts
      fetch(reportUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "",
        },
        body: JSON.stringify({ assessment_result_id: result!.id }),
      }).catch((e) => console.error("generate-report fire-and-forget error:", e));
```

## Change 4 — `src/pages/SignUp.tsx` (lines 60-65)

Replace the anon read of `coach_invitations` with the new Edge Function call:

```ts
      const { data, error } = await supabase.functions.invoke('validate-coach-invite', {
        body: { token }
      });
```

The downstream `if (data) { setCoachInvitation(data); setFirstName(data.first_name); ... }` block is unchanged (response shape is identical).

The post-signup `accept-coach-invitation` invoke at lines 121-123 is **not** touched.

---

## Verification (after apply)

1. `rg "INTERNAL_FUNCTION_SECRET" supabase/functions/` — should show the new gate in `generate-report/index.ts` and the new header in `calculate-scores/index.ts` (plus any pre-existing usage e.g. in deployed `invite-coach`).
2. `rg "SUPABASE_ANON_KEY" supabase/functions/calculate-scores/` — should NOT show the line previously used to call generate-report.
3. `rg "from\(['\"]coach_invitations['\"]\)" src/` — should match only `src/pages/super-admin/CoachManagement.tsx` (lines 299, 328); SignUp.tsx no longer matches.

## Notes / risks

- I will use `admin` (existing name in generate-report) instead of `supabaseAdmin` from your spec — purely a naming alignment, behavior identical.
- Frontend callers (`MyResults.tsx`, `VersionManagement.tsx`) are untouched; `supabase.functions.invoke()` already attaches the user JWT, so they pass through Class A path with ownership check (super-admin bypass covers `VersionManagement`).
- The fire-and-forget call from `calculate-scores` now goes through the internal-secret path; if the secret env var is missing in the function's environment, the fetch will be rejected with 401 and the narrative won't generate (caller-only impact, surfaced via console.error).
