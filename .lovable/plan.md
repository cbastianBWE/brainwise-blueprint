# CSV Import Wizard

Add a generic CSV import flow for Customers and Items, reusing existing UI primitives. No backend changes.

## 1. Dependencies
- Add `papaparse` and `@types/papaparse`.

## 2. New file: `src/pages/operations/OperationsImport.tsx`
Single-page wizard, all sections stacked in Cards.

- Read `?entity=` from `useSearchParams` (default `customers`).
- `PRESETS: Record<"customers"|"items", Record<string,{...}>> = { customers: {}, items: {} }` — placeholder for future Zoho preset.
- Target field defs (const per entity) exactly as specified, with `required` flag on `display_name` / `name`.
- State (all above any early return):
  - `entity`, `preset`, `file`, `rows` (parsed objects), `headers` (string[])
  - `mapping: Record<targetKey, headerOrEmpty>`
  - `onConflict: "skip" | "update"`
  - `preview` (RPC result), `submitting`
- Sections:
  1. **Entity + preset** — two Selects (entity switches via `setSearchParams`; resets mapping/preview/file). Preset Select shows only "Generic (manual)".
  2. **Upload** — `<Input type="file" accept=".csv">`. On select: `Papa.parse(file, { header: true, skipEmptyLines: true })`, store `rows` + detected `headers` (from `meta.fields`). Show row count. Auto-map: for each target field, find header where `header.toLowerCase().replace(/\s+/g,"_") === targetKey.toLowerCase()`.
  3. **Column mapping** — table/grid: target label (asterisk if required) + Select listing `"— none —"` plus headers.
  4. **Conflict handling** — Select for `on_conflict`.
  5. **Preview & commit** — two buttons.
- Build `p_rows`: map each parsed row to `{ [targetKey]: csvRow[mappedHeader] }`, omitting unmapped keys.
- RPC: `supabase.rpc(entity === "customers" ? "ops_import_customers" : "ops_import_items" as any, { p_rows, p_mode, p_on_conflict: onConflict })`.
- Preview disabled until file loaded + required field mapped. Commit disabled until a preview has run (allow when error rows > 0 but show warning); also disabled while `submitting`.
- Render counts (insert/update/skip/error) and a scrollable Table of returned `rows` with action Badge (color by action: insert=default, update=secondary, skip=outline, error=destructive), name, joined messages.
- Toast on commit success; re-run dry_run after commit to refresh preview.

## 3. Route — `src/App.tsx`
Import `OperationsImport`; add alongside existing operations routes:
```tsx
<Route path="/operations/import" element={
  <RoleGuard allowedRoles={["brainwise_super_admin"]}>
    <SuperAdminSessionProvider><OperationsImport /></SuperAdminSessionProvider>
  </RoleGuard>
} />
```

## 4. Entry buttons
- `OperationsCustomers.tsx`: outline "Import CSV" button next to "New customer" → `navigate("/operations/import?entity=customers")`.
- `OperationsItems.tsx`: add `useNavigate` import + outline "Import CSV" next to "New item" → `navigate("/operations/import?entity=items")`.

## Out of scope
No backend, RPC, schema, or other-page changes. No Zoho preset content — structure only.
