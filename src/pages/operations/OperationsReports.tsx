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
                onClick={() => downloadCsv(report.key, visibleCols, rows)}
                disabled={rows.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
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
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleCols.map((c) => (
                      <TableHead key={c.key}>{c.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      {visibleCols.map((c) => (
                        <TableCell key={c.key}>{fmtCell(r, c)}</TableCell>
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
