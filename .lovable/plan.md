# Fix archive and restore failing with "Cannot read properties of undefined (reading 'rest')"

The diagnosis in the message is correct. Confirmed:

- `src/components/reports/ArchiveReportDialog.tsx:30` aliases `supabase.rpc` into a bare `rpc` constant, detaching it from the client. Calling `rpc(...)` at lines 110 (archive) and 196 (restore) leaves `this` undefined inside supabase-js, which reads `this.rest` and throws.
- Line 227 in the same file calls `supabase.rpc("bw_list_my_reports")` on the client, which is why the list loads fine.
- The cast is no longer needed: the generated types already declare `bw_archive_report` (types.ts:17451) and `bw_restore_report` (types.ts:17631).

## Change

In `src/components/reports/ArchiveReportDialog.tsx` only:

1. Delete the `const rpc = supabase.rpc as unknown as (...)` alias.
2. Call `supabase.rpc("bw_archive_report", { p_kind, p_id, p_reason })` directly in the confirm handler.
3. Call `supabase.rpc("bw_restore_report", { p_kind, p_id })` directly in the restore handler.

No parameter names, reason text, UI, or backend change. The "Multiple GoTrueClient instances" warning is unrelated and stays.

## Verification

Typecheck, then archive a report from Team & Paired Reports and restore it as super admin, confirming no console error and the row updating to the archived state.
