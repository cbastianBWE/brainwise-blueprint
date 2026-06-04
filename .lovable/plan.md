## Add detail-level selector (Itemized / Summary by project) to invoice generation

Additive only across 3 files.

### 1. `src/integrations/supabase/types.ts`
Extend Args for the two RPCs (stale types):
- `ops_create_invoice_from_project`: add `p_detail?: string` to Args.
- `ops_create_invoice_from_selection`: add `p_detail?: string` to Args.

### 2. `src/pages/operations/InvoiceFromWork.tsx`
- Add `const [detail, setDetail] = useState<"itemized" | "summary">("itemized");` near other useState hooks.
- In header, immediately to the left of the "Generate invoice" Button, add a compact shadcn `Select` (w-[200px], placeholder "Detail level") bound to `detail`/`setDetail` with items: `itemized` → "Itemized", `summary` → "Summary by project". Reuse existing Select import.
- In `handleGenerate`, add `p_detail: detail,` to the `supabase.rpc("ops_create_invoice_from_selection", { ... })` args. Keep existing `p_selection: p_selection as never` cast unchanged.

### 3. `src/pages/operations/OperationsProjectDetail.tsx`
- Add `const [genDetail, setGenDetail] = useState<"itemized" | "summary">("itemized");` next to existing gen state (~line 51).
- Add shadcn Select imports (`Select, SelectTrigger, SelectValue, SelectContent, SelectItem` from `@/components/ui/select`) if not already imported.
- In the Generate-invoice dialog body, after the From/To grid (`grid grid-cols-1 md:grid-cols-2`) and before `<DialogFooter>`, add a full-width field: a `Label` "Detail level" + Select bound to `genDetail`/`setGenDetail` with the same two items.
- In `handleGenerate`, add `p_detail: genDetail,` to the `supabase.rpc("ops_create_invoice_from_project", { ... })` args.

Defaults to "itemized" so existing behavior is preserved. Type-check must be clean.
