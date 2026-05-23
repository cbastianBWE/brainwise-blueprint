# Phase 10 Round 7a — Coach surfaces polish plan

Two files only. Pure additive polish: error states with Retry, Loader2 a11y, decorative-icon `aria-hidden`, and one mobile-overflow wrapper. Zero behavioral / SQL / logic changes.

## Files touched (exhaustive)

1. `src/pages/coach/ClientResults.tsx`
2. `src/pages/coach/CoachInvoices.tsx`

No other files. No backend, no new deps, no new components, no token/theme edits.

---

## File 1: `src/pages/coach/ClientResults.tsx`

### Import edit (L9)
Extend the existing lucide-react import to add `AlertCircle`. No other import changes.

### Change 1 — `ClientList` (L83–193)
Apply Shape A:
- Add `const [error, setError] = useState<string | null>(null);` alongside existing `loading` / `clients` / `search` state.
- Extract the current useEffect IIFE (L94–128) into a `fetchClients` async callback inside the component. SQL bodies (`coach_clients` select, `users` select) preserved byte-identical; add the two missing `error:` destructures and throw on them; wrap whole thing in try/catch/finally setting the new error state.
- `useEffect(() => { fetchClients(); }, [coachUserId]);`
- Replace loading block (L130–136) — add `role="status"` and `aria-label="Loading clients"` on `<Loader2 />`.
- Insert error-state block before `const q = search.toLowerCase()` (L138): `<AlertCircle />` + message + outline Retry button calling `fetchClients`, wrapped in the standard `p-6 max-w-3xl mx-auto` page shell with the page H1.
- Add `aria-hidden="true"` to decorative `<Search />` (L150) and `<User />` (L177).

### Change 2 — `AssessmentList` (L197–404)
Same Shape A:
- Add `error` state.
- Extract useEffect body (L212–355) into `fetchAssessments`. All queries preserved verbatim (`users` clientData, `assessment_results` two branches, `coach_clients` linked, `instruments`, `assessments` meta). Add missing `error:` destructures and throws. Wrap in try/catch/finally.
- Replace loading block (L357–363) with Loader2 + `role="status"` + `aria-label="Loading assessments"`.
- Insert error-state block immediately after: includes the Back-to-clients button (with `aria-hidden` on its ArrowLeft), AlertCircle, message, Retry calling `fetchAssessments`.
- Add `aria-hidden="true"` to decorative `<ArrowLeft />` (L368) and `<FileText />` (L386).

### Change 3 — `CoachResultsView` (L408–483)
- Add `const [permError, setPermError] = useState<string | null>(null);` alongside `permissionLevel` / `permLoading`.
- Extract IIFE (L425–453) into `resolvePermission`. Both queries inside (coach_clients with the `.or()` clause + `.maybeSingle()`, then permissions fallback with `.maybeSingle()`) preserved exactly; add `error:` destructures + throws; wrap in try/catch/finally.
- Replace loading block (L456–462) — Loader2 with `role="status"` + `aria-label="Loading client results"`.
- Insert error-state block immediately after: Back button (navigate(-1), ArrowLeft `aria-hidden`), AlertCircle, message, Retry calling `resolvePermission`.
- Add `aria-hidden="true"` to decorative `<ArrowLeft />` (L472).

### Verbatim-preservation blocks (confirmed, NOT modified)
- **L309–347** — paired-PTP mutually-paired collapse loop (`for (const e of rawEntries)` … through pushing the grouped entry, the `grouped.sort` follows at L347-ish). Load-bearing §118 logic, untouched apart from being inside the extracted `fetchAssessments` callback.
- **L422–454 query bodies** — permission resolver `coach_clients` `.or(...).maybeSingle()` then `permissions` `.eq().eq().maybeSingle()` fallback chain, including ordering. Untouched apart from being inside `resolvePermission` and gaining error destructures + throws (no logic change).
- **L474–480** — `<MyResults isCoachView targetUserId={userId} preSelectedAssessmentId={assessmentId} coachUserId={coachUserId} permissionLevel={permissionLevel} />` embed and props. Untouched.

---

## File 2: `src/pages/coach/CoachInvoices.tsx`

### Import edit (L13)
Extend lucide-react import to add `Loader2, AlertCircle`. No other import changes.

### Change 1 — Shape A extraction + error state
- Add `const [error, setError] = useState<string | null>(null);` next to existing `loading`.
- Extract useEffect body (L45–130) into `fetchTransactions` callback. The `coach_clients` select gets its existing `error: rowsError` check kept; all subsequent code (instrument-name lookup, name-by-email lookup, grouped construction, txList map, sort, setTransactions) inside the try block byte-identical. Add try/catch/finally with error-state assignment.
- `useEffect(() => { fetchTransactions(); }, [user]);`

### Change 2 — Loading/empty render ladder (L377–417 region)
Replace the two-branch (loading / filter-empty) ladder with the four-branch ladder per spec:
1. `loading` → `<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" role="status" aria-label="Loading transactions" />`
2. `error` → AlertCircle + message + Retry button calling `fetchTransactions`
3. `transactions.length === 0` → "No transactions yet. Orders you place for clients will appear here."
4. `filtered.length === 0` → "No transactions match your filters."
5. else → existing `<Table>` (wrapped per Change 3)

### Change 3 — Mobile overflow wrapper
Wrap the existing `<Table>…</Table>` element (and only that element) in `<div className="overflow-x-auto">…</div>`. No table-cell, column-width, badge, or content changes.

### Change 4 — Decorative icon `aria-hidden="true"`
Add `aria-hidden="true"` to: `<Search />` L302, `<X />` L326 (Clear Filters), `<Download />` L335 (Export All), `<Download />` L369 (Export Range), `<FileText />` L406 (View Receipt), `<Download />` L409 (Export PDF row).

### Verbatim-preservation blocks (confirmed, NOT modified)
- **L25** `PRICE_PER_INSTRUMENT = 29.99`.
- **L62–128 fetch body** — instrumentMap build (`instruments.forEach`), nameMap build (`users.forEach`), `grouped` object construction, `txList = Object.values(grouped).map(...)`, `txList.sort(...)` by `created_at` desc. Untouched logic; only relocated inside `fetchTransactions` try block with error-state shell around it.
- **L132–152** `filtered` useMemo.
- **L154–157** `uniqueClients` useMemo.
- **L167–225** `generatePdf` function.
- **L227–275** `exportSinglePdf` function.
- **L277–291** `statusBadge` function (§120 forest/teal colors kept).
- **L422–458** Receipt modal Dialog rendering.

---

## Items flagged (NOT implementing — flagging only)
None. The spec is self-contained; every change fits cleanly into the Shape A / a11y / overflow patterns. No additional changes proposed.

## Confirmation
- Exactly two files in the diff: `src/pages/coach/ClientResults.tsx`, `src/pages/coach/CoachInvoices.tsx`.
- No other files touched (no `CoachClients.tsx`, no shared components, no tokens, no migrations).
- No new dependencies, no new shadcn primitives.
- No business logic, SQL, PDF, grouping, filter, sort, or permission-resolver logic changes.
- All listed verbatim-preservation blocks remain byte-identical inside the extracted callbacks.

Awaiting approval to ship.