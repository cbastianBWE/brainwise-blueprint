import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Settings2 } from "lucide-react";
import { formatMoney, formatDate } from "./_shared";

type ColType = "text" | "money" | "number" | "date" | "bool";
type Col = { key: string; label: string; type: ColType };
type Measure = { out: string; agg: "sum" | "count"; src?: string };
type ReportDef = {
  key: string;
  label: string;
  view: string;
  dateField?: string;
  columns: Col[];
  defaultSort?: { key: string; dir: "asc" | "desc" };
  statusExclude?: string[];
  groupBy?: { key: string; emptyLabel?: string };
  measures?: Measure[];
  defaultGroupSort?: { key: string; dir: "asc" | "desc" };
};

const REPORTS: ReportDef[] = [
  {
    key: "invoice_details",
    label: "Invoice details",
    view: "report_invoices",
    dateField: "issue_date",
    defaultSort: { key: "issue_date", dir: "desc" },
    columns: [
      { key: "invoice_number", label: "Invoice #", type: "text" },
      { key: "customer_name", label: "Customer", type: "text" },
      { key: "salesperson_name", label: "Salesperson", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "issue_date", label: "Issue date", type: "date" },
      { key: "due_date", label: "Due date", type: "date" },
      { key: "total_amount", label: "Total", type: "money" },
      { key: "amount_paid", label: "Paid", type: "money" },
      { key: "balance_due", label: "Balance", type: "money" },
    ],
  },
  {
    key: "payments_received",
    label: "Payments received",
    view: "report_payments",
    dateField: "payment_date",
    defaultSort: { key: "payment_date", dir: "desc" },
    columns: [
      { key: "payment_date", label: "Date", type: "date" },
      { key: "customer_name", label: "Customer", type: "text" },
      { key: "payment_mode", label: "Method", type: "text" },
      { key: "reference_number", label: "Reference", type: "text" },
      { key: "invoice_numbers", label: "Invoices", type: "text" },
      { key: "amount", label: "Amount", type: "money" },
      { key: "refunded_amount", label: "Refunded", type: "money" },
    ],
  },
  {
    key: "time_tracking",
    label: "Time tracking",
    view: "report_time",
    dateField: "date",
    defaultSort: { key: "date", dir: "desc" },
    columns: [
      { key: "date", label: "Date", type: "date" },
      { key: "user_name", label: "User", type: "text" },
      { key: "project_name", label: "Project", type: "text" },
      { key: "customer_name", label: "Customer", type: "text" },
      { key: "task_name", label: "Task", type: "text" },
      { key: "hours", label: "Hours", type: "number" },
      { key: "is_billable", label: "Billable", type: "bool" },
      { key: "is_invoiced", label: "Invoiced", type: "bool" },
      { key: "time_cost", label: "Cost", type: "money" },
    ],
  },
  {
    key: "project_profitability",
    label: "Project profitability",
    view: "project_financials_rollup",
    columns: [
      { key: "project_name", label: "Project", type: "text" },
      { key: "customer_name", label: "Customer", type: "text" },
      { key: "billing_method", label: "Billing", type: "text" },
      { key: "budget_amount", label: "Budget", type: "money" },
      { key: "actual_cost", label: "Cost", type: "money" },
      { key: "revenue_invoiced", label: "Revenue", type: "money" },
      { key: "margin", label: "Margin", type: "money" },
      { key: "margin_pct", label: "Margin %", type: "number" },
    ],
  },
  {
    key: "sales_by_customer",
    label: "Sales by customer",
    view: "report_invoices",
    dateField: "issue_date",
    statusExclude: ["draft", "void", "written_off"],
    groupBy: { key: "customer_name", emptyLabel: "—" },
    measures: [
      { out: "invoice_count", agg: "count" },
      { out: "total_sales", agg: "sum", src: "total_amount" },
      { out: "paid", agg: "sum", src: "amount_paid" },
    ],
    defaultGroupSort: { key: "total_sales", dir: "desc" },
    columns: [
      { key: "customer_name", label: "Customer", type: "text" },
      { key: "invoice_count", label: "Invoices", type: "number" },
      { key: "total_sales", label: "Total sales", type: "money" },
      { key: "paid", label: "Paid", type: "money" },
    ],
  },
  {
    key: "top_customers",
    label: "Top customers",
    view: "report_invoices",
    dateField: "issue_date",
    statusExclude: ["draft", "void", "written_off"],
    groupBy: { key: "customer_name", emptyLabel: "—" },
    measures: [
      { out: "invoice_count", agg: "count" },
      { out: "total_sales", agg: "sum", src: "total_amount" },
    ],
    defaultGroupSort: { key: "total_sales", dir: "desc" },
    columns: [
      { key: "customer_name", label: "Customer", type: "text" },
      { key: "invoice_count", label: "Invoices", type: "number" },
      { key: "total_sales", label: "Total sales", type: "money" },
    ],
  },
  {
    key: "sales_by_item",
    label: "Sales by item",
    view: "report_invoice_lines",
    dateField: "issue_date",
    statusExclude: ["draft", "void", "written_off"],
    groupBy: { key: "item_name", emptyLabel: "Free-form / no item" },
    measures: [
      { out: "line_count", agg: "count" },
      { out: "quantity", agg: "sum", src: "quantity" },
      { out: "revenue", agg: "sum", src: "line_total" },
    ],
    defaultGroupSort: { key: "revenue", dir: "desc" },
    columns: [
      { key: "item_name", label: "Item", type: "text" },
      { key: "line_count", label: "Lines", type: "number" },
      { key: "quantity", label: "Qty", type: "number" },
      { key: "revenue", label: "Revenue", type: "money" },
    ],
  },
  {
    key: "commission",
    label: "Commission (sales by salesperson)",
    view: "report_invoices",
    dateField: "issue_date",
    statusExclude: ["draft", "void", "written_off"],
    groupBy: { key: "salesperson_name", emptyLabel: "Unassigned" },
    measures: [
      { out: "invoice_count", agg: "count" },
      { out: "total_sales", agg: "sum", src: "total_amount" },
    ],
    defaultGroupSort: { key: "total_sales", dir: "desc" },
    columns: [
      { key: "salesperson_name", label: "Salesperson", type: "text" },
      { key: "invoice_count", label: "Invoices", type: "number" },
      { key: "total_sales", label: "Total sales", type: "money" },
    ],
  },
  {
    key: "expense_by_category",
    label: "Expense by category",
    view: "report_expenses",
    dateField: "date",
    groupBy: { key: "category_name", emptyLabel: "Uncategorized" },
    measures: [
      { out: "expense_count", agg: "count" },
      { out: "amount", agg: "sum", src: "amount" },
      { out: "billable", agg: "sum", src: "billable_amount" },
    ],
    defaultGroupSort: { key: "amount", dir: "desc" },
    columns: [
      { key: "category_name", label: "Category", type: "text" },
      { key: "expense_count", label: "Expenses", type: "number" },
      { key: "amount", label: "Amount", type: "money" },
      { key: "billable", label: "Billable", type: "money" },
    ],
  },
  {
    key: "expense_by_customer",
    label: "Expense by customer",
    view: "report_expenses",
    dateField: "date",
    groupBy: { key: "customer_name", emptyLabel: "—" },
    measures: [
      { out: "expense_count", agg: "count" },
      { out: "amount", agg: "sum", src: "amount" },
      { out: "billable", agg: "sum", src: "billable_amount" },
    ],
    defaultGroupSort: { key: "amount", dir: "desc" },
    columns: [
      { key: "customer_name", label: "Customer", type: "text" },
      { key: "expense_count", label: "Expenses", type: "number" },
      { key: "amount", label: "Amount", type: "money" },
      { key: "billable", label: "Billable", type: "money" },
    ],
  },
  {
    key: "crm_pipeline_by_stage", label: "CRM · Pipeline by stage",
    view: "report_crm_pipeline_by_stage", defaultSort: { key: "sort_order", dir: "asc" },
    columns: [
      { key: "stage_name", label: "Stage", type: "text" },
      { key: "deal_count", label: "Deals", type: "number" },
      { key: "total_amount", label: "Total value", type: "money" },
      { key: "weighted_amount", label: "Weighted", type: "money" },
    ],
  },
  {
    key: "crm_pipeline_by_source", label: "CRM · Pipeline by source",
    view: "report_crm_pipeline_by_source", defaultSort: { key: "total_amount", dir: "desc" },
    columns: [
      { key: "source_name", label: "Source", type: "text" },
      { key: "deal_count", label: "Deals", type: "number" },
      { key: "total_amount", label: "Total value", type: "money" },
      { key: "weighted_amount", label: "Weighted", type: "money" },
    ],
  },
  {
    key: "crm_pipeline_by_owner", label: "CRM · Pipeline by owner",
    view: "report_crm_pipeline_by_owner", defaultSort: { key: "total_amount", dir: "desc" },
    columns: [
      { key: "owner_name", label: "Owner", type: "text" },
      { key: "deal_count", label: "Deals", type: "number" },
      { key: "total_amount", label: "Total value", type: "money" },
      { key: "weighted_amount", label: "Weighted", type: "money" },
    ],
  },
  {
    key: "crm_forecast_by_month", label: "CRM · Forecast by month",
    view: "report_crm_forecast_by_month", dateField: "period_month",
    defaultSort: { key: "period_month", dir: "asc" },
    columns: [
      { key: "period_month", label: "Month", type: "date" },
      { key: "deal_count", label: "Deals", type: "number" },
      { key: "total_amount", label: "Total value", type: "money" },
      { key: "weighted_amount", label: "Weighted", type: "money" },
    ],
  },
  {
    key: "crm_forecast_by_quarter", label: "CRM · Forecast by quarter",
    view: "report_crm_forecast_by_quarter", dateField: "period_quarter",
    defaultSort: { key: "period_quarter", dir: "asc" },
    columns: [
      { key: "period_quarter", label: "Quarter", type: "date" },
      { key: "deal_count", label: "Deals", type: "number" },
      { key: "total_amount", label: "Total value", type: "money" },
      { key: "weighted_amount", label: "Weighted", type: "money" },
    ],
  },
  {
    key: "crm_win_rate_by_stage", label: "CRM · Win rate by stage",
    view: "report_crm_win_rate_by_stage", defaultSort: { key: "sort_order", dir: "asc" },
    columns: [
      { key: "stage_name", label: "Stage", type: "text" },
      { key: "deals_reached", label: "Reached", type: "number" },
      { key: "deals_won", label: "Won", type: "number" },
      { key: "win_rate_pct", label: "Win rate %", type: "number" },
    ],
  },
  {
    key: "crm_avg_deal_cycle", label: "CRM · Average deal cycle",
    view: "report_crm_avg_deal_cycle",
    columns: [
      { key: "won_deals", label: "Won deals", type: "number" },
      { key: "avg_cycle_days", label: "Avg cycle (days)", type: "number" },
    ],
  },
  {
    key: "crm_lost_reason_breakdown", label: "CRM · Lost reason breakdown",
    view: "report_crm_lost_reason_breakdown", defaultSort: { key: "deal_count", dir: "desc" },
    columns: [
      { key: "lost_reason", label: "Lost reason", type: "text" },
      { key: "deal_count", label: "Deals", type: "number" },
      { key: "lost_amount", label: "Lost value", type: "money" },
    ],
  },
  {
    key: "crm_calls_by_user", label: "CRM · Calls by user",
    view: "report_crm_calls_by_user", defaultSort: { key: "call_count", dir: "desc" },
    columns: [
      { key: "user_name", label: "User", type: "text" },
      { key: "call_count", label: "Calls", type: "number" },
      { key: "completed_calls", label: "Completed", type: "number" },
    ],
  },
  {
    key: "crm_meetings_held", label: "CRM · Meetings held",
    view: "report_crm_meetings_held", dateField: "period_month",
    defaultSort: { key: "period_month", dir: "asc" },
    columns: [
      { key: "period_month", label: "Month", type: "date" },
      { key: "meetings_held", label: "Meetings", type: "number" },
    ],
  },
  {
    key: "crm_tasks_completed_vs_created", label: "CRM · Tasks created vs completed",
    view: "report_crm_tasks_completed_vs_created", dateField: "period_month",
    defaultSort: { key: "period_month", dir: "asc" },
    columns: [
      { key: "period_month", label: "Month", type: "date" },
      { key: "tasks_created", label: "Created", type: "number" },
      { key: "tasks_completed", label: "Completed", type: "number" },
    ],
  },
  {
    key: "crm_activity_to_deal_correlation", label: "CRM · Activity-to-deal correlation",
    view: "report_crm_activity_to_deal_correlation",
    columns: [
      { key: "outcome", label: "Outcome", type: "text" },
      { key: "deal_count", label: "Deals", type: "number" },
      { key: "avg_activities_per_deal", label: "Avg activities", type: "number" },
    ],
  },
  {
    key: "crm_leads_by_source", label: "CRM · Leads by source",
    view: "report_crm_leads_by_source", defaultSort: { key: "lead_count", dir: "desc" },
    columns: [
      { key: "source_name", label: "Source", type: "text" },
      { key: "lead_count", label: "Leads", type: "number" },
    ],
  },
  {
    key: "crm_lead_conversion_by_source", label: "CRM · Lead conversion by source",
    view: "report_crm_lead_conversion_by_source", defaultSort: { key: "total_leads", dir: "desc" },
    columns: [
      { key: "source_name", label: "Source", type: "text" },
      { key: "total_leads", label: "Leads", type: "number" },
      { key: "converted_leads", label: "Converted", type: "number" },
      { key: "conversion_pct", label: "Conversion %", type: "number" },
    ],
  },
  {
    key: "crm_lead_score_distribution", label: "CRM · Lead score distribution",
    view: "report_crm_lead_score_distribution", defaultSort: { key: "bucket_sort", dir: "asc" },
    columns: [
      { key: "score_bucket", label: "Score range", type: "text" },
      { key: "lead_count", label: "Leads", type: "number" },
    ],
  },
  {
    key: "crm_time_to_qualify", label: "CRM · Time to qualify",
    view: "report_crm_time_to_qualify",
    columns: [
      { key: "qualified_leads", label: "Qualified leads", type: "number" },
      { key: "avg_days_to_qualify", label: "Avg days to qualify", type: "number" },
    ],
  },
  {
    key: "crm_top_accounts_by_revenue", label: "CRM · Top accounts by revenue",
    view: "report_crm_top_accounts_by_revenue", defaultSort: { key: "total_collected", dir: "desc" },
    columns: [
      { key: "account_name", label: "Account", type: "text" },
      { key: "total_invoiced", label: "Invoiced", type: "money" },
      { key: "total_collected", label: "Collected", type: "money" },
      { key: "invoice_count", label: "Invoices", type: "number" },
    ],
  },
  {
    key: "crm_account_engagement", label: "CRM · Account engagement",
    view: "report_crm_account_engagement", defaultSort: { key: "activity_count", dir: "desc" },
    columns: [
      { key: "account_name", label: "Account", type: "text" },
      { key: "activity_count", label: "Activities", type: "number" },
      { key: "last_activity_at", label: "Last activity", type: "date" },
    ],
  },
  {
    key: "crm_campaign_roi", label: "CRM · Campaign ROI",
    view: "report_crm_campaign_roi", defaultSort: { key: "won_revenue", dir: "desc" },
    columns: [
      { key: "campaign_name", label: "Campaign", type: "text" },
      { key: "budget_amount", label: "Budget", type: "money" },
      { key: "attributed_leads", label: "Leads", type: "number" },
      { key: "attributed_deals", label: "Deals", type: "number" },
      { key: "won_revenue", label: "Won revenue", type: "money" },
      { key: "net", label: "Net", type: "money" },
      { key: "roi_pct", label: "ROI %", type: "number" },
    ],
  },
  {
    key: "crm_source_attribution", label: "CRM · Source attribution",
    view: "report_crm_source_attribution", defaultSort: { key: "lead_count", dir: "desc" },
    columns: [
      { key: "utm_source", label: "UTM source", type: "text" },
      { key: "lead_count", label: "Leads", type: "number" },
      { key: "converted_count", label: "Converted", type: "number" },
    ],
  },
  {
    key: "crm_salesperson_performance", label: "CRM · Salesperson performance",
    view: "report_crm_salesperson_performance", defaultSort: { key: "won_revenue", dir: "desc" },
    columns: [
      { key: "salesperson_name", label: "Salesperson", type: "text" },
      { key: "deals_won", label: "Won", type: "number" },
      { key: "deals_lost", label: "Lost", type: "number" },
      { key: "won_revenue", label: "Won revenue", type: "money" },
      { key: "total_invoiced", label: "Invoiced", type: "money" },
      { key: "total_paid", label: "Paid", type: "money" },
      { key: "commission_on_paid", label: "Commission", type: "money" },
    ],
  },
];

