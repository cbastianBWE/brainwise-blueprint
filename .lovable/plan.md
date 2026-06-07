## CRM Dashboard – Plan

### 1. New file: `src/pages/operations/OperationsDashboard.tsx`
Create the page exactly as specified. Since the pasted source had JSX/text content stripped by the chat formatter, I'll reconstruct the JSX faithfully while preserving:
- All imports (`useMemo`, `useQuery`, `opsSupabase`, shadcn `Card`/`Table`, `recharts` primitives, `formatMoney`/`formatDate` from `./_shared`).
- Constants `NAVY="#021F36"`, `ORANGE="#F5741A"`, `TEAL="#006D77"`.
- `useView` hook with query key `["ops","dashboard",key]` and optional `.order(col, { ascending: asc })`.
- `SimpleTable` with loading / error / empty states and right-aligned cells when `c.right`.
- `Kpi` card component.
- All eight queries against the exact view names: `report_crm_pipeline_by_stage`, `report_crm_forecast_by_month`, `report_crm_win_rate_by_stage`, `report_crm_leads_by_source`, `report_crm_top_accounts_by_revenue`, `report_crm_lost_reason_breakdown`, `report_crm_avg_deal_cycle`, `report_crm_time_to_qualify` — with the exact order columns given.
- KPI tiles: Open weighted pipeline (sum `weighted_amount`), Open deals (sum `deal_count`), Avg deal cycle (`avg_cycle_days`), Avg time to qualify (`avg_days_to_qualify`).
- Two recharts `BarChart`s (pipeline-by-stage and forecast-by-month) using NAVY for Total and ORANGE for Weighted, wrapped in `ResponsiveContainer`, with tooltip USD formatting.
- Four tables: win rate by stage, leads by source, top accounts by revenue (collected + invoiced money), lost reason breakdown (deal count + lost value money).

### 2. Edit `src/App.tsx`
- Add `import OperationsDashboard from "./pages/operations/OperationsDashboard";` directly after the existing `OperationsReports` import.
- Add `<Route path="/operations/dashboard" element={<OperationsDashboard />} />` immediately before the existing `/operations/reports` route, matching the surrounding route wrapping (guards/layout) exactly.

### 3. Edit `src/components/AppSidebar.tsx`
- In `superAdminNav`, insert `{ title: "Dashboard", url: "/operations/dashboard", icon: LayoutDashboard },` immediately after the Pipeline entry (which carries the "CRM" sectionHeader). `LayoutDashboard` is already imported — no new imports.

### Notes
- No other files, routes, or nav entries change.
- Will verify `./_shared` exports `formatMoney` and `formatDate` and that the route block in `App.tsx` follows the same guard/layout pattern as `/operations/reports` before writing the route.
