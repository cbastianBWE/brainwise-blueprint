
# Plan: Tabbed OperationsSettings — Branding + Numbering & Tax

Touch only `src/pages/operations/OperationsSettings.tsx`. No other file changes, no new dependencies.

## Structure

Top-level layout stays `<div className="p-6 space-y-6">`. Wrap content in:

```
<Tabs defaultValue="branding">
  <TabsList>
    <TabsTrigger value="branding">Branding</TabsTrigger>
    <TabsTrigger value="templates">Templates & Reminders</TabsTrigger>
    <TabsTrigger value="late_fees">Late Fees</TabsTrigger>
    <TabsTrigger value="sales">Sales & Commission</TabsTrigger>
    <TabsTrigger value="custom_fields">Custom Fields</TabsTrigger>
    <TabsTrigger value="numbering">Numbering & Tax</TabsTrigger>
  </TabsList>
  <TabsContent value="branding">…existing branding Card…</TabsContent>
  <TabsContent value="templates"><PlaceholderCard title="Templates & Reminders"/></TabsContent>
  <TabsContent value="late_fees"><PlaceholderCard title="Late Fees"/></TabsContent>
  <TabsContent value="sales"><PlaceholderCard title="Sales & Commission"/></TabsContent>
  <TabsContent value="custom_fields"><PlaceholderCard title="Custom Fields"/></TabsContent>
  <TabsContent value="numbering">…4 cards…</TabsContent>
</Tabs>
```

`PlaceholderCard` is a tiny in-file component: `<Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Available in an upcoming update.</p></CardContent></Card>`.

## Tab 1 — Branding

Move the existing Branding Card verbatim into `<TabsContent value="branding">`. Keep `orgQ`, `handleLogo`, `handleSave`, `form` state, `setField`, `setAddr`, the `field`/`addrField` helpers. Existing loading guard (`if (orgQ.isLoading) return …`) stays at the top of the component before the Tabs render so the page-level loading behavior is unchanged.

## Tab 6 — Numbering & Tax

Four stacked Cards inside one TabsContent.

### Imports to add
- `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
- `Select, SelectTrigger, SelectValue, SelectContent, SelectItem` from `@/components/ui/select`
- `Switch` from `@/components/ui/switch`
- `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from `@/components/ui/table`
- `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter` from `@/components/ui/dialog`

### Queries (all on default `supabase` client, cast `as any`, key `["ops","settings", …]`)
- `numberingQ`: `supabase.rpc("ops_list_numbering_schemes" as any)` → `data` is the array directly.
- `authoritiesQ`: `supabase.rpc("ops_list_tax_authorities" as any)`.
- `ratesQ`: `supabase.rpc("ops_list_tax_rates" as any)`.
- `currenciesQ`: `supabase.rpc("ops_list_currencies" as any)`.

All errors `throw error` inside `queryFn`. Invalidate the matching key after each successful mutation.

### Card A — Document numbering
Table columns: Document type, Prefix, Padding zeros, Reset frequency, Next number (read-only text), Actions.
Edit via dialog (`editingScheme` state). Fields: `prefix` Input, `padding_zeros` Input type="number", `reset_frequency` Select with items `never | yearly | monthly`. Save:
```
supabase.rpc("ops_update_numbering_scheme" as any, {
  p_id: editingScheme.id,
  p_patch: { prefix, padding_zeros: Number(padding_zeros), reset_frequency }
})
```
No add, no delete. `next_number` displayed only.

### Card B — Tax authorities
Table columns: Name, Jurisdiction, Tax ID, Actions (Edit, Delete). "Add authority" button opens dialog. Dialog state `authorityDraft = { id?, name, jurisdiction, tax_id }`. Save:
```
supabase.rpc("ops_upsert_tax_authority" as any, {
  p_id: authorityDraft.id ?? null,
  p_patch: { name, jurisdiction, tax_id }
})
```
Delete via `window.confirm` then `ops_delete_tax_authority`.

### Card C — Tax rates
Table columns: Name, Rate %, Authority (lookup via `authoritiesQ.data?.find(a => a.id === r.tax_authority_id)?.name ?? ""`), Compound (Yes/No), Active (Yes/No), Actions.
Dialog fields: `name` Input, `rate_percentage` Input type="number", `tax_authority_id` Select (sentinel `"__none__"` → null on save; options from authoritiesQ), `is_compound` Switch, `is_active` Switch (default true on add). Save:
```
supabase.rpc("ops_upsert_tax_rate" as any, {
  p_id: rateDraft.id ?? null,
  p_patch: {
    name, rate_percentage: Number(rate_percentage),
    tax_authority_id: tax_authority_id === "__none__" ? null : tax_authority_id,
    is_compound, is_active
  }
})
```
Delete via confirm + `ops_delete_tax_rate`.

### Card D — Currencies
Table columns: Currency code, Base (Yes/No), Manual exchange rate, Actions (Edit only). "Add currency" button.
Dialog fields: `currency_code` Input, `is_base` Switch, `manual_exchange_rate` Input type="number" (optional → send `null` when empty). Save:
```
supabase.rpc("ops_upsert_currency" as any, {
  p_id: currencyDraft.id ?? null,
  p_patch: {
    currency_code,
    is_base,
    manual_exchange_rate: manual_exchange_rate === "" ? null : Number(manual_exchange_rate)
  }
})
```

## Shared patterns
- One generic `runMutation(promise, successMsg, invalidateKey)` helper isn't required — use small inline async handlers that `await` the RPC, check `error`, toast, then `qc.invalidateQueries({ queryKey })` and close the dialog.
- Dialogs are uncontrolled-by-state opens (`open` boolean + `editingX` row). On open-for-add, seed empty draft; on open-for-edit, seed from row. Single dialog component per card.
- All Selects use non-empty string values (no empty-string SelectItem). Use `"__none__"` for "None" in tax rate authority picker.

## Acceptance check (manual after build)
- Six tabs render in the listed order; Branding behaves identically.
- Numbering table shows rows; editing updates prefix/padding/reset; next_number is plain text.
- Authorities/Rates/Currencies: add + edit + (delete where allowed) work and tables refresh after each save.
- Placeholder tabs show "Available in an upcoming update."
