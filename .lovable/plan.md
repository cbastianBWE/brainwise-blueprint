
# Phase 10 Round 7b — CoachClients.tsx polish

## Scope
**Exactly one file:** `src/pages/coach/CoachClients.tsx` (1149 lines).
No backend, no migrations, no new RPCs, no new deps, no other files.

## Verbatim-preservation blocks (confirmed via re-read)

| Lines | Block | Status |
|---|---|---|
| L31–43 | `INSTRUMENTS` + `CERT_TYPE_TO_INSTRUMENTS` constants | preserved byte-identical |
| L45–70 | `ClientRow` / `UniqueClient` interfaces | preserved byte-identical |
| L98 | `actorCert` inline state type | preserved (not centralized into `OwnCertRow`) |
| L102–109 | `canOfferActorDebrief` / `canOrderAssessment` / `actorOnlyMode` (§114) | preserved byte-identical |
| L111–217 | `fetchClients` enrich loop + unique-client derivation | logic preserved; only wrapping shell (try/catch/finally + initial query error destructure) added per Change 7b |
| L341–351 | `handleOrderCoachPays` payload object | preserved byte-identical |
| L352, L357, L372 | `console.log` debug statements | preserved byte-identical |
| L354–356 | `supabase.functions.invoke("create-checkout", { body: payload })` | preserved byte-identical |
| L369–374 | URL redirect block | preserved byte-identical |
| L375–380 | outer try/catch/finally shape | preserved byte-identical |
| L383–494 (handleOrderClientPays) | full body incl. email HTML template L433–468 | preserved; only L470–478 RPC cast micro-edit per Change 4 |
| L496–583 (handleOrderActorDebrief) | full body incl. email HTML template L511–546 | preserved; only L548–554 RPC cast micro-edit per Change 5 |
| L556–564 | actor-debrief error-code map (all 7 keys) | preserved byte-identical |
| L585–613 | stats derivation predicates | preserved byte-identical |
| L615–627 | `getStatusBadge` | preserved byte-identical |
| L629–659 | `handleRemind` + `coach_invitation_resend` branching | preserved byte-identical |
| L661–746 | `sharedFormFields` JSX | preserved (only Change 7d `aria-hidden` adds touch icons inside, none of which fall in this range — confirmed icons in 7d are all outside 661–746) |
| L1141–1145 | `<PendingInvitations>` embed | preserved byte-identical |

## Changes (with current-file line numbers)

### Change 1 — Imports (L24-ish lucide-react line)
Add `Loader2, AlertCircle` to existing lucide-react import. No other import edits.

### Change 2 — New interfaces (insert below L70)
Add `CoachCertificationActiveRow`, `OwnCertRow`, `SendCoachInvitationEmailResult`, `CreateActorDebriefOrderResult`. L98 `actorCert` inline state shape unchanged.

### Change 3 — cert-fetch useEffect typed rewrite (L221–263)
Replace three `(supabase as any)` casts and `(row: any)` callback. Query bodies (`.from/.select/.eq/.in/.order/.limit`) byte-identical. `ownCert` line gets `(ownCertData?.[0] as OwnCertRow | undefined) ?? null`. State setters (`setAllowedInstrumentIds`, `setCertsLoaded`, `setActorCert`, `setActorsUsed`) and their args unchanged.

### Change 4 — `send_coach_invitation_email` RPC typed call (L470–478)
**Verified L10348–10356 of `src/integrations/supabase/types.ts`: function is in the generated RPC union with Args matching `p_to/p_subject/p_html/p_email_type?` and `Returns: Json`.** → Use the **clean** `supabase.rpc("send_coach_invitation_email", {...})` call, no `as never`. Narrow output via `emailData as SendCoachInvitationEmailResult | null`. Downstream `if (emailError || !emailResult?.dispatched)` and toast branches preserved byte-identical (just `emailData?.dispatched` → `emailResult?.dispatched`).

