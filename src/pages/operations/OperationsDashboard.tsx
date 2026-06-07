import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { formatMoney, formatDate } from "./_shared";

const NAVY = "#021F36";
const ORANGE = "#F5741A";
const TEAL = "#006D77";

function useView(key: string, view: string, order?: { col: string; asc: boolean }) {
  return useQuery({
    queryKey: ["ops", "dashboard", key],
    queryFn: async () => {
      let q: any = (opsSupabase as any).from(view).select("*");
      if (order) q = q.order(order.col, { ascending: order.asc });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

type ColDef = { k: string; h: string; right?: boolean; fmt?: (v: any) => string };

function SimpleTable({ q, cols, empty }: { q: any; cols: ColDef[]; empty: string }) {
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (q.error) return <p className="text-sm text-destructive">Failed to load.</p>;
  const rows = q.data ?? [];
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {cols.map((c) => (
            <TableHead key={c.k} className={c.right ? "text-right" : ""}>{c.h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r: any, i: number) => (
          <TableRow key={i}>
            {cols.map((c) => {
              const v = r[c.k];
              const text = c.fmt ? c.fmt(v) : (v == null ? "—" : String(v));
              return (
                <TableCell key={c.k} className={c.right ? "text-right" : ""}>{text}</TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function OperationsDashboard() {
  const pipelineQ = useView("pipeline-by-stage", "report_crm_pipeline_by_stage", { col: "sort_order", asc: true });
  const forecastQ = useView("forecast-by-month", "report_crm_forecast_by_month", { col: "period_month", asc: true });
  const winRateQ = useView("win-rate", "report_crm_win_rate_by_stage", { col: "sort_order", asc: true });
  const leadsBySourceQ = useView("leads-by-source", "report_crm_leads_by_source", { col: "lead_count", asc: false });
  const topAccountsQ = useView("top-accounts", "report_crm_top_accounts_by_revenue", { col: "total_collected", asc: false });
  const lostQ = useView("lost-reasons", "report_crm_lost_reason_breakdown", { col: "deal_count", asc: false });
  const cycleQ = useView("avg-cycle", "report_crm_avg_deal_cycle");
  const ttqQ = useView("time-to-qualify", "report_crm_time_to_qualify");

  const openWeighted = useMemo(
    () => (pipelineQ.data ?? []).reduce((s: number, r: any) => s + Number(r.weighted_amount ?? 0), 0),
    [pipelineQ.data]
  );
  const openDeals = useMemo(
    () => (pipelineQ.data ?? []).reduce((s: number, r: any) => s + Number(r.deal_count ?? 0), 0),
    [pipelineQ.data]
  );
  const avgCycle = cycleQ.data?.[0]?.avg_cycle_days;
  const avgTtq = ttqQ.data?.[0]?.avg_days_to_qualify;

  const pipelineChart = (pipelineQ.data ?? []).map((r: any) => ({
    stage: r.stage_name,
    Total: Number(r.total_amount ?? 0),
    Weighted: Number(r.weighted_amount ?? 0),
  }));
  const forecastChart = (forecastQ.data ?? []).map((r: any) => ({
    month: formatDate(r.period_month),
    Total: Number(r.total_amount ?? 0),
    Weighted: Number(r.weighted_amount ?? 0),
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">CRM Dashboard</h1>
        <p className="text-sm text-muted-foreground">Operations · CRM overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Open weighted pipeline" value={formatMoney(openWeighted, "USD")} />
        <Kpi label="Open deals" value={String(openDeals)} />
        <Kpi label="Avg deal cycle (days)" value={avgCycle == null ? "—" : String(avgCycle)} />
        <Kpi label="Avg time to qualify (days)" value={avgTtq == null ? "—" : String(avgTtq)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Pipeline by stage</CardTitle></CardHeader>
          <CardContent>
            {pipelineQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
              : pipelineChart.length === 0 ? <p className="text-sm text-muted-foreground">No open deals.</p>
              : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={pipelineChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => formatMoney(Number(v), "USD")} />
                    <Legend />
                    <Bar dataKey="Total" fill={NAVY} />
                    <Bar dataKey="Weighted" fill={ORANGE} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Forecast by month</CardTitle></CardHeader>
          <CardContent>
            {forecastQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
              : forecastChart.length === 0 ? <p className="text-sm text-muted-foreground">No deals with close dates.</p>
              : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={forecastChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => formatMoney(Number(v), "USD")} />
                    <Legend />
                    <Bar dataKey="Total" fill={NAVY} />
                    <Bar dataKey="Weighted" fill={ORANGE} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Win rate by stage</CardTitle></CardHeader>
          <CardContent>
            <SimpleTable q={winRateQ} empty="No data." cols={[
              { k: "stage_name", h: "Stage" },
              { k: "total_deals", h: "Deals", right: true },
              { k: "won_deals", h: "Won", right: true },
              { k: "win_rate_pct", h: "Win rate", right: true, fmt: (v) => v == null ? "—" : `${v}%` },
            ]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Leads by source</CardTitle></CardHeader>
          <CardContent>
            <SimpleTable q={leadsBySourceQ} empty="No leads." cols={[
              { k: "source", h: "Source" },
              { k: "lead_count", h: "Leads", right: true },
            ]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top accounts by revenue</CardTitle></CardHeader>
          <CardContent>
            <SimpleTable q={topAccountsQ} empty="No accounts." cols={[
              { k: "account_name", h: "Account" },
              { k: "total_collected", h: "Collected", right: true, fmt: (v) => formatMoney(v, "USD") },
              { k: "total_invoiced", h: "Invoiced", right: true, fmt: (v) => formatMoney(v, "USD") },
            ]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Lost reason breakdown</CardTitle></CardHeader>
          <CardContent>
            <SimpleTable q={lostQ} empty="No lost deals." cols={[
              { k: "lost_reason", h: "Reason" },
              { k: "deal_count", h: "Deals", right: true },
              { k: "lost_value", h: "Lost value", right: true, fmt: (v) => formatMoney(v, "USD") },
            ]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
