
# Plan: Late Fees + Sales & Commission + Custom Fields

Touch only `src/pages/operations/OperationsSettings.tsx`. Replace the three remaining placeholder `TabsContent`s. No new imports needed (Textarea already imported in prompt 2; everything else already present). No new deps.

## New queries

- `lateFeesQ`: key `["ops","settings","late-fee-rules"]` → `supabase.rpc("ops_list_late_fee_rules" as any)`.
- `salespeopleQ`: key `["ops","settings","salespeople"]` → `supabase.rpc("ops_list_salespeople" as any)`.
- `entityType` state (default `"invoice"`).
- `customFieldsQ`: key `["ops","settings","custom-fields", entityType]` → `supabase.rpc("ops_list_custom_field_definitions" as any, { p_entity_type: entityType })`.

All cast `as any`, throw on error, return `data ?? []`.

## New helpers (in-file)

- `ENTITY_TYPES = ["customer","item","project","task","time_entry","expense","estimate","invoice"]`.
- `humanizeEntity(t)`: map (`time_entry` → "Time Entry", `credit_note` n/a), fallback titleCase (reuses existing `titleCase`).
- `FIELD_TYPES = ["text","number","date","dropdown","checkbox","longtext"]`.
- `formatLateAmount(row)`: `row.fee_type === "percentage" ? `${row.fee_amount}%` : `$${row.fee_amount}``.

## Drafts/state

- `ruleDraft: any | null` — late fee dialog.
- `rateDraft: any | null` — commission dialog.
- `fieldDraft: any | null` — custom field dialog. Carries an extra `_optionsText: string` for the Textarea round-trip (split on newlines on save).

## Late Fees tab

Card with header + "Add rule" button (opens `ruleDraft` seeded `{ name:"", fee_type:"percentage", fee_amount:0, grace_period_days:0, max_total_fee_amount:"", apply_to:"all", is_active:true }`).

Table cols: Name, Type, Amount (`formatLateAmount`), Grace (days), Max cap (`row.max_total_fee_amount ?? "—"`), Active (Yes/No), Actions (Edit/Delete).

Edit opens dialog with `{ ...row, max_total_fee_amount: row.max_total_fee_amount ?? "" }`.

Dialog fields per spec. Amount label adapts to `fee_type`. `apply_to` rendered as a disabled `Input value="All customers"` with helper "Targeted rules are not available yet." Always saved as `"all"`.

Save: `ops_upsert_late_fee_rule(p_id: ruleDraft.id ?? null, p_patch: { name, fee_type, fee_amount: Number(...), grace_period_days: Number(...), max_total_fee_amount: max==="" ? null : Number(max), apply_to: "all", is_active })` → invalidate `["ops","settings","late-fee-rules"]`.

Delete: `window.confirm` + `ops_delete_late_fee_rule`.

## Sales & Commission tab

Card with helper paragraph "Commission rates apply to invoices where the user is set as salesperson." then table.

Cols: Name (`full_name`), Email, Role, Commission rate (`rate == null ? "—" : `${rate}%``), Actions (Edit rate).

Edit opens `rateDraft = { user_id: row.id, full_name: row.full_name, commission_rate: row.commission_rate ?? "" }`.

Dialog: single Input type="number" (label "Commission rate (%)"). Save → `ops_set_user_commission_rate(p_user_id: rateDraft.user_id, p_rate: rateDraft.commission_rate === "" ? null : Number(rateDraft.commission_rate))`. Invalidate `["ops","settings","salespeople"]`.

No add/delete.

## Custom Fields tab

Card. At top: entity type Select (8 values, humanized). Below: header row with "Add field" button + table.

"Add field" seeds `fieldDraft = { entity_type: entityType, field_name: "", field_label: "", field_type: "text", _optionsText: "", is_required: false, sort_order: 0, is_active: true }`.

Table cols: Label, Field name, Type, Required, Active, Order, Actions.

Edit seeds with `{ ...row, _optionsText: Array.isArray(row.dropdown_options) ? row.dropdown_options.join("\n") : "" }`.

Dialog fields:
- `entity_type` Select (8 types), disabled when editing.
- `field_name` Input, disabled when editing.
- `field_label` Input.
- `field_type` Select (6 types).
- `_optionsText` Textarea, rendered only when `field_type === "dropdown"`. Helper "One option per line."
- `is_required` Switch.
- `is_active` Switch.
- `sort_order` Input type="number".

Save:
```
const opts = fieldDraft.field_type === "dropdown"
  ? fieldDraft._optionsText.split("\n").map(s => s.trim()).filter(Boolean)
  : null;
ops_upsert_custom_field_definition(p_id: fieldDraft.id ?? null, p_patch: {
  entity_type, field_name, field_label, field_type,
  dropdown_options: opts,
  is_required, sort_order: Number(sort_order), is_active,
})
```
Invalidate `["ops","settings","custom-fields", entityType]`.

Delete: confirm + `ops_delete_custom_field_definition`.

## Dialog placement

Append three new `<Dialog>` blocks at the bottom of the component alongside the existing dialogs (after the reminder schedule dialog) — same pattern: `open={!!draft}` / `onOpenChange={(o) => !o && setDraft(null)}`.

## Untouched

Branding, Numbering & Tax, and Templates & Reminders tabs and all their dialogs/handlers stay verbatim. Only the three placeholder TabsContents are replaced.

## Acceptance
- Late Fees: list+CRUD; Amount column reflects type; apply_to locked to "All customers"; max cap optional.
- Sales: rate edit persists; clearing sets null/—.
- Custom Fields: entity selector reloads list; CRUD works; dropdown options only shown for `dropdown` and round-trip as string array; `entity_type`/`field_name` locked on edit.
