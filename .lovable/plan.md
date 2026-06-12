## Departments tab for super-admin company detail

### 1. New file: `src/components/super-admin/CompanyDepartmentsSection.tsx`

Self-contained section, `export default function CompanyDepartmentsSection({ orgId }: { orgId: string })`. Same house style as `CompanyMembersSection.tsx`: `(supabase.rpc as any)(...)`, `(supabase as any).from(...)`, `useToast`, shadcn components, `Loader2` + lucide icons (`FolderPlus`, `Pencil`, `Trash2`, `Users`).

**State**
- `loading`, `departments: { id, name }[]`, `memberCounts: Record<string, number>`
- Create form: `newName`, `creating`
- Rename dialog: `renameRow`, `renameValue`, `renamePending`
- Delete dialog: `deleteRow`, `deleteMode` (`"unassign" | "reassign"`), `reassignTo`, `deletePending`

**`load()`** — runs on mount and after every mutation. Parallel:
- `(supabase as any).from("departments").select("id, name").eq("organization_id", orgId)` → sort by name
- `(supabase as any).from("admin_org_users_view").select("department_id").eq("organization_id", orgId)` → reduce into a `Record<string, number>`; departments not in the map render as `0`.

**Card — Departments**
- Header: title (Users icon) + inline create form: `Input` (placeholder "New department name") + `Button` (FolderPlus) → `(supabase.rpc as any)("department_create", { p_organization_id: orgId, p_name: name.trim() })`. Button disabled when trimmed input is empty or while `creating`. On success: clear input, toast, reload. On error: toast error.message.
- Table columns: **Name**, **Members** (count as `<Badge variant="secondary">`), **Actions** (right-aligned).
- Per-row actions:
  - **Rename** (ghost icon Pencil) → opens rename dialog with Input prefilled to current name → `(supabase.rpc as any)("department_rename", { p_dept_id, p_new_name: newName.trim() })`. Surface `error.message` on failure (covers 23505 duplicate). Toast + reload + close on success. Save disabled when name unchanged or blank or pending.
  - **Delete** (ghost icon Trash2, destructive color) → opens delete dialog whose body depends on `memberCounts[row.id]`:
    - **0 members** — plain confirm copy. On confirm: `department_delete({ p_dept_id: row.id, p_action: "unassign", p_reassign_to_dept_id: null })`.
    - **N ≥ 1 members** — copy explaining N members are assigned; require choosing before delete is enabled:
      - Radio/toggle "Move members to another department" → `Select` of other departments (exclude current; disabled option when none exist). Confirm calls `department_delete({ p_action: "reassign", p_reassign_to_dept_id: selectedId })`. Requires a selection.
      - "Remove members from any department" → confirms with `p_action: "unassign", p_reassign_to_dept_id: null`.
    - Toast + reload + close on success; surface `error.message` on failure.

**Loading / pending**
- Single centered `Loader2` during initial load.
- Per-action pending flags (`creating`, `renamePending`, `deletePending`) disable the relevant buttons and prevent dialog dismissal mid-flight.

### 2. Edit `src/pages/super-admin/CompanyDetail.tsx`
- Add `import CompanyDepartmentsSection from "@/components/super-admin/CompanyDepartmentsSection";`.
- Add `<TabsTrigger value="departments">Departments</TabsTrigger>` between the Members and Invitations triggers.
- Add `<TabsContent value="departments" className="mt-6"><CompanyDepartmentsSection orgId={orgId!} /></TabsContent>` in the matching spot.
- No other changes.
