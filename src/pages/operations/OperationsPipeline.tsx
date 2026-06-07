import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatMoney, formatDate } from "./_shared";
import DealFormDialog from "./DealFormDialog";

type Stage = { id: string; name: string; sort_order: number };
type Deal = {
  id: string;
  name: string;
  amount: number | null;
  currency_code: string | null;
  stage_id: string;
  close_date: string | null;
  account?: { name?: string | null } | null;
};
type Health = { deal_id: string; is_rotting: boolean | null; is_stale_no_activity: boolean | null; has_next_activity: boolean | null };

export default function OperationsPipeline() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const pipelineQ = useQuery({
    queryKey: ["ops", "pipeline", "default"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("pipelines" as any)
        .select("id")
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });
  const pipelineId: string | null = (pipelineQ.data as any)?.id ?? null;

  const stagesQ = useQuery({
    queryKey: ["ops", "pipeline", "stages", pipelineId],
    enabled: !!pipelineId,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("deal_stages" as any)
        .select("id, name, sort_order")
        .eq("pipeline_id", pipelineId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Stage[];
    },
  });

  const dealsQ = useQuery({
    queryKey: ["ops", "pipeline", "deals"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("deals" as any)
        .select("id, name, amount, currency_code, stage_id, close_date, owner:users(full_name), account:accounts(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Deal[];
    },
  });

  const healthQ = useQuery({
    queryKey: ["ops", "pipeline", "health"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("deal_pipeline_health" as any)
        .select("deal_id, is_rotting, is_stale_no_activity, has_next_activity");
      if (error) throw error;
      return (data ?? []) as unknown as Health[];
    },
  });

  const healthMap = useMemo(() => {
    const m = new Map<string, Health>();
    (healthQ.data ?? []).forEach((h) => m.set(h.deal_id, h));
    return m;
  }, [healthQ.data]);

  const dealsByStage = useMemo(() => {
    const m = new Map<string, Deal[]>();
    (dealsQ.data ?? []).forEach((d) => {
      const arr = m.get(d.stage_id) ?? [];
      arr.push(d);
      m.set(d.stage_id, arr);
    });
    return m;
  }, [dealsQ.data]);

  const handleDrop = async (e: React.DragEvent, columnStageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/plain");
    if (!dealId) return;
    const deal = (dealsQ.data ?? []).find((d) => d.id === dealId);
    if (!deal || deal.stage_id === columnStageId) return;
    try {
      const { error } = await opsSupabase
        .from("deals" as any)
        .update({ stage_id: columnStageId })
        .eq("id", dealId);
      if (error) throw error;
      toast.success("Deal moved");
      qc.invalidateQueries({ queryKey: ["ops", "pipeline", "deals"] });
      qc.invalidateQueries({ queryKey: ["ops", "pipeline", "health"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to move deal");
    }
  };

  const loading = pipelineQ.isLoading || stagesQ.isLoading || dealsQ.isLoading;
  const stages = stagesQ.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="text-muted-foreground text-sm">CRM · Deals</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New deal
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : !pipelineId ? (
        <p className="text-muted-foreground text-sm">No default pipeline configured.</p>
      ) : stages.length === 0 ? (
        <p className="text-muted-foreground text-sm">No active stages on the default pipeline.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = dealsByStage.get(stage.id) ?? [];
            const sum = stageDeals.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
            const cur = stageDeals[0]?.currency_code || "USD";
            return (
              <Card
                key={stage.id}
                className="w-72 shrink-0 bg-muted/30"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{stage.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">{stageDeals.length}</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{formatMoney(sum, cur)}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stageDeals.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">—</p>
                  ) : (
                    stageDeals.map((d) => {
                      const h = healthMap.get(d.id);
                      const rotting = !!h?.is_rotting;
                      const stale = !!h?.is_stale_no_activity;
                      return (
                        <div
                          key={d.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)}
                          onClick={() => navigate(`/operations/deals/${d.id}`)}
                          className={`cursor-pointer rounded-md border bg-background p-3 shadow-sm hover:shadow transition ${rotting ? "border-l-4 border-l-amber-500" : ""}`}
                        >
                          <div className="font-semibold text-sm">{d.name}</div>
                          <div className="text-xs text-muted-foreground">{d.account?.name ?? "—"}</div>
                          <div className="text-xs mt-1">{formatMoney(d.amount, d.currency_code)}</div>
                          {d.close_date && (
                            <div className="text-xs text-muted-foreground">Close {formatDate(d.close_date)}</div>
                          )}
                          {stale && (
                            <Badge variant="secondary" className="mt-2 text-[10px]">No next step</Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DealFormDialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) {
            qc.invalidateQueries({ queryKey: ["ops", "pipeline", "deals"] });
            qc.invalidateQueries({ queryKey: ["ops", "pipeline", "health"] });
          }
        }}
      />
    </div>
  );
}