### Change 5 — `create_actor_debrief_order` RPC typed call (L548–554)
**Verified L9374–9383 of `src/integrations/supabase/types.ts`: function is in the generated RPC union with Args matching `p_actor_email/p_actor_first_name/p_certification_id/p_coach_note?/p_email_html?` and `Returns: Json`.** → Use the **clean** `supabase.rpc("create_actor_debrief_order", {...})` call, no `as never`. Narrow output via `result = data as CreateActorDebriefOrderResult | null`. L555–569 error block (incl. L556–564 verbatim error map) preserved byte-identical. L571 `data?.email_dispatched` → `result?.email_dispatched`.

**Fallback note:** If TypeScript rejects either literal at build time (unexpected given the generated union shows both), fall back to the `as never` pattern on the function name + args only. Default plan is the clean version.

### Change 6 — `(error as any).context?.json?.()` narrow (L363)
Replace `(error as any)` cast with local typed alias `errWithContext = error as { context?: { json?: () => Promise<{ error?: string } | undefined> } }`. Rest of L358–368 block (try/catch shape, `error instanceof Error`, `"context" in error` guard, `body?.error` extraction, `throw new Error(errorMsg)`) preserved byte-identical.

### Change 7a — Loader2 swap in clients tab (L929–932)
Replace raw `<div animate-spin>` spinner with `<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" role="status" aria-label="Loading clients" />` matching Round 7a convention.

### Change 7b — `clientsError` state + try/catch wrap in `fetchClients` (L78-ish + L111–217) + error-state render branch (L928-region)
1. Add `const [clientsError, setClientsError] = useState<string | null>(null);` alongside `loading`.
2. Wrap `fetchClients` body in `try/catch/finally`: add `setClientsError(null)` after `setLoading(true)`; destructure `error: ccError` on initial `coach_clients` SELECT and `throw new Error(ccError.message)`; enrichment loop (L123–190) and unique-client derivation (L192–215) **inside** try, byte-identical; move `setClients`/`setUniqueClients` into try; catch sets `clientsError` and clears lists; `setLoading(false)` in finally.
3. Add new render branch between `loading` and `clients.length === 0`: Card with `<AlertCircle aria-hidden="true" />`, message `Couldn't load clients: {clientsError}`, outline Retry button calling `fetchClients`.

### Change 7c — filter-empty distinction in roster (L995–1023)
Hoist filtered list to `filteredUniqueClients` derived value (inside `selectedClientEmail === null` branch). `<TableBody>` becomes conditional: if `filteredUniqueClients.length === 0` render single `<TableRow><TableCell colSpan={6}>` with "No clients match your search." (when query non-empty) or "No clients to display." fallback; else map preserved byte-identical (existing TableCell rows L1003–1021 unchanged).

### Change 7d — decorative-icon `aria-hidden="true"` sweep
Add `aria-hidden="true"` to icons at the listed lines: L764 (×2), L777 (×2), L835, L850, L856, L886, L895, L904, L913, L936, L949, L960, L1018, L1034, L1056, L1101, L1110. No other attribute changes; L913 Clock color stays `text-destructive` per spec.

## Items flagged (NOT implementing)
None. Every change fits the spec's typed-RPC / a11y / try-catch / filter-empty patterns cleanly. No additional changes proposed.

## Confirmation
- Exactly one file in the diff: `src/pages/coach/CoachClients.tsx`.
- No other files (no shared components, no types.ts edits, no migrations, no edge-function edits).
- No new dependencies, no new shadcn primitives.
- Only new lucide imports: `Loader2`, `AlertCircle`.
- Create-checkout payload, invoke call, redirect, debug logs, and try/catch/finally shape (L341–381) byte-identical.
- Actor-debrief 7-key error map (L556–564) byte-identical.
- §114 eligibility booleans (L102–109) byte-identical.
- Email HTML template strings (L433–468, L511–546) byte-identical.
- Stats derivation, `getStatusBadge`, `handleRemind`, `<PendingInvitations>` embed all byte-identical.

Awaiting approval to ship.
