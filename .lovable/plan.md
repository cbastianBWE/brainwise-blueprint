# Statement of Account PDF + Statement tab wiring

Two files touched. No backend, RPC, dependency, or other-page changes.

## Part A — `src/lib/operations/documentPdf.ts` (append only)

Keep all existing exports and the module-private helpers (`hexToRgb`, `fetchLogoDataUrl`, `addressLines`, `money`, `fmtDate`, `NAVY`, `ORANGE`) intact. Append:

### `StatementData` type
Matches the shape returned by `ops_customer_statement`:
- `customer`: `{ display_name, legal_name, email, billing_address, currency_code }`
- `from: string|null`, `to: string|null`, `unpaid_only: boolean`
- `opening_balance: number|null`, `closing_balance: number`, `total_outstanding: number`
- `transactions[]`: `{ date, type, number|null, description|null, debit, credit, balance }`
- `open_invoices[]`: `{ invoice_number, issue_date|null, due_date|null, total_amount, balance_due, status }`

### `generateStatementPdf({ branding, statement }) → Blob`
Lazy `import("jspdf")`, letter portrait, margin 48, currency from `statement.customer.currency_code`.

Header (mirrors "standard" template branch):
- `fetchLogoDataUrl(branding.logo_url)` drawn top-left.
- Right side: brand-colored bold "Statement of Account" title via `hexToRgb(branding.brand_color)`.
- Accent-colored 2pt rule under the header.
- Company block (left) from `branding` via `addressLines(branding.address)` + email/phone/website/tax_id, identical to the standard template.

Sub-header:
- Date range line: `"From {fmtDate(from)} to {fmtDate(to)}"`, or `"As of {fmtDate(to)}"` when `from` is null.
- "BILL TO" block from `statement.customer` (display_name || legal_name, `addressLines(billing_address)`, email).

Body when `unpaid_only === false`:
- "Opening balance" line right-aligned, `money(opening_balance, currency)`.
- Ledger table — columns: Date / Type (capitalize first letter) / Reference (=`number`) / Debit / Credit / Balance. Blank when debit/credit is 0. Header band uses the standard template's `[241,241,241]` fill with navy text. Page-break loop identical to `generateDocumentPdf`'s line table (re-draw header on overflow).
- "Closing balance" line.

Body always (and the only body when `unpaid_only === true`):
- "Open Invoices" table — columns: Invoice # / Issue date / Due date / Total / Balance due / Status. Same header style and pagination as the ledger.
- "Total outstanding" line, bold, brand-colored, right-aligned.

Footer: same one-liner as `generateDocumentPdf` — gray 8pt `branding.legal_name || branding.name` at `H - 24`.

### `downloadStatementPdf(args, filename) → Promise<void>`
Identical blob → anchor → click → revoke pattern as `downloadDocumentPdf`.

## Part B — `src/pages/operations/OperationsCustomerDetail.tsx` (Statement tab only)

Leave every other tab, query, dialog, helper, and the v5 object-form `invalidateQueries` calls untouched.

### Imports
Add `downloadStatementPdf` from `@/lib/operations/documentPdf` and `Switch` from `@/components/ui/switch`.

### New query
`orgBrandingQ` with key `["ops","org-branding"]`:
`opsSupabase.from("organizations" as any).select("*").maybeSingle()`.

### New state (added with the other `useState` calls, above any early return)
- `stmtFrom: string` (default `""`)
- `stmtTo: string` (default today's local date `YYYY-MM-DD` built from `getFullYear()` / `getMonth()+1` / `getDate()` with zero-padding — never `toISOString`)
- `stmtUnpaidOnly: boolean` (default `false`)
- `stmtData: any` (default `null`)
- `stmtLoading: boolean` (default `false`)

### Statement tab content (replaces the placeholder)
Controls row:
- "From" date input bound to `stmtFrom`.
- "To" date input bound to `stmtTo`.
- `Switch` labeled "Unpaid invoices only" bound to `stmtUnpaidOnly`.
- "Generate" button: sets `stmtLoading=true`, calls `supabase.rpc("ops_customer_statement" as any, { p_customer_id: id, p_from: stmtFrom || null, p_to: stmtTo || null, p_unpaid_only: stmtUnpaidOnly })`. On error `toast.error(error.message)`. On success `setStmtData(data)`. Finally clears loading.
- "Download PDF" button, `disabled` until `stmtData` exists, calls `downloadStatementPdf({ branding: (orgBrandingQ.data ?? {}) as any, statement: stmtData }, \`Statement-${c?.display_name ?? "customer"}.pdf\`)`.

Inline render when `stmtData` is present (uses `formatMoney(..., stmtData.customer?.currency_code || cur)`):
- If `!stmtData.unpaid_only`: "Opening balance" line, ledger Table (Date / Type / Reference / Debit / Credit / Balance from `stmtData.transactions`), "Closing balance" line. Empty debit/credit cells when value is 0.
- Always: "Open Invoices" Table (Invoice # / Issue date / Due date / Total / Balance due / Status from `stmtData.open_invoices`, Status via `StatusBadge`), then "Total outstanding" line.

All in one Card matching the visual style of other tabs.

## Out of scope
- No backend, RPC, or other operations pages.
- No new dependencies (jsPDF is already used).
- No changes to existing exports in `documentPdf.ts`.
