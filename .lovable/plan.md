# CRM P3.2 — Pipeline Kanban

## 1. New page `src/pages/operations/OperationsPipeline.tsx`
- TanStack Query (all via `opsSupabase.from("x" as any)`):
  - `["ops","pipeline","default"]` → `pipelines` where `is_default = true`, `.maybeSingle()` → id.
  - `["ops","pipeline","stages", pipelineId]` (enabled when id present) → `deal_stages` where `pipeline_id = id AND is_active = true`, ordered by `sort_order`. Columns in order.
  - `["ops","pipeline","deals"]` → `deals` select `id, name, amount, currency_code, stage_id, close_date, owner:users(full_name), account:accounts(name)`, ordered `created_at desc`.
  - `["ops","pipeline","health"]` → `deal_pipeline_health` select `deal_id, is_rotting, is_stale_no_activity, has_next_activity`; build `Map<deal_id, flags>`.
- Layout: page header (`Pipeline` / `CRM · Deals`) + "New deal" button opening `DealFormDialog` (controlled `open`; on close invalidate `["ops","pipeline","deals"]` + `["ops","pipeline","health"]`). Body is a horizontally scrollable flex row (`overflow-x-auto`) of fixed-width columns (e.g. `w-72 shrink-0`).
- Column header: stage name, deal count, sum of `amount` for that stage via `formatMoney(sum, firstDeal?.currency_code || "USD")`.
- Deal card: bold name, account name, `formatMoney(amount, currency_code)`, close date (`formatDate`) when present. Left border-amber when `is_rotting`. Muted "No next step" chip when `is_stale_no_activity`. `cursor-pointer`; click → `navigate('/operations/deals/${id}')`.
- DnD (native HTML5):
  - Card: `draggable`, `onDragStart` → `e.dataTransfer.setData("text/plain", deal.id)`.
  - Column: `onDragOver={(e) => e.preventDefault()}`, `onDrop` reads id; if `deal.stage_id !== column.id`, `await opsSupabase.from("deals" as any).update({ stage_id: column.id }).eq("id", dealId)`. No `probability` or stage history writes.
  - On success: toast + `qc.invalidateQueries({ queryKey: ["ops","pipeline","deals"] })` and `["ops","pipeline","health"]`. On error: toast.

## 2. `src/App.tsx`
Add import `OperationsPipeline` and route `/operations/pipeline` wrapped in `RoleGuard allowedRoles={["brainwise_super_admin"]}` + `SuperAdminSessionProvider`, matching surrounding operations routes.

## 3. `src/components/AppSidebar.tsx`
Insert `{ title: "Pipeline", url: "/operations/pipeline", icon: GitBranch, sectionHeader: "CRM" }` as the FIRST CRM item, and remove `sectionHeader: "CRM"` from the Leads item.

## Constraints
- No edits to `operations-types.ts`, RPCs, billing pages, or `DealFormDialog.tsx`.
- No new dependencies.
