# Phase 3 — Estimates + public pages

Additive frontend work. Backend RPCs/edge functions are already deployed and verified. No DB changes. Six prompts, executed in order.

## Client rules (already enforced in the project)
- `opsSupabase` (operations schema) for table reads on `estimates`, `document_lines`, `customers`, `items`.
- Default `supabase` client for public-schema RPCs (`supabase.rpc("name" as any, …)`) and `supabase.functions.invoke(...)`.

## 1. `src/pages/operations/_shared.tsx`
Add four keys to `STATUS_CLASSES`: `accepted`, `declined`, `invoiced`, `expired` (exact Tailwind classes from spec). No other edits.

## 2. `src/pages/operations/EstimateForm.tsx` (new) + routes
Mirror `InvoiceForm.tsx` with these deltas only:
- Header state drops `due_date`, `payment_terms_days`, `shipping_amount`; adds `expiration_date`.
- UI: replace Due/Terms inputs with a single Expiration date input. Drop Shipping from totals card.
- Total preview: `subtotal − discount + adjustment`.
- Edit prefill: `opsSupabase.from("estimates")` + `document_lines` with `document_type='estimate'`.
- Submit: `ops_create_estimate` / `ops_update_estimate` via default `supabase.rpc(... as any)`.
- Titles "New estimate"/"Edit estimate"; breadcrumb "Operations · Estimate".
- Invalidate keys: `["ops","estimates","list"]`, `["ops","estimate",id]`, `["ops","customer-estimates",customerId]`.
- Navigate to `/operations/estimates/{id}` on success.

`src/App.tsx`: import `EstimateForm`, add `/operations/estimates/new` and `/operations/estimates/:id/edit` inside the operations block (wrapped with `RoleGuard["brainwise_super_admin"]` + `SuperAdminSessionProvider`), `/new` before `/:id`.

## 3. `src/pages/operations/OperationsEstimates.tsx` (new) + route + sidebar
Mirror `OperationsInvoices.tsx` swapping to estimates table. Columns: Number, Customer, Status (`StatusBadge`), Issue date, Expiration date, Total. Row click → `/operations/estimates/{id}`. "New estimate" button → `/operations/estimates/new`. Query key `["ops","estimates","list"]`.

`src/App.tsx`: route `/operations/estimates` placed just before `/operations/estimates/new`.

`src/components/AppSidebar.tsx`: in `superAdminNav`, add `{ title: "Estimates", url: "/operations/estimates", icon: FileText }` directly after the existing Invoices item (matches existing icon style).

## 4. `src/pages/operations/OperationsEstimateDetail.tsx` (new) + route
Mirror `OperationsInvoiceDetail.tsx`. Reads via `opsSupabase`. Totals: Subtotal/Tax/Total only. Header subline "Issued … · Expires …".

Buttons / Actions dropdown:
- **Edit** when status `draft`|`sent` → `/operations/estimates/{id}/edit`.
- **Convert to invoice** primary button when status `accepted`|`sent`|`viewed` (not `invoiced`): `supabase.rpc("ops_convert_estimate_to_invoice" as any, { p_estimate: id })`, navigate to new invoice with success toast.
- Dropdown items (all gated by status):
  - "Send to customer" (not invoiced/declined/expired): `supabase.functions.invoke("ops-estimate-send", { body: { estimate_id: id } })` with `readFunctionsErrorMessage` helper.
  - "Mark as sent" (draft): `ops_set_estimate_status` with `mark_sent`.
  - "Mark accepted" / "Mark declined" / "Mark expired" (sent|viewed): each behind an `AlertDialog` confirm, calling `ops_set_estimate_status` with respective action.
- No clone/payment/pay-now/delete.

Reuse helpers and AlertDialog pattern from invoice detail. Invalidate `["ops","estimate",id]` + `["ops","estimates","list"]`.

`src/App.tsx`: route `/operations/estimates/:id` placed AFTER `/operations/estimates/:id/edit`.

## 5. `src/pages/public/PublicInvoicePay.tsx` (new) — `/pay/:token`
Standalone unauthenticated page. No AppLayout. Centered card, BrainWise wordmark.
- `useEffect`: inject `<meta name="robots" content="noindex,nofollow">` on mount, remove on unmount.
- Fetch via `supabase.rpc("ops_get_public_document_by_token" as any, { p_token })`; null or wrong type → invalid card.
- Render org name, "Invoice {number}", customer name, read-only line table, Subtotal/Tax/Total/Amount paid/Balance due (`formatMoney` with currency_code).
- If `balance_due > 0` and status not paid/void/written_off: "Pay now" button → `supabase.functions.invoke("ops-public-invoice-checkout", { body: { token } })` → `window.location.href = url`. Spinner/disabled while loading; show error on failure.
- If paid: "This invoice is paid in full".
- Query params: `?paid=1` success toast + re-fetch; `?canceled=1` info banner; then `navigate(pathname, { replace:true })`.

`src/App.tsx`: route `/pay/:token` in the top public block (outside `ProtectedRoute`).

## 6. `src/pages/public/PublicEstimateRespond.tsx` (new) — `/estimate/:token`
Same shell + noindex treatment as #5.
- Fetch same RPC; null or wrong type → invalid card.
- Render org, "Estimate {number}", customer, line table, Subtotal/Tax/Total, notes_to_customer, terms_and_conditions, expiration_date.
- Status-driven actions:
  - `sent`/`viewed`: **Accept** and **Decline** buttons. Decline reveals optional reason `Textarea`. Calls `ops_accept_estimate_by_token` / `ops_decline_estimate_by_token`; switch to thank-you/declined state on `ok:true`, show error on `ok:false`.
  - `accepted` / `declined` / `invoiced` / `expired`: respective static message.
- Token read flips sent→viewed server-side.

`src/App.tsx`: route `/estimate/:token` in top public block.

## Out of scope
Delete-draft-estimate, PDF export, partial accept, sitemap entries — public pages stay `noindex`.

## Verification per ship
Type-check clean. Client split respected. Route order: `/new` before `/:id`, public routes outside `ProtectedRoute`. No edits to invoice files beyond `_shared.tsx`.
