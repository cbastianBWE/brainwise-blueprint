import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { formatMoney, formatDate } from "./_shared";
import DealFormDialog from "./DealFormDialog";

const NONE = "__none__";

export default function OperationsDealDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const dealQ = useQuery({
    queryKey: ["ops", "deal", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("deals" as any)
        .select("id, name, amount, currency_code, probability, expected_revenue, close_date, actual_close_date, type, next_step_text, description, account_id, stage_id, pipeline_id, won_reason, lost_reason, stage:deal_stages(name,is_won,is_lost), account:accounts(id,name), owner:users(full_name), primary_contact:contact_persons(first_name,last_name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
  const deal = dealQ.data;

  const stagesQ = useQuery({
    queryKey: ["ops", "deal", "stages", deal?.pipeline_id],
    enabled: !!deal?.pipeline_id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("deal_stages" as any)
        .select("id, name")
        .eq("pipeline_id", deal.pipeline_id)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const handleStageChange = async (newStageId: string) => {
    if (!deal || newStageId === deal.stage_id) return;
    try {
      const { error } = await opsSupabase
        .from("deals" as any)
        .update({ stage_id: newStageId })
        .eq("id", id);
      if (error) throw error;
      toast.success("Stage updated");
      qc.invalidateQueries({ queryKey: ["ops", "deal", id] });
      qc.invalidateQueries({ queryKey: ["ops", "deal", "timeline", id] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update stage");
    }
  };

  const handleCreateCustomer = async () => {
    try {
      const { error } = await supabase.rpc("ops_create_customer_from_deal" as any, { p_deal_id: id });
      if (error) throw error;
      toast.success("Customer created from deal");
      qc.invalidateQueries({ queryKey: ["ops", "deal", id] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create customer");
    }
  };

  if (dealQ.isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  if (!deal) return <div className="p-6 text-muted-foreground text-sm">Deal not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{deal.name}</h1>
                {deal.stage?.name && (
                  <Badge variant={deal.stage.is_won ? "default" : deal.stage.is_lost ? "destructive" : "secondary"}>
                    {deal.stage.name}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {deal.account_id ? (
                  <Link to={`/operations/accounts/${deal.account_id}`} className="hover:underline">
                    {deal.account?.name ?? "—"}
                  </Link>
                ) : "—"}
                {deal.owner?.full_name && <> · Owner: {deal.owner.full_name}</>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {deal.stage?.is_won && (
                <Button variant="outline" onClick={handleCreateCustomer}>Create customer from deal</Button>
              )}
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <Stat label="Amount" value={formatMoney(deal.amount, deal.currency_code)} />
            <Stat label="Probability" value={deal.probability != null ? `${deal.probability}%` : "—"} />
            <Stat label="Expected revenue" value={formatMoney(deal.expected_revenue, deal.currency_code)} />
            <Stat label="Close date" value={formatDate(deal.close_date)} />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Stage</Label>
              <Select value={deal.stage_id} onValueChange={handleStageChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(stagesQ.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
          <TabsTrigger value="lines">Line items</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Field label="Type" value={deal.type ?? "—"} />
              <Field label="Description" value={deal.description ?? "—"} multiline />
              <Field label="Next step" value={deal.next_step_text ?? "—"} multiline />
              <Field label="Close date" value={formatDate(deal.close_date)} />
              <Field label="Actual close date" value={formatDate(deal.actual_close_date)} />
              {deal.won_reason && <Field label="Won reason" value={deal.won_reason} />}
              {deal.lost_reason && <Field label="Lost reason" value={deal.lost_reason} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities"><ActivitiesTab dealId={id} /></TabsContent>
        <TabsContent value="team"><TeamTab dealId={id} /></TabsContent>
        <TabsContent value="stakeholders"><StakeholdersTab dealId={id} /></TabsContent>
        <TabsContent value="lines"><LinesTab dealId={id} currency={deal.currency_code} /></TabsContent>
      </Tabs>

      <DealFormDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) qc.invalidateQueries({ queryKey: ["ops", "deal", id] });
        }}
        row={deal}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Field({ label, value, multiline }: { label: string; value: React.ReactNode; multiline?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className={multiline ? "whitespace-pre-wrap" : ""}>{value}</div>
    </div>
  );
}

/* ============ Activities ============ */

function ActivitiesTab({ dealId }: { dealId: string }) {
  const qc = useQueryClient();
  const timelineQ = useQuery({
    queryKey: ["ops", "deal", "timeline", dealId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_entity_timeline" as any, {
        p_entity_type: "deal",
        p_entity_id: dealId,
        p_limit: 200,
      });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"task" | "call" | "meeting" | "note">("note");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("open");
  const [priority, setPriority] = useState<string>("");
  const [scheduled, setScheduled] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setType("note"); setSubject(""); setDescription("");
    setStatus("open"); setPriority(""); setScheduled("");
  };

  const submit = async () => {
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type,
        subject: subject.trim(),
        related_to_type: "deal",
        related_to_id: dealId,
      };
      if (description.trim()) payload.description = description.trim();
      if (type === "task") payload.status = status;
      if (priority) payload.priority = priority;
      if (scheduled) payload.scheduled_start_at = new Date(scheduled).toISOString();

      const { error } = await opsSupabase.from("activities" as any).insert(payload);
      if (error) throw error;
      toast.success("Activity logged");
      qc.invalidateQueries({ queryKey: ["ops", "deal", "timeline", dealId] });
      setOpen(false); reset();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to log activity");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Timeline</CardTitle>
        <Button size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4 mr-2" />Log activity
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="space-y-3 border rounded-md p-4 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              {type === "task" && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="deferred">Deferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority || NONE} onValueChange={(v) => setPriority(v === NONE ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scheduled start</Label>
                <Input type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); reset(); }} disabled={submitting}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        )}

        {timelineQ.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !timelineQ.data || timelineQ.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {timelineQ.data.map((it: any, idx: number) => {
              const kind = (it.kind ?? "").replace(/_/g, " ");
              const subjectText = it.subject || kind || "—";
              const details = it.details ?? {};
              const sec = details.status || details.priority
                ? [details.status, details.priority].filter(Boolean).join(" · ")
                : null;
              return (
                <li key={`${it.source}-${it.id}-${idx}`} className="border-l-2 border-muted pl-3">
                  <div className="text-xs text-muted-foreground capitalize">{it.source} · {kind || "—"}</div>
                  <div className="font-medium text-sm">{subjectText}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(it.at)}</div>
                  {sec && <div className="text-xs text-muted-foreground capitalize">{sec.replace(/_/g, " ")}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ============ Team ============ */

function TeamTab({ dealId }: { dealId: string }) {
  const qc = useQueryClient();
  const teamQ = useQuery({
    queryKey: ["ops", "deal", "team", dealId],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("deal_team_members" as any)
        .select("id, role, allocation_percent, user_id, user:users(full_name)")
        .eq("deal_id", dealId);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const usersQ = useQuery({
    queryKey: ["ops", "users", "select"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("users" as any)
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("owner");
  const [allocation, setAllocation] = useState("100");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!userId) { toast.error("User is required"); return; }
    setSubmitting(true);
    try {
      const { error } = await opsSupabase.from("deal_team_members" as any).insert({
        deal_id: dealId,
        user_id: userId,
        role,
        allocation_percent: Number(allocation) || 0,
      });
      if (error) throw error;
      toast.success("Team member added");
      qc.invalidateQueries({ queryKey: ["ops", "deal", "team", dealId] });
      setOpen(false); setUserId(""); setRole("owner"); setAllocation("100");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add team member");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (rowId: string) => {
    try {
      const { error } = await opsSupabase.from("deal_team_members" as any).delete().eq("id", rowId);
      if (error) throw error;
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["ops", "deal", "team", dealId] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to remove");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Team</CardTitle>
        <Button size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4 mr-2" />Add member
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="space-y-3 border rounded-md p-4 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {(usersQ.data ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="ae">AE</SelectItem>
                    <SelectItem value="sdr">SDR</SelectItem>
                    <SelectItem value="se">SE</SelectItem>
                    <SelectItem value="csm">CSM</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allocation %</Label>
                <Input type="number" value={allocation} onChange={(e) => setAllocation(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : "Add"}</Button>
            </div>
          </div>
        )}

        {teamQ.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !teamQ.data || teamQ.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">No team members.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamQ.data.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.user?.full_name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{m.role}</TableCell>
                  <TableCell>{m.allocation_percent}%</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ============ Stakeholders ============ */

function StakeholdersTab({ dealId }: { dealId: string }) {
  const qc = useQueryClient();
  const stakeQ = useQuery({
    queryKey: ["ops", "deal", "stakeholders", dealId],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("deal_stakeholders" as any)
        .select("id, role, notes, contact_id, contact:contact_persons(first_name,last_name)")
        .eq("deal_id", dealId);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const contactsQ = useQuery({
    queryKey: ["ops", "contacts", "select"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("contact_persons" as any)
        .select("id, first_name, last_name")
        .order("last_name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [role, setRole] = useState("other");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!contactId) { toast.error("Contact is required"); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        deal_id: dealId,
        contact_id: contactId,
        role,
      };
      if (notes.trim()) payload.notes = notes.trim();
      const { error } = await opsSupabase.from("deal_stakeholders" as any).insert(payload);
      if (error) throw error;
      toast.success("Stakeholder added");
      qc.invalidateQueries({ queryKey: ["ops", "deal", "stakeholders", dealId] });
      setOpen(false); setContactId(""); setRole("other"); setNotes("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add stakeholder");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (rowId: string) => {
    try {
      const { error } = await opsSupabase.from("deal_stakeholders" as any).delete().eq("id", rowId);
      if (error) throw error;
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["ops", "deal", "stakeholders", dealId] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to remove");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Stakeholders</CardTitle>
        <Button size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4 mr-2" />Add stakeholder
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="space-y-3 border rounded-md p-4 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Contact</Label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>
                    {(contactsQ.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="decision_maker">Decision maker</SelectItem>
                    <SelectItem value="influencer">Influencer</SelectItem>
                    <SelectItem value="champion">Champion</SelectItem>
                    <SelectItem value="detractor">Detractor</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : "Add"}</Button>
            </div>
          </div>
        )}

        {stakeQ.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !stakeQ.data || stakeQ.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">No stakeholders.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stakeQ.data.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{[s.contact?.first_name, s.contact?.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell className="capitalize">{(s.role ?? "").replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.notes ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ============ Line items ============ */

function LinesTab({ dealId, currency }: { dealId: string; currency: string | null }) {
  const qc = useQueryClient();
  const linesQ = useQuery({
    queryKey: ["ops", "deal", "lines", dealId],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("deal_line_items" as any)
        .select("id, description, quantity, unit_price, line_discount, line_total, sort_order, item_id, item:items(name)")
        .eq("deal_id", dealId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const itemsQ = useQuery({
    queryKey: ["ops", "items", "select"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("items" as any)
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  // auto-fill description from selected item
  useEffect(() => {
    if (!itemId) return;
    const it = (itemsQ.data ?? []).find((x) => x.id === itemId);
    if (it && !description) setDescription(it.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        deal_id: dealId,
        item_id: itemId || null,
        description: description.trim() || null,
        quantity: Number(quantity) || 0,
        unit_price: Number(unitPrice) || 0,
        line_discount: Number(discount) || 0,
      };
      const { error } = await opsSupabase.from("deal_line_items" as any).insert(payload);
      if (error) throw error;
      toast.success("Line added");
      qc.invalidateQueries({ queryKey: ["ops", "deal", "lines", dealId] });
      setOpen(false); setItemId(""); setDescription(""); setQuantity("1"); setUnitPrice("0"); setDiscount("0");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add line");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (rowId: string) => {
    try {
      const { error } = await opsSupabase.from("deal_line_items" as any).delete().eq("id", rowId);
      if (error) throw error;
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["ops", "deal", "lines", dealId] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to remove");
    }
  };

  const computedTotal = (l: any) => (Number(l.quantity) || 0) * (Number(l.unit_price) || 0) - (Number(l.line_discount) || 0);
  const sum = useMemo(() => (linesQ.data ?? []).reduce((acc, l) => acc + computedTotal(l), 0), [linesQ.data]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Line items</CardTitle>
        <Button size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4 mr-2" />Add line
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="space-y-3 border rounded-md p-4 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Item</Label>
                <Select value={itemId || NONE} onValueChange={(v) => setItemId(v === NONE ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="— none —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— none —</SelectItem>
                    {(itemsQ.data ?? []).map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Unit price</Label>
                <Input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Discount</Label>
                <Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : "Add"}</Button>
            </div>
          </div>
        )}

        {linesQ.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !linesQ.data || linesQ.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">No line items.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linesQ.data.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.item?.name ?? "—"}</TableCell>
                    <TableCell>{l.description ?? "—"}</TableCell>
                    <TableCell className="text-right">{l.quantity}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.unit_price, currency)}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.line_discount, currency)}</TableCell>
                    <TableCell className="text-right">{formatMoney(computedTotal(l), currency)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => remove(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end text-sm font-medium">Total: {formatMoney(sum, currency)}</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
