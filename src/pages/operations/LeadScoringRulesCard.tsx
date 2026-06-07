import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RULE_TYPES = ["demographic", "behavioral", "decay"] as const;
const DEMOGRAPHIC_FIELDS = ["industry_id", "source_id", "employee_count_band", "revenue_band", "rating", "title", "company_name_text"];
const OPERATORS = ["eq", "neq", "in", "contains", "is_null", "is_not_null", "gt", "gte", "lt", "lte"];
const BEHAVIORAL_EVENTS = ["form_filled", "email_opened", "email_clicked", "unsubscribed"];
const APPLIES_TO = ["lead", "contact", "both"];
const NO_VALUE_OPS = new Set(["is_null", "is_not_null"]);

type Draft = {
  id: string | null; name: string; rule_type: string; applies_to: string;
  score_adjustment: string; sort_order: string; is_active: boolean;
  field: string; operator: string; value: string; event: string; points_per_week: string;
};

const emptyDraft = (): Draft => ({
  id: null, name: "", rule_type: "demographic", applies_to: "lead",
  score_adjustment: "0", sort_order: "0", is_active: true,
  field: "industry_id", operator: "eq", value: "", event: "form_filled", points_per_week: "1",
});

function draftFromRow(r: any): Draft {
  const tc = r.trigger_condition ?? {};
  return {
    id: r.id, name: r.name ?? "", rule_type: r.rule_type ?? "demographic",
    applies_to: r.applies_to ?? "lead", score_adjustment: String(r.score_adjustment ?? 0),
    sort_order: String(r.sort_order ?? 0), is_active: r.is_active !== false,
    field: tc.field ?? "industry_id", operator: tc.operator ?? "eq",
    value: Array.isArray(tc.value) ? tc.value.join(", ") : (tc.value ?? "").toString(),
    event: tc.event ?? "form_filled", points_per_week: String(tc.points_per_week ?? 1),
  };
}

function conditionSummary(r: any): string {
  const tc = r.trigger_condition ?? {};
  if (r.rule_type === "demographic") {
    const val = Array.isArray(tc.value) ? tc.value.join(", ") : tc.value;
    return NO_VALUE_OPS.has(tc.operator) ? `${tc.field} ${tc.operator}` : `${tc.field} ${tc.operator} ${val ?? ""}`;
  }
  if (r.rule_type === "behavioral") return tc.event ?? "—";
  if (r.rule_type === "decay") return `${tc.points_per_week ?? 0}/week`;
  return "—";
}

function buildTriggerCondition(d: Draft): any {
  if (d.rule_type === "demographic") {
    const base: any = { field: d.field, operator: d.operator };
    if (!NO_VALUE_OPS.has(d.operator)) {
      base.value = d.operator === "in"
        ? d.value.split(",").map((s) => s.trim()).filter(Boolean)
        : d.value.trim();
    }
    return base;
  }
  if (d.rule_type === "behavioral") return { event: d.event };
  if (d.rule_type === "decay") return { points_per_week: Number(d.points_per_week || 0) };
  return {};
}

export default function LeadScoringRulesCard() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const rulesQ = useQuery({
    queryKey: ["ops", "scoring-rules"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("lead_scoring_rules" as any).select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    const payload: any = {
      name: draft.name.trim(), rule_type: draft.rule_type,
      trigger_condition: buildTriggerCondition(draft),
      score_adjustment: draft.rule_type === "decay" ? 0 : Number(draft.score_adjustment || 0),
      applies_to: draft.applies_to, sort_order: Number(draft.sort_order || 0), is_active: draft.is_active,
    };
    try {
      if (draft.id) {
        const { error } = await opsSupabase.from("lead_scoring_rules" as any).update(payload).eq("id", draft.id);
        if (error) throw error;
        toast.success("Scoring rule updated");
      } else {
        const { error } = await opsSupabase.from("lead_scoring_rules" as any).insert(payload);
        if (error) throw error;
        toast.success("Scoring rule created");
      }
      qc.invalidateQueries({ queryKey: ["ops", "scoring-rules"] });
      setDraft(null);
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this scoring rule?")) return;
    const { error } = await opsSupabase.from("lead_scoring_rules" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["ops", "scoring-rules"] });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lead scoring rules</CardTitle>
        <Button size="sm" onClick={() => setDraft(emptyDraft())}>Add rule</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scores recompute on the daily decay run and when a lead is recomputed. Demographic and
          behavioral rules add their adjustment when matched; decay rules subtract points per week of inactivity.
        </p>

        {rulesQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Adjustment</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rulesQ.data ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.rule_type}</TableCell>
                  <TableCell className="text-xs">{conditionSummary(r)}</TableCell>
                  <TableCell>{r.rule_type === "decay" ? "—" : r.score_adjustment}</TableCell>
                  <TableCell>{r.applies_to}</TableCell>
                  <TableCell>{r.is_active ? "Yes" : "No"}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setDraft(draftFromRow(r))}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => remove(r.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {(rulesQ.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No scoring rules.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{draft?.id ? "Edit scoring rule" : "Add scoring rule"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rule type</Label>
                  <Select value={draft.rule_type} onValueChange={(v) => set("rule_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Applies to</Label>
                  <Select value={draft.applies_to} onValueChange={(v) => set("applies_to", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {APPLIES_TO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {draft.rule_type === "demographic" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Field</Label>
                    <Select value={draft.field} onValueChange={(v) => set("field", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEMOGRAPHIC_FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Operator</Label>
                    <Select value={draft.operator} onValueChange={(v) => set("operator", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {!NO_VALUE_OPS.has(draft.operator) && (
                    <div className="space-y-2 col-span-2">
                      <Label>Value</Label>
                      <Input value={draft.value} onChange={(e) => set("value", e.target.value)} />
                      {draft.operator === "in" && <p className="text-xs text-muted-foreground">Comma-separated for multiple values.</p>}
                    </div>
                  )}
                </div>
              )}

              {draft.rule_type === "behavioral" && (
                <div className="space-y-2">
                  <Label>Event</Label>
                  <Select value={draft.event} onValueChange={(v) => set("event", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BEHAVIORAL_EVENTS.map((ev) => <SelectItem key={ev} value={ev}>{ev}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {draft.rule_type === "decay" && (
                <div className="space-y-2">
                  <Label>Points per week of inactivity</Label>
                  <Input type="number" value={draft.points_per_week} onChange={(e) => set("points_per_week", e.target.value)} />
                </div>
              )}

              {draft.rule_type !== "decay" && (
                <div className="space-y-2">
                  <Label>Score adjustment</Label>
                  <Input type="number" value={draft.score_adjustment} onChange={(e) => set("score_adjustment", e.target.value)} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sort order</Label>
                  <Input type="number" value={draft.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="lsr-active">Active</Label>
                  <Switch id="lsr-active" checked={draft.is_active} onCheckedChange={(v) => set("is_active", v)} />
                </div>
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
