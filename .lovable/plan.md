# Steps 6–9: Coach free-attempt gate + entitlement_source tagging

Frontend-only. Backend already shipped (migrations + webhook v27 + RPC + trigger). Three files.

## 1. `src/components/assessment/InstrumentSelection.tsx`

### 1a. Filter coach-bought rows (line 101)

Add `.is("coach_client_id", null)` to the `assessment_purchases` query in the `Promise.all` block.

### 1b. Load cert pool

Add to the same `Promise.all`:
```ts
supabase.from("coach_certifications")
  .select("certification_type, status, free_assessment_uses, free_uses_expire_at")
  .eq("user_id", user.id)
  .in("status", ["in_progress", "certified"]),
```

New state slot near line 87:
```ts
const [freeCertPoolInstrumentIds, setFreeCertPoolInstrumentIds] = useState<Set<string>>(new Set());
```

After the query resolves, compute eligible INST codes (mirrors trigger branch (b) eligibility OR-clause exactly):
```ts
const eligible = new Set<string>();
const now = Date.now();
for (const cert of certsRes.data ?? []) {
  if (cert.free_uses_expire_at && new Date(cert.free_uses_expire_at).getTime() <= now) continue;
  const uses = (cert.free_assessment_uses ?? {}) as Record<string, number>;
  const has = (code: string) => (uses[code] ?? 0) > 0;
  const ct = cert.certification_type;
  if (ct === "ptp_coach" && has("INST-001")) eligible.add("INST-001");
  if (["ai_transformation_coach","ai_transformation_ptp_coach","my_brainwise_coach"].includes(ct)) {
    if (has("INST-002")) eligible.add("INST-002");
    if (has("INST-003")) eligible.add("INST-003");
    if (has("INST-004")) eligible.add("INST-004");
  }
  if (["ai_transformation_ptp_coach","my_brainwise_coach"].includes(ct) && has("INST-001")) {
    eligible.add("INST-001");
  }
}
setFreeCertPoolInstrumentIds(eligible);
```

### 1c. Props + handleSelect signature

Add `EntitlementSource` type alias; extend `Props.onSelect` with optional `entitlementSource`. Extend `handleSelect` with third arg `entitlementSource?: EntitlementSource`; spread into payload only when defined.

### 1d. Cert-pool branch in render

In the per-card render, after `const actorDebrief = ...`:
```ts
const hasFreeCertPool = freeCertPoolInstrumentIds.has(inst.instrument_id);
```

Insert between `purchaseAccess` (ends line 477) and `actorDebrief` (starts line 478):
```tsx
} else if (hasFreeCertPool) {
  buttonContent = (
    <Button className="w-full" onClick={() => handleSelect(inst, undefined, 'free_cert_pool')}>
      {isInProgress ? "Continue Assessment" : "Start Assessment (Coach Cert)"}
    </Button>
  );
}
```
No PTP context 3-way (cert-pool doesn't track half-completion via `ptpContextProgress`; `isInProgress` covers resume).

### 1e. Update hover className (line 516)

Append `|| hasFreeCertPool` to the `hover:shadow-md` condition.

### 1f. Tag every existing branch

| Branch | Third arg to handleSelect |
|---|---|
| `canBypassAssessmentPaywall` | omit (super admin) |
| `isCorp` | omit (corporate-funded) |
| `subscriptionAccess` | `'paid_purchase'` |
| `coachPaid` (all 3 PTP sub-cases) | `'coach_paid_client'` |
| `purchaseAccess` (all 3 PTP sub-cases) | `'paid_purchase'` |
| `hasFreeCertPool` | `'free_cert_pool'` |
| `actorDebrief` | `'coach_paid_client'` + inline comment |
| `selfPayCoachInvited` default (Stripe dialog) | omit — checkout will trigger fresh start via autostart path; tag set there |
| `selfPayCoachInvited` PTP continuation cases | `'self_pay_coach_invite'` |
| else (pricing nav) | n/a |

Inline comment above the `actorDebrief` branch:
```ts
// Note: 'coach_paid_client' here conflates the actor-debrief case with the
// coach-paid-client-invite case. Both share the same entitlement story:
// the coach's pool was already decremented at order time, so the trigger
// must not re-decrement on completion. Split into a dedicated enum value
// later if per-source analytics are needed.
```

## 2. `src/pages/Assessment.tsx`

Add state near line 44:
```ts
const [entitlementSource, setEntitlementSource] = useState<
  'free_cert_pool' | 'paid_purchase' | 'coach_paid_client' | 'self_pay_coach_invite' | null
>(null);
```

Update `<InstrumentSelection onSelect>` to capture `payload.entitlementSource`.

Pass `entitlementSource={entitlementSource}` to `<AssessmentFlow>`. Reset to `null` in `onExit`.

The post-payment autostart `useEffect` (lines 79–106): set `entitlementSource` to `'paid_purchase'` when autostart fires (the user just paid via Stripe checkout).

EPN (`handleStartEpn`) and manager AIRSA (`handleStartManagerAirsa`) paths: do **not** set `entitlementSource`. Leave null.

## 3. `src/components/assessment/AssessmentFlow.tsx`

### 3a. Props

Add to `Props` interface (line 41):
```ts
entitlementSource?: 'free_cert_pool' | 'paid_purchase' | 'coach_paid_client' | 'self_pay_coach_invite' | null;
```
Destructure on line 56.

### 3b. Phase 1 init (resume path)

After `setAssessmentId(candidateId)` on line 117, fire-and-forget atomic UPDATE — only writes if currently NULL. Skip when EPN or manager:
```ts
if (entitlementSource && !epnAssignmentId && raterType !== 'manager') {
  supabase
    .from("assessments")
    .update({ entitlement_source: entitlementSource })
    .eq("id", candidateId)
    .is("entitlement_source", null)
    .then(({ error }) => {
      if (error) console.error("Failed to stamp entitlement_source on resume (non-fatal):", error);
    });
}
```

### 3c. handleAcknowledgmentConfirm (fresh start)

After `setAssessmentId(newId)` on line 159, inside the try, before the catch — fire-and-forget unconditional UPDATE (row was just created, guaranteed NULL). Skip when EPN or manager:
```ts
if (entitlementSource && !epnAssignmentId && raterType !== 'manager') {
  supabase
    .from("assessments")
    .update({ entitlement_source: entitlementSource })
    .eq("id", newId)
    .then(({ error }) => {
      if (error) console.error("Failed to stamp entitlement_source (non-fatal):", error);
    });
}
```

Best-effort. Failure mode: trigger branch (b) won't decrement pool → user gets a free attempt without pool drain. Favors the user; acceptable.

## Verification after merge

- Cheryl (certified PTP coach, pool=0, 2 coach-bought purchases): all 4 cards → paywall. No "Start" on PTP.
- Patrice (new PTP coach, INST-001:6): INST-001 → "Start Assessment (Coach Cert)". INST-002/003/004 → paywall.
- Patrice completes PTP via cert pool → `coach_certifications.free_assessment_uses['INST-001']` drops from 6 to 5. Re-visit `/assessment` confirms.
- Brand-new individual base tier: all 4 → paywall (unchanged).
- Subscribed individual: subscriptionAccess fires first, `entitlement_source='paid_purchase'` stamped.
- `consume_assessment_purchase` continues to no-op when user has no self-redeemable rows (coach-bought rows now correctly excluded by RPC).
