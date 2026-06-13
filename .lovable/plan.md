## Create ModuleEntitlementsPanel

Create one new file: `src/components/super-admin/ModuleEntitlementsPanel.tsx`.

It's a self-contained super-admin panel that lets an admin turn platform modules on/off for a single principal (user or org). It mirrors the visual/structural pattern of `MemberDrawerAccess.tsx`: a list of rows with a Default/Allow/Block ToggleGroup and a confirmation Dialog requiring a reason (≥10 chars).

### Behavior
- Loads rows via `(supabase.rpc as any)("module_entitlement_admin_list", { p_principal_type, p_user_id, p_org_id })`.
- For each module row shows: label, effective on/off badge, "Not enforced yet" badge when `!is_enforced`, and a sub-line describing current state (follows default / forced on / forced off).
- Toggling opens a Dialog. On confirm:
  - `allow` → `module_entitlement_grant` with `p_source: "manual_invoice"`, `p_ends_at: null`
  - `block` → `module_entitlement_deny` with `p_ends_at: null`
  - `default` → `module_entitlement_revoke`
- All RPCs called via `(supabase.rpc as any)` cast (RPCs not yet in generated types), matching `MemberDrawerAccess.tsx`.
- Calls `setHasUnsavedChanges?.(!!pending)` while a dialog is open.

### Notes
The pasted source had its JSX stripped by the chat renderer (empty `<div>` markup, missing tags around the rows/dialog body). I'll reconstruct the JSX faithfully from the intact logic + the visual pattern in `MemberDrawerAccess.tsx` — same shadcn components (Button, Label, Textarea, Skeleton, Badge, ToggleGroup/Item, Dialog*), same spacing, same toast usage, same Loader2 spinner. Logic, prop names, RPC names/arguments, and types are kept exactly as specified.

No other files change.
