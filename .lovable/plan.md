## Operations Phase 2 — Charges + composable billing + invoice generation

Additive everywhere except a small change to ProjectFormDialog (fixed-fee removed in favor of charges).

### 1. `src/integrations/supabase/operations-types.ts`
- Add `project_charges` table type (Row/Insert/Update as specified; Relationships: []). `org_id` and `created_by` optional on Insert (DB defaults).
- Extend `document_lines` Row and Insert with `source_charge_ids: string[] | null` (Insert optional).

### 2. `src/integrations/supabase/types.ts` (main public types)
- Add to public `Functions` block:
  ```
  ops_create_invoice_from_project: {
    Args: { p_project: string; p_date_from: string | null; p_date_to: string | null };
    Returns: string;
  }
  ```
  Matches the existing `ops_set_invoice_status` shape.

### 3. `src/pages/operations/ProjectFormDialog.tsx` (modified — fixed fee removed)
- `BillingMethod` becomes `"project_hours" | "task_hours" | "staff_hours" | "none"`.
- `ProjectRecord.fixed_cost_amount` field removed; `FormState.fixed_cost_amount` removed; `emptyState.billing_method` → `"none"`.
- `fromProject`: maps legacy `"fixed"` (or any unknown value) → `"none"`.
- Select: replace `Fixed cost` item with `<SelectItem value="none">No hourly billing</SelectItem>` as the first item; keep `project_hours`, `task_hours`, `staff_hours`.
- Remove the `fixed_cost_amount` Label+Input block. For `billing_method === "none"`, show muted hint: "Fixed fees are added as charges on the project page." Keep existing `project_hourly_rate` block and task/staff hints.
- `handleSubmit` common: drop `fixed_cost_amount`; keep `project_hourly_rate` only for `project_hours`.

### 4. New file `src/pages/operations/AddChargeDialog.tsx`
- Mirror `LogExpenseDialog` structure (sonner, useQueryClient, useEffect open reset, error state).
- Props: `{ open, onOpenChange, projectId, customerId }`.
- Fields: Date (default today, required), Description (required), Amount (number > 0, required), Billable checkbox (default true), Notes textarea.
- Submit: `opsSupabase.from("project_charges").insert({ project_id, customer_id: customerId ?? null, date, description: description.trim(), amount: Number(amount), is_billable, notes: notes.trim() || null })`. No `org_id`/`created_by`.
- Success: `toast.success("Charge added")`, close, invalidate `["ops","project-charges", projectId]`. Error toast. Finally clear submitting.

### 5. `src/pages/operations/OperationsProjectDetail.tsx` (additive)
- Imports: `AddChargeDialog`, `supabase` from `@/integrations/supabase/client` (same import the invoice page uses for `ops_set_invoice_status`), `useNavigate` from `react-router-dom`, `toast` from `sonner`, `Dialog*` primitives, `Input`, `Label`.
- New state: `chargeOpen`, `genOpen`, `generating`, `genFrom`, `genTo`.
- New `chargesQ` (key `["ops","project-charges", id]`): selects `id, date, description, amount, is_billable, is_invoiced, currency_code` ordered by date desc.
- New "Charges" Card placed after the Expenses card. Header has an "Add charge" button (`disabled={!p}`). Rollup line: `Unbilled {formatMoney(sum of amount where is_billable && !is_invoiced, p?.currency_code)} across N charge(s)` computed in-component. Table columns: Date | Description | Amount (right, formatted with row currency) | Billable (Yes/No) | Status (`is_invoiced ? "Invoiced" : "Unbilled"`). Empty: "No charges yet." Loading/empty styles mirror the Time/Expenses cards.
- Top project header card actions: add a "Generate invoice" Button (`disabled={!p}`) that opens a small Dialog with two optional date inputs (From/To) and a Generate button. On Generate:
  ```
  setGenerating(true);
  const { data, error } = await supabase.rpc("ops_create_invoice_from_project", {
    p_project: id, p_date_from: genFrom || null, p_date_to: genTo || null,
  });
  if (error) toast.error(error.message);
  else { toast.success("Draft invoice created"); navigate(`/operations/invoices/${data}`); }
  setGenerating(false); setGenOpen(false);
  ```
- Render `<AddChargeDialog ... />` and the generate Dialog alongside existing dialogs.

### Untouched
Pay Now, Record payment, Send invoice/receipt, lifecycle dropdown, `?paid` handling, invoice line items/totals, Time card + log dialog, Expenses card + log dialog, customer detail, customer time rollup, all `ops_*` RPCs other than the new added one. Existing queries and components keep current behavior.

### Type-check
- The only schema-shape changes are additive (new table type, new field on `document_lines`, new RPC entry, new `"none"` billing method enum value). The removal of `fixed_cost_amount` from `ProjectRecord`/`FormState` is internal to `ProjectFormDialog` — the DB column stays; nothing else in the codebase reads `fixed_cost_amount` from form types. Project detail page still reads `p.fixed_cost_amount` from the raw row (untouched).

Awaiting approval to build.