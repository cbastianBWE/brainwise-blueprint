# PTP Generate-on-Completion + Report Gating Plan

## Goal

Eliminate the 2–3 minute spinner experience on the PTP report by (a) starting narrative generation the moment scoring finishes, and (b) gating the report page on a single readiness signal that shows a "preparing your report" screen until generation lands.

## Architecture decision

Use **fire-and-forget fan-out from `calculate-scores`** wrapped in `EdgeRuntime.waitUntil(...)`, dispatching N parallel child invokes of `generate-facet-interpretations`. Each child runs in its own 150s budget; the parent returns immediately. This follows the existing precedent (`calculate-scores` already fires `generate-report` unawaited) and avoids the 60s minimum latency of `pg_cron`. No new tables, no orchestrator function, no Postgres trigger.

Readiness is tracked with a single new column `assessment_results.narrative_status` (`pending | generating | ready | failed`). One row read instead of 12–18-row `IN(...)` probes; the frontend polls this one value.

## Scope of changes

### 1. Database migration

Add to `assessment_results`:
- `narrative_status text default 'pending'` (values: pending/generating/ready/failed)
- `narrative_started_at timestamptz`
- `narrative_completed_at timestamptz`

No RLS change needed — readers of `assessment_results` already have access.

### 2. `supabase/functions/calculate-scores/index.ts`

After the `assessment_results` insert (~line 295) and before the `generate-report` fire-and-forget block:

- Determine which contexts apply for PTP. Rules:
  - PTP `professional` only → contexts = `['professional']`
  - PTP `personal` only → contexts = `['personal']`
  - PTP `both` → contexts = `['professional', 'personal', 'combined']`
  - Non-PTP instruments → skip narrative fan-out entirely
- Set `narrative_status = 'generating'`, `narrative_started_at = now()` on the new row.
- Build the call list: for each context, three child calls — `generate_context_narrative`, `generate_dimension_highlights`, `generate_cross_and_action`. Plus one per-context call to seed `driving_facets_${ctx}` + `facet_insights_${ctx}` (the path used by `fetchFacets` in `PTPNarrativeSections.tsx:357+`). Total = 4 calls × N contexts (4 for single-context, 12 for `both`).
- Wrap the fan-out in `EdgeRuntime.waitUntil(Promise.allSettled([...fetch(...)]))` so the runtime keeps the background work alive after the parent response is sent. Each `fetch` targets `${SUPABASE_URL}/functions/v1/generate-facet-interpretations` with the service-role key (same pattern as the existing `generate-report` call) and the per-call body.
- On `Promise.allSettled` resolution, update `assessment_results` with `narrative_status = 'ready'` (or `'failed'` if any rejected) and `narrative_completed_at = now()`. Do this inside the `waitUntil`-wrapped promise so it runs after all children resolve.

The parent function still returns the `assessment_result_id` immediately as today.

### 3. Frontend gating in `src/pages/MyResults.tsx`

Around line 1172 (the PTP section render block):

- Add a small hook (or inline `useEffect`) that reads `narrative_status` from `assessment_results` for `effectiveSelected.result.id`, and polls every 3s while status is `pending` or `generating`. Stop polling on `ready` or `failed`.
- Replace the unconditional `<PTPNarrativeProvider>` mount with a three-way render:
  - `generating` / `pending` → "Your report is being prepared" card with a progress indicator (no per-section spinners visible).
  - `failed` → an error card with a "Retry" button that re-invokes `calculate-scores` (or a smaller "regenerate narratives" path — decide during implementation; simplest is a manual retry that re-fires the same fan-out).
  - `ready` → the existing `<PTPNarrativeProvider>{...sections}</PTPNarrativeProvider>` block exactly as today.
- Non-PTP instruments are unaffected (their render path stays in the existing `else` branch around line 1250).

### 4. Self-healing left intact

Do **not** touch `fetchNarrativeSections` or `fetchFacets` in `PTPNarrativeSections.tsx`. They keep their on-demand invoke fallback so that:
- Old `assessment_results` rows with `narrative_status = NULL` still render correctly (treat NULL as `ready` in the gate to preserve back-compat).
- If a child invoke failed at completion time but the user opens the report later, the per-section path will fill the gap on first mount.

## Technical details

```text
Completion flow (PTP both):

AssessmentFlow.submit()
  └─ invoke calculate-scores         [awaited, ~1–2s]
       ├─ insert assessment_results (narrative_status='generating')
       ├─ EdgeRuntime.waitUntil(
       │     Promise.allSettled([
       │       fetch generate-facet-interpretations × 12   (parallel)
       │     ]).then(update narrative_status='ready'|'failed')
       │  )
       └─ return { assessment_result_id }
  └─ navigate('/my-results')

MyResults mount:
  └─ read narrative_status
       ├─ pending|generating → "Preparing your report" + poll every 3s
       ├─ ready              → render PTPNarrativeProvider as today
       └─ failed             → error card with Retry
```

Why parallel and not sequential: each child invoke is its own HTTP request with its own 150s timeout. Anthropic-side concurrency was the cause of the original 500/503 storm only because the *frontend* was firing the same hook 6× per page open (already fixed). 12 server-side parallel calls per assessment completion is bounded and infrequent.

Why `EdgeRuntime.waitUntil` and not bare unawaited `fetch`: the existing `generate-report` call uses bare unawaited `fetch` and works empirically, but it's undocumented behavior. `waitUntil` is the supported API for "keep this promise alive after the response is sent" and prevents the runtime from cancelling the fan-out under load. Falling back to bare `fetch(...).catch(...)` is acceptable if `EdgeRuntime` is undefined in the runtime version (feature-detect with `typeof EdgeRuntime !== 'undefined'`).

Why a status column and not row-counting `facet_interpretations`: one read vs. an `IN(...)` over up to 18 rows; clearer semantics for `failed`; survives partial-cache states where some `_${ctx}` rows exist but generation is still in flight.

Back-compat: treating `narrative_status IS NULL` as `ready` means the gate is invisible for any assessment completed before this change ships.

## Out of scope

- Refactoring `generate-facet-interpretations` itself (no changes to v38).
- Removing the on-demand fetch path in `PTPNarrativeSections.tsx` (kept as self-heal).
- NAI/AIRSA/HSS narrative pipelines (not affected).
- `pg_cron` / `pg_net` routes (rejected: 60s floor and trigger complexity not justified).

## Verification

After implementation:
1. Submit a PTP `both` assessment. Confirm `narrative_status` flips `generating → ready` within ~30–60s without the user touching the report page.
2. Open `/my-results` immediately after submit on a slow assessment — confirm the "preparing" card renders and auto-replaces with the report when polling sees `ready`.
3. Open an old PTP report (pre-migration row with `narrative_status = NULL`) — confirm it renders normally with the existing on-demand path.
4. Force a child-invoke failure (temporarily break one body) — confirm `failed` state renders the retry card and the on-demand fetch in `fetchNarrativeSections` still self-heals when the user clicks into the report.
