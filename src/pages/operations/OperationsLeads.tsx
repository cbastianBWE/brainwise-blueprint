import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowRightLeft, Mail } from "lucide-react";
import LeadFormDialog from "./LeadFormDialog";
import ConvertLeadDialog from "./ConvertLeadDialog";
import SavedViewsBar from "./SavedViewsBar";

type Filters = { search?: string; status_id?: string; pool?: string; attention?: string };

const POOL_LABELS: Record<string, string> = {
  enterprise: "Enterprise",
  coach: "Practitioner",
  faith: "Faith",
  clinical: "Clinical",
};

const ATTENTION_META: Record<string, { label: string; cls: string; rank: number }> = {
  replied:        { label: "Replied",   cls: "bg-emerald-100 text-emerald-900", rank: 1 },
  send_failed:    { label: "Failed",    cls: "bg-red-100 text-red-900",         rank: 2 },
  sequence_done:  { label: "No reply",  cls: "bg-amber-100 text-amber-900",     rank: 3 },
  awaiting_reply: { label: "Awaiting",  cls: "bg-slate-100 text-slate-700",     rank: 4 },
  opted_out:      { label: "Opted out", cls: "bg-slate-100 text-slate-500",     rank: 5 },
};

export default function OperationsLeads() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({});

  const { data: statuses = [] } = useQuery({
    queryKey: ["ops", "lead_statuses"],
    queryFn: async () => {
      const { data, error } = await opsSupabase.from("lead_statuses" as any).select("id, name").order("position");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: poolCounts = [] } = useQuery({
    queryKey: ["ops", "lead_pool_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_lead_pool_counts" as any, {});
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["ops", "leads", "list", filters],
    queryFn: async () => {
      let q = opsSupabase
        .from("leads" as any)
        .select("id, salutation, first_name, last_name, company_name_text, email, phone, score, outreach_pool, created_at, status:lead_statuses(name,color), source:picklist_values!leads_source_id_fkey(label)")
        .is("archived_at", null);
      if (filters.search) {
        const s = filters.search.replace(/[,()]/g, "");
        q = q.or(`company_name_text.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
      }
      if (filters.status_id) q = q.eq("status_id", filters.status_id);
      if (filters.pool) q = q.eq("outreach_pool", filters.pool);
      q = q.order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const allIds = useMemo(() => (data ?? []).map((l: any) => l.id), [data]);
  const allSelected = allIds.length > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(allIds) : new Set());
  };
  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id); else next.delete(id);
    setSelected(next);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-muted-foreground text-sm">CRM · Leads</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="outline" onClick={() => setConvertOpen(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />Convert selected ({selected.size})
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New lead
          </Button>
        </div>
      </div>

      <SavedViewsBar entityType="lead" filters={filters} onApply={(f) => setFilters(f as Filters)} />

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filters.pool ? "outline" : "default"}
          size="sm"
          onClick={() => setFilters({ ...filters, pool: undefined })}
        >
          All
        </Button>
        {poolCounts.map((p: any) => (
          <Button
            key={p.pool}
            variant={filters.pool === p.pool ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setFilters({ ...filters, pool: filters.pool === p.pool ? undefined : p.pool })
            }
          >
            {POOL_LABELS[p.pool] ?? p.pool}
            <span className="ml-2 text-xs opacity-70">{p.untouched}/{p.total}</span>
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search company, name, email…"
          className="w-[260px]"
          value={filters.search ?? ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
        />
        <Select
          value={filters.status_id ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, status_id: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>All leads</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : error ? (
            <p className="text-destructive text-sm">Failed to load leads.</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No leads yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected || (someSelected ? "indeterminate" : false)}
                      onCheckedChange={(v) => toggleAll(!!v)}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Pool</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((l: any) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/operations/leads/${l.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(l.id)}
                        onCheckedChange={(v) => toggleOne(l.id, !!v)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{[l.first_name, l.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{l.company_name_text ?? "—"}</TableCell>
                    <TableCell>
                      {l.outreach_pool ? (POOL_LABELS[l.outreach_pool] ?? l.outreach_pool) : "—"}
                    </TableCell>
                    <TableCell>{l.email ?? "—"}</TableCell>
                    <TableCell>{l.status?.name ?? "—"}</TableCell>
                    <TableCell>{l.score ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <LeadFormDialog open={createOpen} onOpenChange={setCreateOpen} row={null} />
      <ConvertLeadDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        leadIds={Array.from(selected)}
        onConverted={() => {
          setSelected(new Set());
          qc.invalidateQueries({ queryKey: ["ops", "leads", "list"] });
        }}
      />
    </div>
  );
}
