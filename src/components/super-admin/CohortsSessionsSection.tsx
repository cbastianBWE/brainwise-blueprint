import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, CalendarClock, Users, Loader2, Mail } from "lucide-react";

const PTP_COACH_PATH_ID = "fa22e4aa-746b-4a1e-994c-ba5a241a0121";

const COHORT_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "enrolling", label: "Enrolling" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;
const TEMPLATE_TYPES = [
  {
    key: "welcome",
    label: "Welcome email",
    placeholders: "{{cohort_name}}, {{sessions_list}}",
  },
  {
    key: "pre_session",
    label: "Pre-session reminder",
    placeholders: "{{session_title}}, {{session_time}}, {{join_url}}",
  },
  {
    key: "post_session",
    label: "Post-session follow-up",
    placeholders: "{{session_title}}, {{session_time}}, {{join_url}}",
  },
] as const;

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  enrollment_opens_at: string | null;
  enrollment_closes_at: string | null;
  max_capacity: number | null;
  welcome_attachment_url: string | null;
  practitioner_name?: string | null;
  practitioner_email?: string | null;
  practitioner_ptp_debrief_url?: string | null;
  practitioner_competency_url?: string | null;
  certification_paths?: { name: string } | null;
}

interface CohortEvent {
  id: string;
  cohort_id: string;
  sequence_no: number;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  teams_join_url: string | null;
  is_published: boolean;
}

interface CohortMember {
  user_id: string;
  member_status: string;
  users: { full_name: string | null; email: string } | null;
}

interface EmailTemplate {
  template_type: string;
  subject: string;
  body_html: string;
  is_active: boolean;
}

// ISO ↔ datetime-local helpers
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const fmt = (iso: string | null | undefined, tz?: string) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, tz ? { timeZone: tz } : undefined);
  } catch {
    return new Date(iso).toLocaleString();
  }
};

