Edit only `src/pages/operations/OperationsInvoiceDetail.tsx`:

1. Imports: add `Checkbox` from `@/components/ui/checkbox`; add `DialogDescription` to existing dialog import.
2. New state near other `useState`s: `sendOpen` (bool), `attachReceipts` (bool).
3. New `useQuery` `["ops","invoice-expense-receipts", inv?.id]`, `enabled: sendOpen && !!inv?.id`, calling `supabase.rpc("ops_get_invoice_expense_receipts", { p_invoice: inv.id })`; derive `receiptCount`.
4. "Send invoice to customer" `DropdownMenuItem` now opens dialog (resets `attachReceipts` to false) instead of calling send directly.
5. In `handleSendInvoice`:
   - Change `operations-documents` upload from `opsSupabase.storage` to `supabase.storage` (no other changes to upload).
   - Add `include_expense_receipts: attachReceipts` to `ops-invoice-send` invoke body.
   - On success also `setSendOpen(false)`.
6. Add new `<Dialog>` at bottom of JSX (near other dialogs) with title, description (mentions customer email if present), conditional checkbox showing receipt count, Cancel + Send buttons. Send button calls `handleSendInvoice()`; dialog disables close while `sending`.

No changes to `handleSendReceipt` or any other handler/file.
