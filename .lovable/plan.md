# Operations Phase 2 — Expenses

Additive only. No existing query, type, or component behavior is changed. Uses the typed `opsSupabase` client. Mirrors the patterns in `LogTimeDialog.tsx` and `TaskFormDialog.tsx` (sonner toasts, `useQuery` + `useQueryClient.invalidateQueries`, `useEffect` reset on open, local `error` state).

Backend is already in place: `operations.expenses`, `operations.expense_categories` (DB defaults populate `org_id` + `created_by`), private storage bucket `operations-receipts` with org-path-scoped RLS, and 6 seeded active categories.

## 1. `src/integrations/supabase/operations-types.ts`

Two surgical edits, nothing else touched:

- `expenses.Insert` → change `org_id: string` to `org_id?: string`.
- `expense_categories.Insert` → change `org_id: string` to `org_id?: string`.

`Row` and `Update` left alone for both tables. DB defaults populate the field.

## 2. New file `src/pages/operations/LogExpenseDialog.tsx`

Props: `{ open, onOpenChange, projectId, customerId }`.

**Org resolution (on open):**
```ts
const { data: auth } = await opsSupabase.auth.getUser();
const { data: u } = await opsSupabase.from("users")
  .select("org_id").eq("id", auth.user.id).maybeSingle();
setOrgId(u?.org_id ?? null);
```

**Queries (enabled when open):**
- `["ops","expense-categories"]` → `expense_categories.select("id, name").eq("is_active", true).order("name")`.

**State (reset on open):** `date` (today YYYY-MM-DD), `expense_category_id` (""), `is_mileage` (false), `amount`, `miles_driven`, `per_mile_rate`, `vendor_name`, `is_billable` (false), `markup_percentage`, `notes`, `receiptFile: File|null`, `submitting`, `error`.

**Layout:**
- Row 1 (2-col grid): Date input. Amount input — hidden when `is_mileage` is on; replaced by read-only computed Amount = `miles*rate` below the mileage inputs.
- Mileage checkbox; when on, show Miles + Per-mile rate inputs (and the computed read-only Amount).
- Category Select; first item "No category" maps to "".
- Vendor input.
- Billable checkbox; when on, show Markup % input.
- Receipt file input (`accept="image/*,application/pdf"`).
- Notes textarea.
- `DialogFooter` Cancel / Submit.

**Validation:**
- `date` required.
- If `is_mileage`: `miles_driven` and `per_mile_rate` finite > 0; amount = miles × rate.
- Else: `amount` finite > 0.

**Submit:**
```ts
let receipt_storage_path: string | null = null;
if (receiptFile && orgId) {
  const safe = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/${crypto.randomUUID()}-${safe}`;
  const up = await opsSupabase.storage
    .from("operations-receipts").upload(path, receiptFile);
  if (up.error) throw up.error;
  receipt_storage_path = path;
}
const { error } = await opsSupabase.from("expenses").insert({
  project_id: projectId,
  customer_id: customerId ?? null,
  date,
  expense_category_id: expense_category_id || null,
  vendor_name: vendor_name.trim() || null,
  amount: Number(amount),
  is_billable,
  markup_percentage: is_billable && markup_percentage.trim()
    ? Number(markup_percentage) : null,
  is_mileage,
  miles_driven: is_mileage ? Number(miles_driven) : null,
  per_mile_rate: is_mileage ? Number(per_mile_rate) : null,
  receipt_storage_path,
  notes: notes.trim() || null,
});
```
No `org_id` or `created_by` passed.

- Success: `toast.success("Expense logged")`, close, invalidate `["ops","project-expenses", projectId]` and `["ops","project-expense-rollup", projectId]`.
- Error: `toast.error(err?.message ?? "Failed to log expense")`.
- `finally`: clear `submitting`.

## 3. `src/pages/operations/OperationsProjectDetail.tsx` — additive only

- Import `LogExpenseDialog`.
- Add `const [logExpenseOpen, setLogExpenseOpen] = useState(false);`.
- Add a new "Expenses" Card after the Time card with:
  - **Rollup query** `["ops","project-expense-rollup", id]`:
    ```ts
    opsSupabase.from("unbilled_expenses")
      .select("unbilled_amount, expense_count")
      .eq("project_id", id).maybeSingle()
    ```
    Line: `Unbilled {formatMoney(unbilled_amount||0, p?.currency_code)} across {expense_count||0} expense(s).`
  - **Header button** "Log expense" (`disabled={!p}`, opens dialog).
  - **Entries query** `["ops","project-expenses", id]`:
    ```ts
    opsSupabase.from("expenses").select(
      "id, date, amount, is_billable, is_invoiced, vendor_name, is_mileage, currency_code, expense_categories(name)"
    ).eq("project_id", id).order("date", { ascending: false })
    ```
    Columns: Date, Category (`row.expense_categories?.name ?? "—"`), Vendor (`vendor_name ?? "—"`), Amount (right-aligned, `formatMoney(amount, currency_code)`), Billable (Yes/No), Status (`is_invoiced ? "Invoiced" : "Unbilled"`). Empty: "No expenses yet." Loading/empty styles match the Time card.
- Render `<LogExpenseDialog open={logExpenseOpen} onOpenChange={setLogExpenseOpen} projectId={id} customerId={p?.customer_id} />` alongside the existing dialogs.

## Untouched

Pay Now, Record payment, lifecycle dropdown, Send invoice/receipt, time logging, customer time rollup, customer detail page, invoice queries, line items, totals, and all `ops_*` RPCs. Only the two `Insert` types are loosened (additive — pre-existing inserts that already pass `org_id` continue to type-check).

## Files

- edit `src/integrations/supabase/operations-types.ts`
- create `src/pages/operations/LogExpenseDialog.tsx`
- edit `src/pages/operations/OperationsProjectDetail.tsx`
