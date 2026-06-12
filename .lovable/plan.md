# Learning Report — Super Admin Dashboard

Three files. All backend RPCs already exist; no DB changes.

## 1. New page — `src/pages/super-admin/LearningReport.tsx`

Match the layout/styling of other `src/pages/super-admin` and `src/pages/company` dashboards (shadcn Card/Button/Input/Select/Checkbox/Badge/Table, `sonner` toast, `@tanstack/react-query`, `recharts`, lucide icons). Brand colors: Navy `#021F36`, Teal `#006D77`, Green `#2D6A4F`, Gray `#6D6875`, Orange `#F5741A`, Red `#b91c1c`.

### Filter state
- `tier`: `'all' | 'cert_path' | 'curriculum' | 'module' | 'content_item'`
- `targetId` (uuid|null) + `targetName` (string|null)
- `userId` (uuid|null)
- `status`: `'all' | 'completed' | 'in_progress' | 'not_started' | 'certified' | 'revoked'`
- `page` (server pagination, 50/page)

RPC param translation: `'all' → null`. Cert-tier targets may have a null `target_id`, so pass `p_target_id` when uuid present, else `p_target_name`.

### Data
- `usersList`: `(supabase as any).from('users').select('id,email,full_name').is('deleted_at', null).order('full_name')`
- `certTypeMap`: from `certification_paths(id, certification_type)` once → `path_id → certification_type`
- `summaryQuery`: `rpc('get_learning_report_summary', { p_tier, p_target_id, p_target_name, p_user_ids })`
- `detailQuery`: `rpc('get_learning_report_detail', { ...filters, p_status, p_limit: 50, p_offset: page*50 })`
- `countQuery`: same as detail but `p_limit: null`, select only `user_id` length for pagination total

All queries use `react-query` keys including all relevant filters. Errors → `toast.error`.

### Layout (top → bottom)
1. **Header**: title "Learning Report", subtitle, `Refresh` (`RefreshCw`) refetches both queries, `Export CSV` (`Download`).
2. **Filter bar**: responsive row of Selects — Tier, Target (options from `summaryQuery` rows of selected tier; value = `target_id ?? target_name`; disabled when tier='all'), User (searchable; "All users" + usersList), Status. Ghost "Clear filters".
3. **KPI cards**: one Card per tier present in summary (aggregate sum of total/done/in_progress/not_started/revoked across that tier's rows). Big "done / total" + rounded completion rate %.
4. **Breakdown chart**: horizontal stacked recharts `BarChart` (one bar per target, cap ~30 bars — if more, omit chart and keep table only). Segments: done (Green), in_progress (Orange), not_started (Gray), revoked (Red). `ResponsiveContainer`, `Tooltip`, `Legend`. Y=target_name, X=count.
5. **Breakdown table**: Target / Parent / Total / Done / In progress / Not started / Revoked / Rate %. Row click → drill in (sets tier + target filters).
6. **Detail table**: `[checkbox]`, User (full_name over muted email), Tier, Target, Parent, Status (colored Badge — done/certified green, in_progress orange, not_started gray, revoked red), Completed, Started. Prev/Next + "Page X" pagination. Header checkbox = select all on page.

### CSV export
Call `get_learning_report_detail` with current filters and `p_limit: null`. Build CSV (header + rows: `user_email, user_full_name, tier, target_name, parent_path, status, started_at, completed_at, assigned_at`) and trigger Blob/anchor download as `learning-report.csv`. Toast while exporting (use existing `src/lib/csvUtils.ts` helpers `rowsToCsv` + `downloadCsv`).

### Bulk actions
Enabled only when Tier and Target are both set to a single value (every visible row shares the target). Otherwise show hint: "Select rows within a single target to use bulk actions."

When selection non-empty → action bar with "Mark complete" / "Mark incomplete". Click opens Dialog with required reason `Textarea` (≥10 chars; confirm disabled until met). On confirm, dispatch by selected target's tier:
- `content_item` → `set_content_item_completion_bulk(userIds, target_id, complete, reason)`
- `module` → `set_module_completion_bulk(userIds, target_id, complete, reason)`
- `curriculum` → `set_curriculum_completion_bulk(userIds, target_id, complete, reason)`
- `cert_path` → `set_certification_completion_bulk(userIds, certTypeMap[target_id] ?? target_name, complete, reason)`

`userIds` = distinct `user_id` of selected rows. On success: toast `"{succeeded} updated, {failed} failed"`, clear selection, refetch both queries.

### Other
Loading skeletons/spinner, empty state "No records match these filters.", no `localStorage`/`sessionStorage`.

## 2. Route — `src/App.tsx`

Import `LearningReport` like sibling super-admin pages. Add near the other `/super-admin` routes:

```tsx
<Route
  path="/super-admin/learning-report"
  element={
    <RoleGuard allowedRoles={["brainwise_super_admin"]}>
      <SuperAdminSessionProvider>
        <LearningReport />
      </SuperAdminSessionProvider>
    </RoleGuard>
  }
/>
```

## 3. Sidebar — `src/components/AppSidebar.tsx`

Add `ClipboardList` to the `lucide-react` import. In `superAdminNav`, insert directly after the "Content Authoring" entry:

```ts
{ title: "Learning Report", url: "/super-admin/learning-report", icon: ClipboardList },
```

Renders as a normal top-level item — no special-casing.

## Out of scope
No DB migrations, no RPC changes, no edits to other pages or sidebar entries.
