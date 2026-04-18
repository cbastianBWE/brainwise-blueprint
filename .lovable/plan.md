
## Plan: Add 3 features to `src/pages/admin/AdminUsers.tsx`

All work is contained in this one file. No new routes, pages, or sidebar entries.

### Feature 1: "Users in your organization" Card
- New `useQuery` keyed `["admin-org-users", orgId]` selecting `id, email, full_name, account_type, department_name, org_level` from `users` filtered by `organization_id`, ordered by email.
- Renders below "Pending invitations".
- Loading → spinner; empty → message; otherwise table with columns: Email | Name | Role | Department | Org Level | Actions.
- `formatRole()` mapper for account_type → readable label.
- Actions cell: "Reset password" Button. If `row.id === user.id`, render `"—"` instead. On click, set `resetDialog` state to open with that user's id/email/name.

### Feature 2: "Bulk invite" Card (between Invite and Pending)
- Add dependency check: `xlsx` lib. Confirm via package.json — if missing, add it.
- State: `bulkStage`, `parsedRows`, `bulkResults`, `bulkSending`, `fileName`.
- File input hidden inside an outline `<Button>` triggering a ref-based click; accepts `.csv,.xlsx,.xls`.
- Parse with `XLSX.read(arrayBuffer)` → `sheet_to_json` → normalize headers (lowercase/trim) and map `email|department|supervisor|level|org_level` to canonical keys.
- Validate: 0 rows → toast & stop; >500 → toast & stop; missing emails → toast & stop. Otherwise → `bulkStage = "preview"`.
- Preview: "Ready to send N invitations…" + table of first 10 rows with "+ N more"; "Send invitations" + "Cancel" buttons.
- Send: call `(supabase.rpc as any)("bulk_invitation_create", { p_organization_id, p_rows })`. On error → toast, stay in preview. On success → store results, `bulkStage = "results"`, invalidate pending-invitations + departments queries.
- Results: summary line with success/fail/auto-created dept counts; table Row # | Email | Status (Badge default/destructive) | Details (code in mono or error_message). "Download failed rows as CSV" (blob + anchor) shown only if failures exist. "Upload another file" resets state.
- Extract bulk-invite section into a `<BulkInviteCard>` sub-component declared in the same file (file will exceed ~800 lines).

### Feature 3: Password reset dialog
- State: `resetDialog: { open, userId, userEmail, userName, sending }`.
- Dialog blocks close while `sending`.
- On confirm: get session token, fetch `${VITE_SUPABASE_URL}/functions/v1/admin_trigger_password_reset` with `{ target_user_id }`, handle response per spec (email_sent true/false, 403/42501, 404, fallback). Reset state on success; keep open with sending=false on error.

### Technical notes
- Use existing patterns: `(supabase as any).from("users")` is unnecessary since `users` is typed — use directly. `bulk_invitation_create` RPC not in types — use `(supabase.rpc as any)`.
- Reuse `Loader2`, `Badge`, `Dialog`, `Card`, `Table`, `Button`, `Input`, `useToast`, React Query.
- No changes to existing single-invite, pending-invitations, or add-dept logic.
- File structure: existing imports + add `Badge`, `XLSX`, `useRef`, more lucide icons (`Upload`, `Download`, `KeyRound`). Define `BulkInviteCard` sub-component above `AdminUsers`. Append the two new cards + the reset dialog to the existing JSX tree.
