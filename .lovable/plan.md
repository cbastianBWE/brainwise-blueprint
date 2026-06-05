## Plan: Add Payments card with Stripe refund to OperationsInvoiceDetail

Single-file additive edit to `src/pages/operations/OperationsInvoiceDetail.tsx`. No other files touched. Matches existing patterns (`supabase.rpc`, `supabase.functions.invoke`, `readFunctionsErrorMessage`, `toast`, `invalidateInvoice()`, query key shape).

### Changes

1. **Imports** — add the missing ones:
   - `Input` from `@/components/ui/input`
   - `Label` from `@/components/ui/label`
   - `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from `@/components/ui/dialog`

2. **New query** alongside `invoiceQ` / `customerQ` / `linesQ`:
   - `paymentsQ` keyed `["ops", "invoice-payments", id]`, calls `supabase.rpc("ops_list_invoice_payments" as any, { p_invoice: id })`.

3. **New state** alongside existing `useState` calls:
   - `refundPayment` (selected payment row | null)
   - `refundAmount` (string input)
   - `refunding` (boolean)

4. **Cache invalidation**:
   - Inside `invalidateInvoice()` add `qc.invalidateQueries({ queryKey: ["ops", "invoice-payments", inv.id] })`.
   - Inside the existing `?paid=1` effect, after the line that invalidates `["ops","invoice", id]`, also invalidate `["ops","invoice-payments", id]`.

5. **New handlers** next to `handlePayNow` / `handleMarkSent`:
   - `openRefund(p)` — seeds `refundPayment` and prefills `refundAmount` from `p.refundable_amount`.
   - `handleRefund()` — validates `amt > 0` and `amt <= refundable_amount`, calls `supabase.functions.invoke("ops-issue-refund", { body: { payment_id, amount } })`, surfaces errors with `readFunctionsErrorMessage`, toasts success, closes dialog, calls `invalidateInvoice()`. Wrapped with `setRefunding(true/false)`.

6. **Payments Card** rendered immediately after the "Line items" Card and before `<RecordPaymentDialog />`:
   - Header "Payments".
   - Loading / empty states mirroring the Line items card.
   - `Table` with columns: Date, Method (underscores → spaces), Amount, Refunded (or "—"), Actions.
   - Actions cell shows a `Refund` button only when `p.is_stripe && Number(p.refundable_amount) > 0`, calling `openRefund(p)`.
   - Uses existing `formatDate`, `formatMoney`, and `currency`.

7. **Refund Dialog** added next to the existing `AlertDialog`:
   - Controlled by `refundPayment !== null`; closing resets `refundPayment` to null.
   - Shows refundable balance, a `Label` + numeric `Input` bound to `refundAmount`, helper text noting Stripe confirms asynchronously.
   - Footer: Cancel (disabled while refunding) and "Issue refund" (disabled while refunding, shows "Refunding…").

### Out of scope
No changes to scoring, saving, navigation, other queries/RPCs, status logic, or any other file. `ops_list_invoice_payments` RPC and `ops-issue-refund` edge function are assumed to exist (referenced via `as any`, matching existing style).
