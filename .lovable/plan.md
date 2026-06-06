
# Plan: Templates & Reminders tab

Touch only `src/pages/operations/OperationsSettings.tsx`. Replace the `templates` placeholder; leave `late_fees`, `sales`, `custom_fields` placeholders alone. No new deps.

## Imports
Add `Textarea` from `@/components/ui/textarea`. Add `useRef` to the existing React import.

## Helpers (in-file)
- `TEMPLATE_TYPES = ["invoice_send","estimate_send","payment_receipt","reminder_before_due","reminder_on_due","reminder_after_due","recurring_notice","retainer_send","statement_send","credit_note_send"]`.
- `humanizeType(t)`:
  - `reminder_before_due` → "Reminder — before due"
  - `reminder_on_due` → "Reminder — on due"
  - `reminder_after_due` → "Reminder — after due"
  - Otherwise: split on `_`, title-case each word, join with space (e.g. `invoice_send` → "Invoice Send", `credit_note_send` → "Credit Note Send").
- `humanizeToken(token)`: per-token map for common cases, fallback to title-cased token.
  - `customer_name` → "Customer Name", `org_name` → "BrainWise Enterprises"
  - `invoice_number` → "INV-2026-0008", `estimate_number` → "EST-2026-0008", `credit_note_number` → "CN-2026-0008", `statement_number` → "STM-2026-0008"
  - any key ending in `_date` → "2026-06-15"
  - any key ending in `_link` or `_url` → "https://example.com/pay"
  - `balance_due`, `total_amount`, `amount`, `amount_due`, `subtotal`, `tax_total` → "1,500.00"
  - fallback: title case of token

## New queries
- `templatesQ`: key `["ops","settings","email-templates"]`, calls `ops_list_email_templates`.
- `catalogQ`: key `["ops","settings","merge-catalog"]`, calls `ops_get_merge_tag_catalog` (returns object — not array).
- `schedulesQ`: key `["ops","settings","reminder-schedules"]`, calls `ops_list_reminder_schedules`.

All use default `supabase` client cast `as any`, throw on error, return `data` directly.

## State
- `templateType: string` (default `"invoice_send"`).
- `editor: { id: string|null, subject: string, body_html: string, body_text: string, is_active: boolean, is_default: boolean }`.
- `activeField: "subject" | "body"` (default `"body"`).
- `subjectRef = useRef<HTMLInputElement>(null)`, `bodyRef = useRef<HTMLTextAreaElement>(null)`.
- `serverPreview: { subject: string, body_html: string } | null` (null = show live buffer; populated by Verify).
- `scheduleDraft: any | null` (dialog state).

When `templateType` changes (or templatesQ data arrives): `useEffect` that finds row by `template_type`, seeds editor (blanks + `id=null` if missing), and clears `serverPreview`.

## Card 1 — Email templates (2-col grid)

Left column (editor):
- Type Select (10 items, humanized labels).
- Merge chips row: `(catalogQ.data?.[templateType] ?? []).map(tok => <Button variant="outline" size="sm" onClick={insertToken(tok)}>{`{{${tok}}}`}</Button>)`.
- `insertToken(token)`:
  - `ref = activeField === "subject" ? subjectRef : bodyRef`
  - `el = ref.current`; if no el, append to body.
  - `start = el.selectionStart ?? el.value.length`, `end = el.selectionEnd ?? start`.
  - `next = el.value.slice(0,start) + "{{"+token+"}}" + el.value.slice(end)`.
  - Update corresponding state (`subject` or `body_html`).
  - After state update, `requestAnimationFrame` to refocus and set caret to `start + token.length + 4`.
- Subject Input with `ref={subjectRef}` and `onFocus={() => setActiveField("subject")}`.
- Body Textarea `rows={16}`, monospace class `font-mono text-sm`, `ref={bodyRef}`, `onFocus={() => setActiveField("body")}`.
- Plain-text fallback Textarea `rows={3}`.
- Two switches: Active, Default.
- Save button → `ops_upsert_email_template` with `{ template_type: templateType, subject, body_html, body_text: body_text || null, is_default, is_active }`; on success invalidate templates key and toast. Clear serverPreview.

Right column (preview):
- Build `sampleContext` from `catalogQ.data?.[templateType] ?? []` mapping each tok → `humanizeToken(tok)`.
- `applyTokens(str, ctx)`: `str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, t) => ctx[t] ?? "")`.
- Mode label: `serverPreview ? "Server-rendered (saved template)" : "Live preview (current edits)"`.
- Render rendered subject as a line, then `<iframe sandbox srcDoc={renderedBody} className="w-full h-[400px] border rounded" />`.
- `serverPreview ? serverPreview.subject/body_html : applyTokens(...)`.
- Two buttons: "Verify server render" (calls `ops_render_email_preview(p_template_type: templateType, p_context: sampleContext)`, stores result in serverPreview, toast on error) and "Back to live" (clears serverPreview), shown only when serverPreview is set.

## Card 2 — Reminder schedules

Header with title + "Add schedule" button (opens dialog with `{ name:"", schedule_offset_days:0, template_id:"__auto__", is_active:true, applies_to_overdue_only:false }`).

Table cols: Name, Timing, Template, Active, Overdue-only, Actions.
- Timing formatter: `n<0` → `${Math.abs(n)} days before due`; `n===0` → `On due date`; `n>0` → `${n} days after due`.
- Template cell: `row.template_id == null ? "Auto (by due state)" : humanizeType(row.template_type)`.
- Edit: `setScheduleDraft({ ...row, template_id: row.template_id ?? "__auto__" })`.
- Delete: confirm + `ops_delete_reminder_schedule`.

Dialog (same pattern as Numbering tab dialogs):
- Name Input.
- Offset days Input type="number" with helper paragraph.
- Template Select sourced from `(templatesQ.data ?? []).filter(t => ["reminder_before_due","reminder_on_due","reminder_after_due"].includes(t.template_type))`, items use `t.id` as value and `humanizeType(t.template_type)` as label; plus first item `<SelectItem value="__auto__">Auto (by due state)</SelectItem>`.
- Switches: Active, Overdue-only.
- Save → `ops_upsert_reminder_schedule(p_id: draft.id ?? null, p_patch: { name, schedule_offset_days: Number(...), template_id: sel === "__auto__" ? null : sel, is_active, applies_to_overdue_only })`, invalidate `["ops","settings","reminder-schedules"]`, close.

## Untouched
- All other tabs and dialogs from Numbering & Tax stay verbatim.
- Branding stays verbatim.
- No changes to imports beyond `Textarea` and adding `useRef`.

## Acceptance
- Type select swaps editor content; chips insert `{{token}}` at caret of last-focused field; iframe live-updates; Save persists; Verify shows server output and Back to live restores buffer.
- Reminders list shows timing + template label; add/edit/delete refresh.
