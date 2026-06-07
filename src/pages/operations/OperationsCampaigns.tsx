import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import CampaignFormDialog from "./CampaignFormDialog";
import { formatDate } from "./_shared";

type Filters = { search?: string; status?: string };

const STATUSES = ["planned", "active", "completed"];

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "active") return "default";
  if (s === "completed") return "secondary";
  return "outline";
}

export default function OperationsCampaigns() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [filters, setFilters] = useState<Filters>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["ops", "campaigns", "list", filters],
    queryFn: async () => {
      let q = opsSupabase
        .from("campaigns" as any)
        .select("id, name, type, status, start_date, end_date, budget_amount, currency_code, description");
      if (filters.search) {
        const s = filters.search.replace(/[,()]/g, "");
        q = q.ilike("name", `%${s}%`);
      }
      if (filters.status) q = q.eq("status", filters.status);
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
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-muted-foreground text-sm">CRM · Marketing campaigns</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New campaign
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search name…"
          className="w-[260px]"
          value={filters.search ?? ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
        />
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>All campaigns</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : error ? (
            <p className="text-destructive text-sm">Failed to load campaigns.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No campaigns yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c: any) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setEditRow(c)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="capitalize">{c.type ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)} className="capitalize">{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.budget_amount != null
                        ? `${c.currency_code ?? "USD"} ${Number(c.budget_amount).toLocaleString()}`
                        : "—"}
                    </TableCell>
                    <TableCell>{c.start_date ? formatDate(c.start_date) : "—"}</TableCell>
                    <TableCell>{c.end_date ? formatDate(c.end_date) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CampaignFormDialog open={createOpen} onOpenChange={setCreateOpen} row={null} />
      <CampaignFormDialog
        open={!!editRow}
        onOpenChange={(o) => { if (!o) setEditRow(null); }}
        row={editRow}
      />
    </div>
  );
}
