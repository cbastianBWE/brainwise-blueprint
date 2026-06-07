import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KIND_LABELS: Record<string, string> = {
  won_to_customer: "Won deal → customer",
  deal_stale: "Stale deal task",
  lead_qualified_assign: "Assign qualified lead",
  deal_discovery_task: "Discovery call task",
};

type Draft = {
  id: string; name: string; description: string; is_active: boolean;
  kind: string; trigger_config: any; delay_minutes: string; stale_days: string; stage_name: string;
};

function draftFromRow(r: any): Draft {
  const tc = r.trigger_config ?? {};
  return {
    id: r.id, name: r.name ?? "", description: r.description ?? "", is_active: r.is_active !== false,
    kind: tc.kind ?? "", trigger_config: tc,
    delay_minutes: String(tc.delay_minutes ?? 5), stale_days: String(tc.stale_days ?? 14),
    stage_name: tc.stage_name ?? "Discovery",
  };
}

function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function WorkflowRulesCard() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const rulesQ = useQuery({
    queryKey: ["ops", "workflow-rules"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("workflow_rules" as any).select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    const tc: any = { ...(draft.trigger_config ?? {}), kind: draft.kind };
    if (draft.kind === "won_to_customer") tc.delay_minutes = Number(draft.delay_minutes || 0);
    if (draft.kind === "deal_stale") tc.stale_days = Number(draft.stale_days || 0);
    if (draft.kind === "deal_discovery_task") tc.stage_name = draft.stage_name.trim() || "Discovery";
    const payload = {
      name: draft.name.trim(), description: draft.description.trim() || null,
      is_active: draft.is_active, trigger_config: tc,
    };
    try {
      const { error } = await opsSupabase.from("workflow_rules" as any).update(payload).eq("id", draft.id);
      if (error) throw error;
      toast.success("Workflow rule updated");
      qc.invalidateQueries({ queryKey: ["ops", "workflow-rules"] });
      setDraft(null);
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  }

  async function toggleActive(r: any) {
    const { error } = await opsSupabase.from("workflow_rules" as any).update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["ops", "workflow-rules"] });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Workflow automation rules</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The automation engine runs every 5 minutes and acts on these built-in rules. You can enable or
          disable each rule and tune its parameters. New rule kinds are not added here because the engine
          only recognizes the built-in kinds.
        </p>

        {rulesQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rulesQ.data ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{KIND_LABELS[r.trigger_config?.kind] ?? (r.trigger_config?.kind ?? "—")}</TableCell>
                  <TableCell><Switch checked={!!r.is_active} onCheckedChange={() => toggleActive(r)} /></TableCell>
                  <TableCell className="text-xs">{fmtDateTime(r.last_executed_at)}</TableCell>
                  <TableCell>{r.execution_count ?? 0}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setDraft(draftFromRow(r))}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
              {(rulesQ.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No workflow rules.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Edit workflow rule</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Kind</Label>
                <Input value={KIND_LABELS[draft.kind] ?? draft.kind} disabled />
              </div>

              {draft.kind === "won_to_customer" && (
                <div className="space-y-2">
                  <Label>Delay before creating customer (minutes)</Label>
                  <Input type="number" value={draft.delay_minutes} onChange={(e) => set("delay_minutes", e.target.value)} />
                  <p className="text-xs text-muted-foreground">Grace period so a won deal reverted quickly does not create a customer.</p>
                </div>
              )}
              {draft.kind === "deal_stale" && (
                <div className="space-y-2">
                  <Label>Stale after (days in stage)</Label>
                  <Input type="number" value={draft.stale_days} onChange={(e) => set("stale_days", e.target.value)} />
                </div>
              )}
              {draft.kind === "deal_discovery_task" && (
                <div className="space-y-2">
                  <Label>Trigger stage name</Label>
                  <Input value={draft.stage_name} onChange={(e) => set("stage_name", e.target.value)} />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="wf-active">Active</Label>
                <Switch id="wf-active" checked={draft.is_active} onCheckedChange={(v) => set("is_active", v)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
