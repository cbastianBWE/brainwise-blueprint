## Operations Reports page

Three additive changes; no existing behavior touched.

### 1. New file: `src/pages/operations/OperationsReports.tsx`
Create the page exactly as provided in the user message. It:
- Defines 4 report configs (`invoice_details`, `payments_received`, `time_tracking`, `project_profitability`) pointing at operations-schema views/rollup (`report_invoices`, `report_payments`, `report_time`, `project_financials_rollup`).
- Uses `opsSupabase` (cast `as any`) to select from the view, with optional `gte`/`lte` date filtering and default sort.
- Renders Card-based Filters (Report select, From/To date inputs when applicable, Columns dropdown to toggle visibility, CSV export button) and a Card with a `Table` of results using `formatMoney`/`formatDate` from `./_shared`.
- CSV export builds a quoted CSV client-side and triggers a Blob download for currently visible columns.

### 2. Edit: `src/App.tsx`
- Add `import OperationsReports from "./pages/operations/OperationsReports";` next to the other operations page imports.
- Add a `<Route path="/operations/reports" element={<OperationsReports />} />` (wrapped in the same guards the sibling operations routes use) inside the Operations route block.

### 3. Edit: `src/components/AppSidebar.tsx`
- In `superAdminNav`, immediately after the `Recurring invoices` entry, insert:
  `{ title: "Reports", url: "/operations/reports", icon: BarChart3 },`
- `BarChart3` is already imported (confirmed).

### Notes / assumptions
- Backing views (`report_invoices`, `report_payments`, `report_time`, `project_financials_rollup`) are assumed to already exist in the operations schema; the page uses `as any` casts consistent with other operations pages, so no types regen is required.
- No database migrations, edge functions, or other files are modified.
- I will preserve the exact JSX structure from the provided snippet (the prompt's quoted code shows some characters stripped by the chat renderer; the implemented file will be valid TSX matching the described UI).
