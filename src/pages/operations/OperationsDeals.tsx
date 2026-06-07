import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { formatMoney, formatDate } from "./_shared";
import DealFormDialog from "./DealFormDialog";
import SavedViewsBar from "./SavedViewsBar";

type Filters = { search?: string; stage_id?: string };

export default function OperationsDeals() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [filters, setFilters] = useState<Filters>({});

  const { data: defaultPipeline } = useQuery({
    queryKey: ["ops", "default_pipeline"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("pipelines" as any)
        .select("id")
        .eq("is_default", true)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["ops", "deal_stages", defaultPipeline?.id],
    enabled: !!defaultPipeline?.id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("deal_stages" as any)
        .select("id, name")
        .eq("pipeline_id", defaultPipeline.id)
        .order("position");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["ops", "deals", "list", filters],
    queryFn: async () => {
      let q = opsSupabase
        .from("deals" as any)
        .select("id, name, amount, currency_code, close_date, created_at, account_id, pipeline_id, stage_id, stage:deal_stages(name), account:accounts(name)");
      if (filters.search) {
        const s = filters.search.replace(/[,()]/g, "");
        q = q.or(`name.ilike.%${s}%`);
      }
      if (filters.stage_id) q = q.eq("stage_id", filters.stage_id);
      q = q.order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Deals</h1>
          <p className="text-muted-foreground text-sm">CRM · Deals</p>
        </div>
        <Button onClick={() => { setEditRow(null); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />New deal
        </Button>
      </div>

      <SavedViewsBar entityType="deal" filters={filters} onApply={(f) => setFilters(f as Filters)} />

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search name…"
          className="w-[260px]"
          value={filters.search ?? ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
        />
        <Select
          value={filters.stage_id ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, stage_id: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {stages.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>All deals</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : error ? (
            <p className="text-destructive text-sm">Failed to load deals.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No deals yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Close date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d: any) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/operations/deals/${d.id}`)}
                  >
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.account?.name ?? "—"}</TableCell>
                    <TableCell>{formatMoney(d.amount, d.currency_code)}</TableCell>
                    <TableCell>{d.stage?.name ?? "—"}</TableCell>
                    <TableCell>{formatDate(d.close_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <DealFormDialog open={createOpen} onOpenChange={setCreateOpen} row={editRow} />
    </div>
  );
}