function fmtCell(row: any, col: Col): string {
  const v = row[col.key];
  if (col.type === "money") return formatMoney(v, row.currency_code);
  if (col.type === "date") return formatDate(v);
  if (col.type === "bool") return v ? "Yes" : "—";
  if (v === null || v === undefined) return "—";
  return String(v);
}

function csvValue(row: any, col: Col): string {
  const v = row[col.key];
  if (v === null || v === undefined) return "";
  if (col.type === "bool") return v ? "Yes" : "No";
  return String(v);
}

function downloadCsv(name: string, cols: Col[], rows: any[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = cols.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => cols.map((c) => esc(csvValue(r, c))).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPdf(name: string, title: string, cols: Col[], rows: any[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const usableW = pageW - margin * 2;
  const colW = usableW / cols.length;
  const rowH = 16;
  const fit = (s: string) => {
    const max = Math.max(3, Math.floor((colW - 6) / 4.4));
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  };
  let y = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, margin, y);
  y += 20;
  doc.setFontSize(8);
  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    cols.forEach((c, i) => {
      const x = margin + i * colW;
      const right = c.type === "money" || c.type === "number";
      doc.text(fit(String(c.label)), right ? x + colW - 4 : x + 2, y, { align: right ? "right" : "left" });
    });
    y += 4;
    doc.line(margin, y, margin + usableW, y);
    y += rowH - 4;
    doc.setFont("helvetica", "normal");
  };
  drawHeader();
  for (const r of rows) {
    if (y > pageH - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
    cols.forEach((c, i) => {
      const x = margin + i * colW;
      const right = c.type === "money" || c.type === "number";
      doc.text(fit(fmtCell(r, c)), right ? x + colW - 4 : x + 2, y, { align: right ? "right" : "left" });
    });
    y += rowH;
  }
  doc.save(`${name}.pdf`);
}

function aggregate(rows: any[], report: ReportDef): any[] {
  const gb = report.groupBy!;
  const exclude = new Set(report.statusExclude ?? []);
  const groups = new Map<string, any>();
  for (const r of rows) {
    if (exclude.size && exclude.has(String(r.status))) continue;
    const raw = r[gb.key];
    const label = raw === null || raw === undefined || raw === "" ? (gb.emptyLabel ?? "—") : String(raw);
    let g = groups.get(label);
    if (!g) {
      g = { [gb.key]: label, currency_code: r.currency_code };
      for (const m of report.measures ?? []) g[m.out] = 0;
      groups.set(label, g);
    }
    for (const m of report.measures ?? []) {
      if (m.agg === "count") g[m.out] += 1;
      else g[m.out] += Number(r[m.src ?? m.out] ?? 0);
    }
  }
  let out = Array.from(groups.values());
  for (const g of out) for (const m of report.measures ?? []) if (m.agg === "sum") g[m.out] = Math.round(g[m.out] * 100) / 100;
  const s = report.defaultGroupSort;
  if (s) out.sort((a, b) => {
    const av = a[s.key], bv = b[s.key];
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return s.dir === "asc" ? cmp : -cmp;
  });
  return out;
}

export default function OperationsReports() {
  const [reportKey, setReportKey] = useState(REPORTS[0].key);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hidden, setHidden] = useState<Record<string, Set<string>>>({});

  const report = useMemo(() => REPORTS.find((r) => r.key === reportKey)!, [reportKey]);
  const hiddenSet = hidden[reportKey] ?? new Set<string>();
  const visibleCols = report.columns.filter((c) => !hiddenSet.has(c.key));

  const rowsQ = useQuery({
    queryKey: ["ops", "report", reportKey, report.dateField ? from : "", report.dateField ? to : ""],
    queryFn: async () => {
      let q: any = (opsSupabase as any).from(report.view).select("*");
      if (report.dateField && from) q = q.gte(report.dateField, from);
      if (report.dateField && to) q = q.lte(report.dateField, to);
      if (report.defaultSort) q = q.order(report.defaultSort.key, { ascending: report.defaultSort.dir === "asc" });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const rows = rowsQ.data ?? [];
  const displayRows = useMemo(() => (report.groupBy ? aggregate(rows, report) : rows), [rows, report]);

  function toggleCol(key: string) {
    setHidden((prev) => {
      const cur = new Set(prev[reportKey] ?? []);
      if (cur.has(key)) cur.delete(key); else cur.add(key);
      return { ...prev, [reportKey]: cur };
    });
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Operations · Reporting</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Report</Label>
              <Select value={reportKey} onValueChange={(v) => setReportKey(v)}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORTS.map((r) => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {report.dateField && (
              <>
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </>
            )}
            <div className="flex gap-2 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {report.columns.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.key}
                      checked={!hiddenSet.has(c.key)}
                      onCheckedChange={() => toggleCol(c.key)}
                    >
                      {c.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                onClick={() => downloadCsv(report.key, visibleCols, displayRows)}
                disabled={displayRows.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const range = report.dateField && (from || to) ? ` (${from || "…"} to ${to || "…"})` : "";
                  downloadPdf(report.key, report.label + range, visibleCols, displayRows);
                }}
                disabled={displayRows.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{report.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {rowsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : displayRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleCols.map((c) => (
                      <TableHead key={c.key} className={c.type === "money" || c.type === "number" ? "text-right" : ""}>{c.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map((r, i) => (
                    <TableRow key={i}>
                      {visibleCols.map((c) => (
                        <TableCell key={c.key} className={c.type === "money" || c.type === "number" ? "text-right" : ""}>{fmtCell(r, c)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