// ─── Cohort Dialog ───
function CohortDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Cohort | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "enrolling",
    starts_at: "",
    ends_at: "",
    enrollment_opens_at: "",
    enrollment_closes_at: "",
    max_capacity: "",
    welcome_attachment_url: "",
    practitioner_name: "",
    practitioner_email: "",
    practitioner_ptp_debrief_url: "",
    practitioner_competency_url: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name ?? "",
        description: editing?.description ?? "",
        status: editing?.status ?? "enrolling",
        starts_at: toLocalInput(editing?.starts_at),
        ends_at: toLocalInput(editing?.ends_at),
        enrollment_opens_at: toLocalInput(editing?.enrollment_opens_at),
        enrollment_closes_at: toLocalInput(editing?.enrollment_closes_at),
        max_capacity: editing?.max_capacity != null ? String(editing.max_capacity) : "",
        welcome_attachment_url: editing?.welcome_attachment_url ?? "",
        practitioner_name: editing?.practitioner_name ?? "",
        practitioner_email: editing?.practitioner_email ?? "",
        practitioner_ptp_debrief_url: editing?.practitioner_ptp_debrief_url ?? "",
        practitioner_competency_url: editing?.practitioner_competency_url ?? "",
      });
    }
  }, [open, editing]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_upsert_cohort", {
      p_id: editing?.id ?? null,
      p_certification_path_id: PTP_COACH_PATH_ID,
      p_name: form.name.trim(),
      p_description: form.description || null,
      p_status: form.status,
      p_starts_at: fromLocalInput(form.starts_at),
      p_ends_at: fromLocalInput(form.ends_at),
      p_enrollment_opens_at: fromLocalInput(form.enrollment_opens_at),
      p_enrollment_closes_at: fromLocalInput(form.enrollment_closes_at),
      p_max_capacity: form.max_capacity ? Number(form.max_capacity) : null,
      p_welcome_attachment_url: form.welcome_attachment_url || null,
      p_practitioner_name: form.practitioner_name.trim() || null,
      p_practitioner_email: form.practitioner_email.trim() || null,
      p_practitioner_ptp_debrief_url: form.practitioner_ptp_debrief_url.trim() || null,
      p_practitioner_competency_url: form.practitioner_competency_url.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Cohort updated" : "Cohort created" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Cohort" : "New Cohort"}</DialogTitle>
          <DialogDescription>PTP Certified Practitioner cohort details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COHORT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Status is an internal label. Whether the public certification page shows this cohort is controlled by the Enrollment Opens / Closes dates, not by this status.
              </p>

            </div>
            <div className="space-y-2">
              <Label>Max Capacity (blank = unlimited)</Label>
              <Input
                type="number"
                min={0}
                value={form.max_capacity}
                onChange={(e) => setForm({ ...form, max_capacity: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Starts At</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ends At</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Enrollment Opens</Label>
              <Input type="datetime-local" value={form.enrollment_opens_at} onChange={(e) => setForm({ ...form, enrollment_opens_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Enrollment Closes</Label>
              <Input type="datetime-local" value={form.enrollment_closes_at} onChange={(e) => setForm({ ...form, enrollment_closes_at: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Welcome Attachment URL</Label>
            <Input
              type="url"
              placeholder="https://…"
              value={form.welcome_attachment_url}
              onChange={(e) => setForm({ ...form, welcome_attachment_url: e.target.value })}
            />
          </div>
          <div className="space-y-3 rounded-md border p-4">
            <h4 className="text-sm font-semibold">Assigned Practitioner</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Practitioner name</Label>
                <Input
                  value={form.practitioner_name}
                  onChange={(e) => setForm({ ...form, practitioner_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Practitioner email</Label>
                <Input
                  type="email"
                  value={form.practitioner_email}
                  onChange={(e) => setForm({ ...form, practitioner_email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>PTP debrief booking link (1 hour)</Label>
              <Input
                placeholder="https://…"
                value={form.practitioner_ptp_debrief_url}
                onChange={(e) => setForm({ ...form, practitioner_ptp_debrief_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Competency review booking link (30 min)</Label>
              <Input
                placeholder="https://…"
                value={form.practitioner_competency_url}
                onChange={(e) => setForm({ ...form, practitioner_competency_url: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Session Dialog ───
function SessionDialog({
  open,
  onOpenChange,
  cohortId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cohortId: string;
  editing: CohortEvent | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sequence_no: 1,
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    timezone: "America/New_York",
    is_published: false,
  });

  useEffect(() => {
    if (open) {
      setForm({
        sequence_no: editing?.sequence_no ?? 1,
        title: editing?.title ?? "",
        description: editing?.description ?? "",
        starts_at: toLocalInput(editing?.starts_at),
        ends_at: toLocalInput(editing?.ends_at),
        timezone: editing?.timezone ?? "America/New_York",
        is_published: editing?.is_published ?? false,
      });
    }
  }, [open, editing]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_upsert_cohort_event", {
      p_id: editing?.id ?? null,
      p_cohort_id: cohortId,
      p_sequence_no: form.sequence_no,
      p_title: form.title.trim(),
      p_description: form.description || null,
      p_starts_at: fromLocalInput(form.starts_at),
      p_ends_at: fromLocalInput(form.ends_at),
      p_timezone: form.timezone || "America/New_York",
      p_teams_join_url: null,
      p_is_published: form.is_published,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: editing ? "Session updated" : "Session created",
      description: form.is_published ? "Publishing will auto-create a Teams meeting." : undefined,
    });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Session" : "Add Session"}</DialogTitle>
          <DialogDescription>
            Publishing a session auto-creates its Microsoft Teams meeting and sends invites.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[100px_1fr] gap-4">
            <div className="space-y-2">
              <Label>Sequence #</Label>
              <Input type="number" min={1} value={form.sequence_no}
                onChange={(e) => setForm({ ...form, sequence_no: Number(e.target.value) || 1 })} />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Starts At</Label>
              <Input type="datetime-local" value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ends At</Label>
              <Input type="datetime-local" value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="published"
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            />
            <Label htmlFor="published" className="cursor-pointer">
              Published (auto-creates Teams meeting)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reschedule Dialog ───
function RescheduleDialog({
  open,
  onOpenChange,
  event,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event: CohortEvent | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ starts_at: "", ends_at: "", timezone: "America/New_York" });

  useEffect(() => {
    if (open && event) {
      setForm({
        starts_at: toLocalInput(event.starts_at),
        ends_at: toLocalInput(event.ends_at),
        timezone: event.timezone || "America/New_York",
      });
    }
  }, [open, event]);

  const handleSave = async () => {
    if (!event) return;
    setSaving(true);
    const { error } = await supabase.rpc("admin_reschedule_cohort_event", {
      p_event_id: event.id,
      p_starts_at: fromLocalInput(form.starts_at),
      p_ends_at: fromLocalInput(form.ends_at),
      p_timezone: form.timezone || "America/New_York",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Reschedule failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Rescheduled", description: "Updated calendar invites are being resent." });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Session</DialogTitle>
          <DialogDescription>Updated invites are automatically resent to attendees.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Starts At</Label>
              <Input type="datetime-local" value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ends At</Label>
              <Input type="datetime-local" value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reassign Dialog ───
function ReassignDialog({
  open,
  onOpenChange,
  member,
  memberSessions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  member: CohortMember | null;
  memberSessions: CohortEvent[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [fromEventId, setFromEventId] = useState("");
  const [toEventId, setToEventId] = useState("");
  const [allEvents, setAllEvents] = useState<Array<CohortEvent & { cohort_name?: string }>>([]);

  useEffect(() => {
    if (!open) return;
    setFromEventId("");
    setToEventId("");
    (async () => {
      const { data } = await supabase
        .from("cohort_events")
        .select("*, cohorts(name)")
        .order("starts_at", { ascending: true });
      setAllEvents(
        ((data as any[]) || []).map((e) => ({ ...e, cohort_name: e.cohorts?.name })),
      );
    })();
  }, [open]);

  const handleSave = async () => {
    if (!member || !fromEventId || !toEventId) return;
    setSaving(true);
    const { error } = await supabase.rpc("admin_reassign_attendee", {
      p_user_id: member.user_id,
      p_from_event_id: fromEventId,
      p_to_event_id: toEventId,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Reassign failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Attendee moved" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Another Session</DialogTitle>
          <DialogDescription>
            {member?.users?.full_name ?? member?.users?.email ?? "Attendee"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Current Session</Label>
            <Select value={fromEventId} onValueChange={setFromEventId}>
              <SelectTrigger><SelectValue placeholder="Pick a current session" /></SelectTrigger>
              <SelectContent>
                {memberSessions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    #{e.sequence_no} — {e.title} ({fmt(e.starts_at, e.timezone)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Target Session</Label>
            <Select value={toEventId} onValueChange={setToEventId}>
              <SelectTrigger><SelectValue placeholder="Pick a target session" /></SelectTrigger>
              <SelectContent>
                {allEvents.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    [{e.cohort_name}] #{e.sequence_no} — {e.title} ({fmt(e.starts_at, e.timezone)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !fromEventId || !toEventId}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Email Templates ───
function EmailTemplatesCard() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("cohort_email_templates").select("*");
    const map: Record<string, EmailTemplate> = {};
    ((data as EmailTemplate[]) || []).forEach((t) => (map[t.template_type] = t));
    setTemplates(map);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = (type: string, field: "subject" | "body_html", value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [type]: {
        template_type: type,
        subject: prev[type]?.subject ?? "",
        body_html: prev[type]?.body_html ?? "",
        is_active: true,
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const save = async (type: string) => {
    const t = templates[type];
    if (!t) return;
    setSaving(type);
    const { error } = await supabase
      .from("cohort_email_templates")
      .upsert(
        { template_type: type, subject: t.subject ?? "", body_html: t.body_html ?? "", is_active: true },
        { onConflict: "template_type" },
      );
    setSaving(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Template saved" });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email Templates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          When no template is saved for a type, the system uses a built-in default.
        </p>
        {TEMPLATE_TYPES.map((tt) => {
          const t = templates[tt.key];
          return (
            <div key={tt.key} className="space-y-2 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{tt.label}</h4>
                  <p className="text-xs text-muted-foreground">Placeholders: {tt.placeholders}</p>
                </div>
                <Button size="sm" onClick={() => save(tt.key)} disabled={saving === tt.key}>
                  {saving === tt.key && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Subject</Label>
                <Input
                  value={t?.subject ?? ""}
                  onChange={(e) => updateField(tt.key, "subject", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Body (HTML)</Label>
                <Textarea
                  rows={6}
                  value={t?.body_html ?? ""}
                  onChange={(e) => updateField(tt.key, "body_html", e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Enroll Participant ───
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapEnrollError(payload: { error?: string; detail?: string } | null): string {
  const code = payload?.error;
  const detail = payload?.detail ?? "";
  switch (code) {
    case "valid_email_required":
      return "Enter a valid email address.";
    case "cohort_id_required":
    case "cohort_not_found":
      return "Could not resolve this cohort. Refresh and try again.";
    case "forbidden_not_super_admin":
      return "You do not have permission to do this.";
    case "create_user_failed":
    case "user_exists_but_unlinked":
      return "Could not create this account. " + detail;
    case "enroll_failed":
      return "Enrollment failed. " + detail;
    default:
      return code || "Something went wrong.";
  }
}

function EnrollParticipantDialog({
  open,
  onOpenChange,
  cohortId,
  onEnrolled,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cohortId: string;
  onEnrolled: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());

  const handleSubmit = async () => {
    if (submitting || !emailValid) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-enroll-in-cohort", {
      body: {
        email: email.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        cohort_id: cohortId,
      },
    });
    let payload: any = data;
    if (error) {
      try {
        payload = await (error as any).context.json();
      } catch {
        payload = null;
      }
      setSubmitting(false);
      toast({
        title: "Enrollment failed",
        description: mapEnrollError(payload),
        variant: "destructive",
      });
      return;
    }
    setSubmitting(false);
    toast({
      title: payload?.already_enrolled ? "Already enrolled" : "Participant enrolled",
      description: payload?.message ?? "Done.",
    });
    setEmail("");
    setFirstName("");
    setLastName("");
    onOpenChange(false);
    onEnrolled();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll a participant</DialogTitle>
          <DialogDescription>
            If they don't have an account yet, one is created and they get a set-password link.
            Enrolling also sends the branded welcome email with the certification reference PDF;
            calendar invites and reminders follow automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First name (optional)</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last name (optional)</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !emailValid}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitting ? "Enrolling…" : "Enroll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResendWelcomeDialog({
  open,
  onOpenChange,
  cohortId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cohortId: string;
}) {
  const { toast } = useToast();
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wouldSend, setWouldSend] = useState<any[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setPreviewing(true);
      setWouldSend([]);
      setSkippedCount(0);
      const { data, error } = await supabase.functions.invoke("admin-resend-cohort-welcome", {
        body: { cohort_id: cohortId, dry_run: true },
      });
      if (cancelled) return;
      setPreviewing(false);
      if (error) {
        let payload: any = null;
        try {
          payload = await (error as any).context.json();
        } catch {
          payload = null;
        }
        toast({
          title: "Preview failed",
          description: payload?.error ?? "Could not load the resend preview.",
          variant: "destructive",
        });
        return;
      }
      const results: any[] = (data as any)?.results ?? [];
      setWouldSend(results.filter((r) => r?.would_send));
      setSkippedCount(results.filter((r) => r?.skipped).length);
    };
    run();
    return () => { cancelled = true; };
  }, [open, cohortId, toast]);

  const handleSend = async () => {
    if (submitting) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-resend-cohort-welcome", {
      body: { cohort_id: cohortId, dry_run: false },
    });
    if (error) {
      let payload: any = null;
      try {
        payload = await (error as any).context.json();
      } catch {
        payload = null;
      }
      setSubmitting(false);
      toast({
        title: "Resend failed",
        description: payload?.error ?? "Could not resend the welcome email.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(false);
    const sent = (data as any)?.sent ?? 0;
    const failed = (data as any)?.failed ?? 0;
    toast({ title: `Welcome email resent to ${sent} people` });
    if (failed > 0) {
      const failing: string[] = ((data as any)?.results ?? [])
        .filter((r: any) => r?.sent === false)
        .map((r: any) => r.email);
      toast({
        title: `${failed} failed to send`,
        description: failing.join(", "),
        variant: "destructive",
      });
    }
    onOpenChange(false);
  };

  const n = wouldSend.length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resend welcome email</DialogTitle>
          <DialogDescription>
            Only members who have never signed in are emailed again, with a fresh set-password link.
          </DialogDescription>
        </DialogHeader>
        {previewing ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
          </div>
        ) : n === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Everyone in this cohort has already signed in. Nothing to send.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              {n} {n === 1 ? "person" : "people"} will receive the welcome email again with a fresh
              set-password link.
            </p>
            <ul className="space-y-1 text-sm max-h-56 overflow-y-auto">
              {wouldSend.map((r: any) => (
                <li key={r.user_id ?? r.email} className="flex justify-between gap-4">
                  <span>{r.first_name || "—"}</span>
                  <span className="text-muted-foreground">{r.email}</span>
                </li>
              ))}
            </ul>
            {skippedCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {skippedCount} already signed in and will not be emailed.
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Close
          </Button>
          {!previewing && n > 0 && (
            <Button onClick={handleSend} disabled={submitting || previewing}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send to {n} {n === 1 ? "person" : "people"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



// ─── Main Section ───
export default function CohortsSessionsSection() {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [events, setEvents] = useState<CohortEvent[]>([]);
  const [members, setMembers] = useState<CohortMember[]>([]);

  const [cohortDialogOpen, setCohortDialogOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<CohortEvent | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [reschedulingSession, setReschedulingSession] = useState<CohortEvent | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassigningMember, setReassigningMember] = useState<CohortMember | null>(null);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);

  const loadCohorts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cohorts")
      .select("*, certification_paths(name)")
      .order("starts_at", { ascending: true });
    const list = (data as Cohort[]) || [];
    setCohorts(list);
    // fetch seat counts in parallel
    const counts: Record<string, number> = {};
    await Promise.all(
      list.map(async (c) => {
        const { count } = await supabase
          .from("cohort_members")
          .select("id", { count: "exact", head: true })
          .eq("cohort_id", c.id)
          .neq("member_status", "left");
        counts[c.id] = count || 0;
      }),
    );
    setSeatCounts(counts);
    setLoading(false);
  }, []);

  const loadCohortDetail = useCallback(async (cohortId: string) => {
    const [{ data: ev }, { data: mem }] = await Promise.all([
      supabase.from("cohort_events").select("*").eq("cohort_id", cohortId).order("sequence_no"),
      supabase
        .from("cohort_members")
        .select("user_id, member_status, users!cohort_members_user_id_fkey(full_name, email)")
        .eq("cohort_id", cohortId),
    ]);
    setEvents((ev as CohortEvent[]) || []);
    setMembers((mem as unknown as CohortMember[]) || []);
  }, []);

  useEffect(() => { loadCohorts(); }, [loadCohorts]);
  useEffect(() => {
    if (selectedCohortId) loadCohortDetail(selectedCohortId);
    else { setEvents([]); setMembers([]); }
  }, [selectedCohortId, loadCohortDetail]);

  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId) || null;

  return (
    <div className="space-y-6">
      {/* Cohorts list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cohorts</CardTitle>
          <Button onClick={() => { setEditingCohort(null); setCohortDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Cohort
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : cohorts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No cohorts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Enrollment Window</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohorts.map((c) => {
                  const taken = seatCounts[c.id] ?? 0;
                  const cap = c.max_capacity;
                  return (
                    <TableRow
                      key={c.id}
                      className={selectedCohortId === c.id ? "bg-muted/50" : "cursor-pointer"}
                      onClick={() => setSelectedCohortId(c.id)}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {fmt(c.starts_at)} → {fmt(c.ends_at)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {fmt(c.enrollment_opens_at)} → {fmt(c.enrollment_closes_at)}
                      </TableCell>
                      <TableCell>
                        {cap == null ? `${taken} enrolled (unlimited)` : `${taken} / ${cap}`}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); setEditingCohort(c); setCohortDialogOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sessions & Enrollees for selected cohort */}
      {selectedCohort && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Sessions — {selectedCohort.name}
              </CardTitle>
              <Button onClick={() => { setEditingSession(null); setSessionDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Session
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Publishing a session auto-creates its Microsoft Teams meeting. Rescheduling automatically resends updated calendar invites.
              </p>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No sessions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead>Timezone</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead>Teams Link</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.sequence_no}</TableCell>
                        <TableCell className="font-medium">{e.title}</TableCell>
                        <TableCell className="text-xs">
                          {fmt(e.starts_at, e.timezone)} → {fmt(e.ends_at, e.timezone)}
                        </TableCell>
                        <TableCell className="text-xs">{e.timezone}</TableCell>
                        <TableCell>
                          {e.is_published ? <Badge>Published</Badge> : <Badge variant="outline">Draft</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {e.teams_join_url ? (
                            <a href={e.teams_join_url} target="_blank" rel="noreferrer" className="text-primary underline truncate max-w-[160px] inline-block align-bottom">
                              Open
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button size="sm" variant="outline"
                            onClick={() => { setEditingSession(e); setSessionDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => { setReschedulingSession(e); setRescheduleDialogOpen(true); }}>
                            <CalendarClock className="h-3.5 w-3.5 mr-1" /> Reschedule
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Enrollees — {selectedCohort.name}
              </CardTitle>
              <Button size="sm" onClick={() => setEnrollDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Enroll a participant
              </Button>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No enrollees yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.user_id}>
                        <TableCell>{m.users?.full_name ?? "—"}</TableCell>
                        <TableCell>{m.users?.email ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{m.member_status}</Badge></TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline"
                            onClick={() => { setReassigningMember(m); setReassignDialogOpen(true); }}>
                            Move to another session
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Email templates */}
      <EmailTemplatesCard />

      {/* Dialogs */}
      <CohortDialog
        open={cohortDialogOpen}
        onOpenChange={setCohortDialogOpen}
        editing={editingCohort}
        onSaved={loadCohorts}
      />
      {selectedCohortId && (
        <SessionDialog
          open={sessionDialogOpen}
          onOpenChange={setSessionDialogOpen}
          cohortId={selectedCohortId}
          editing={editingSession}
          onSaved={() => loadCohortDetail(selectedCohortId)}
        />
      )}
      <RescheduleDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        event={reschedulingSession}
        onSaved={() => selectedCohortId && loadCohortDetail(selectedCohortId)}
      />
      <ReassignDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        member={reassigningMember}
        memberSessions={events}
        onSaved={() => selectedCohortId && loadCohortDetail(selectedCohortId)}
      />
      {selectedCohortId && (
        <EnrollParticipantDialog
          open={enrollDialogOpen}
          onOpenChange={setEnrollDialogOpen}
          cohortId={selectedCohortId}
          onEnrolled={() => { loadCohortDetail(selectedCohortId); loadCohorts(); }}
        />
      )}
    </div>
  );
}
