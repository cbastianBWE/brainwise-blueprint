import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail } from "lucide-react";
import { formatDate } from "./_shared";
import ComposeEmailDialog from "./ComposeEmailDialog";

const NONE = "__none__";

type EntityType = "lead" | "account" | "contact" | "deal";

export default function EntityTimeline({
  entityType,
  entityId,
  defaultEmail,
}: {
  entityType: EntityType;
  entityId: string;
  defaultEmail?: string;
}) {
  const qc = useQueryClient();
  const timelineQ = useQuery({
    queryKey: ["ops", "timeline", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_entity_timeline" as any, {
        p_entity_type: entityType,
        p_entity_id: entityId,
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
  const [composeOpen, setComposeOpen] = useState(false);

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
        related_to_type: entityType,
        related_to_id: entityId,
      };
      if (description.trim()) payload.description = description.trim();
      if (type === "task") payload.status = status;
      if (priority) payload.priority = priority;
      if (scheduled) payload.scheduled_start_at = new Date(scheduled).toISOString();

      const { error } = await opsSupabase.from("activities" as any).insert(payload);
      if (error) throw error;
      toast.success("Activity logged");
      qc.invalidateQueries({ queryKey: ["ops", "timeline", entityType, entityId] });
      setOpen(false); reset();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to log activity");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Timeline</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setComposeOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />Compose email
          </Button>
          <Button size="sm" onClick={() => setOpen((o) => !o)}>
            <Plus className="h-4 w-4 mr-2" />Log activity
          </Button>
        </div>
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
