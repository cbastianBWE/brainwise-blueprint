import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, ClipboardCheck, Clock, Plus, Send, Eye, Mail,
} from "lucide-react";
import { format } from "date-fns";

const INSTRUMENTS = [
  { id: "PTP", uuid: "02618e9a-d411-44cf-b316-fe368edeac03", name: "Personal Threat Profile", desc: "Measures nonconscious threat responses influencing behavior." },
  { id: "NAI", uuid: "77d1290f-1daf-44e0-931f-b9b8ad185520", name: "Neuroscience Adoption Index", desc: "Measures beliefs and threat responses related to AI adoption." },
  { id: "AIRSA", uuid: "abb62120-8cc8-435f-babc-dd6a27fbc235", name: "AI Readiness Skills Assessment", desc: "Assesses readiness to adopt and leverage AI tools." },
  { id: "HSS", uuid: "90216d9d-153c-4b7b-abe0-1d7845c9e6e0", name: "Habit Stabilization Scorecard", desc: "Measures stability of behavioral changes related to AI." },
];

interface ClientRow {
  id: string;
  client_email: string;
  client_user_id: string | null;
  client_name: string | null;
  invitation_status: string;
  assessment_id: string | null;
  assessment_status: string | null;
  completed_at: string | null;
  instrument_name: string | null;
  created_at: string;
}

export default function CoachClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [instrumentError, setInstrumentError] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);

    const { data: ccRows } = await supabase
      .from("coach_clients")
      .select("id, client_email, client_user_id, invitation_status, assessment_id, instrument_id, coach_notes, created_at")
      .eq("coach_user_id", user.id)
      .order("created_at", { ascending: false });

    if (!ccRows) { setLoading(false); return; }

    const enriched: ClientRow[] = [];

    for (const cc of ccRows) {
      let clientName: string | null = null;
      let assessmentStatus: string | null = null;
      let completedAt: string | null = null;
      let instrumentName: string | null = null;

      if (cc.client_user_id) {
        const { data: u } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", cc.client_user_id)
          .single();
        clientName = u?.full_name || null;
      }

      if (cc.assessment_id) {
        const { data: a } = await supabase
          .from("assessments")
          .select("status, completed_at, instrument_id")
          .eq("id", cc.assessment_id)
          .single();
        if (a) {
          assessmentStatus = a.status;
          completedAt = a.completed_at;
          const { data: inst } = await supabase
            .from("instruments")
            .select("instrument_name")
            .eq("instrument_id", a.instrument_id)
            .limit(1)
            .single();
          instrumentName = inst?.instrument_name || a.instrument_id;
        }
      } else if (cc.instrument_id) {
        // No assessment yet, but we have the instrument_id from coach_clients
        const instMatch = INSTRUMENTS.find(i => i.uuid === cc.instrument_id);
        instrumentName = instMatch?.name || null;
        if (!instrumentName) {
          // Try DB lookup by UUID id column
          const { data: inst } = await supabase
            .from("instruments")
            .select("instrument_name")
            .eq("id", cc.instrument_id)
            .limit(1)
            .single();
          instrumentName = inst?.instrument_name || null;
        }
      }

      enriched.push({
        id: cc.id,
        client_email: cc.client_email,
        client_user_id: cc.client_user_id,
        client_name: clientName,
        invitation_status: cc.invitation_status,
        assessment_id: cc.assessment_id,
        assessment_status: assessmentStatus,
        completed_at: completedAt,
        instrument_name: instrumentName,
        created_at: cc.created_at,
      });
    }

    setClients(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  const resetForm = () => {
    setFirstName(""); setLastName(""); setEmail(""); setNote("");
    setSelectedInstruments([]); setInstrumentError(false);
  };

  const toggleInstrument = (instrumentId: string) => {
    setInstrumentError(false);
    setSelectedInstruments(prev =>
      prev.includes(instrumentId)
        ? prev.filter(id => id !== instrumentId)
        : [...prev, instrumentId]
    );
  };

  const getSelectedUuids = (): string => {
    return selectedInstruments
      .map(id => INSTRUMENTS.find(i => i.id === id)?.uuid)
      .filter(Boolean)
      .join(",");
  };

  const handleOrderCoachPays = async () => {
    if (!user || !email) {
      toast.error("Please fill in client email.");
      return;
    }
    if (selectedInstruments.length === 0) {
      setInstrumentError(true);
      toast.error("Please select at least one assessment instrument.");
      return;
    }
    setSubmitting(true);
    try {
      const instrumentIds = getSelectedUuids();
      const payload = {
        price_id: "price_1TKOeMCMQX1silSQ7tzQLso6",
        mode: "coach_order",
        instrument_ids: instrumentIds,
        quantity: selectedInstruments.length,
        client_email: email,
        client_first_name: firstName,
        client_last_name: lastName,
        coach_note: note,
      };
      console.log("[CoachClients] create-checkout payload:", JSON.stringify(payload, null, 2));

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: payload,
      });
      console.log("[CoachClients] create-checkout response:", JSON.stringify({ data, error }));
      if (error) {
        let errorMsg = "Edge function error";
        try {
          if (error instanceof Error) errorMsg = error.message;
          if (typeof error === "object" && "context" in error) {
            const body = await (error as any).context?.json?.();
            if (body?.error) errorMsg = body.error;
          }
        } catch { /* ignore parse errors */ }
        throw new Error(errorMsg);
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        console.error("[CoachClients] No URL in response data:", data);
        throw new Error("No checkout URL returned. Response: " + JSON.stringify(data));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to start checkout: " + msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderClientPays = async () => {
    if (!user || !email) {
      toast.error("Please fill in client email.");
      return;
    }
    if (selectedInstruments.length === 0) {
      setInstrumentError(true);
      toast.error("Please select at least one assessment instrument.");
      return;
    }
    setSubmitting(true);

    // Create one coach_clients record per selected instrument
    const instrumentUuids = selectedInstruments
      .map(id => INSTRUMENTS.find(i => i.id === id)?.uuid)
      .filter(Boolean) as string[];

    let hasError = false;
    for (const uuid of instrumentUuids) {
      const { error } = await supabase.from("coach_clients").insert({
        coach_user_id: user.id,
        client_email: email,
        invitation_status: "sent",
        coach_notes: note || null,
        instrument_id: uuid,
      });
      if (error) {
        toast.error("Failed to create client record: " + error.message);
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      // Build and send invitation email
      const selectedNames = selectedInstruments
        .map(id => INSTRUMENTS.find(i => i.id === id)?.name)
        .filter(Boolean) as string[];

      const instrumentListHtml = selectedNames
        .map(n => `<li style="margin-bottom:6px;">${n}</li>`)
        .join("");

      const coachNoteHtml = note
        ? `<blockquote style="border-left:4px solid #3B82F6;margin:20px 0;padding:12px 16px;background:#F0F4FF;border-radius:4px;font-style:italic;color:#374151;">"${note}"</blockquote>`
        : "";

      const signupUrl = `${window.location.origin}/signup`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1e40af;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;">BrainWise</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;color:#111827;margin:0 0 16px;">Hi ${firstName || "there"},</p>
          <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Your coach has invited you to complete the following BrainWise assessment${selectedNames.length > 1 ? "s" : ""}. When you register, you'll be able to choose your preferred payment method.
          </p>
          <ul style="font-size:15px;color:#374151;line-height:1.8;padding-left:20px;margin:0 0 16px;">
            ${instrumentListHtml}
          </ul>
          ${coachNoteHtml}
          <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">
            Please complete your assessment${selectedNames.length > 1 ? "s" : ""} within <strong>14 days</strong> of receiving this invitation.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background:#2563eb;border-radius:6px;padding:12px 28px;">
            <a href="${signupUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Get Started</a>
          </td></tr></table>
          <p style="font-size:14px;color:#6b7280;margin:0;">Best regards,<br/><strong>The BrainWise Team</strong></p>
        </td></tr>
        <tr><td style="background:#f3f4f6;padding:16px 32px;text-align:center;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">© ${new Date().getFullYear()} BrainWise. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

      try {
        const { error: emailError } = await supabase.functions.invoke("send-email", {
          body: {
            to: email,
            subject: "You've Been Invited to Complete a BrainWise Assessment",
            html,
          },
        });
        if (emailError) {
          console.error("[CoachClients] send-email error:", emailError);
          toast.warning("Client records created but invitation email failed to send.");
        } else {
          toast.success("Invitation sent!", {
            description: `${firstName} ${lastName} (${email}) has been invited for ${selectedNames.length} assessment${selectedNames.length > 1 ? "s" : ""}.`,
          });
        }
      } catch (emailErr) {
        console.error("[CoachClients] send-email exception:", emailErr);
        toast.warning("Client records created but invitation email failed to send.");
      }

      resetForm();
      setModalOpen(false);
      fetchClients();
    }

    setSubmitting(false);
  };

  // Stats — one row per assessment (coach_clients record)
  const totalUniqueClients = new Set(clients.map(c => c.client_email)).size;
  const completedThisMonth = clients.filter(c => {
    if (!c.completed_at) return false;
    const d = new Date(c.completed_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const pending = clients.filter(c =>
    c.invitation_status === "sent" || c.invitation_status === "opened"
  ).length;

  const getStatusBadge = (status: string | null, invitationStatus: string) => {
    if (!status) {
      if (invitationStatus === "sent") return <Badge variant="secondary">Invited</Badge>;
      if (invitationStatus === "opened") return <Badge variant="secondary">Opened</Badge>;
      return <Badge variant="outline">Pending</Badge>;
    }
    switch (status) {
      case "completed": return <Badge className="bg-accent text-accent-foreground">Completed</Badge>;
      case "in_progress": return <Badge variant="secondary">In Progress</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRemind = async (client: ClientRow) => {
    setSendingReminderId(client.id);
    const instrumentName = client.instrument_name || "your assessment";
    const signupUrl = `${window.location.origin}/signup`;
    const clientName = client.client_name?.split(" ")[0] || client.client_email.split("@")[0];

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1e40af;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;">BrainWise</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;color:#111827;margin:0 0 16px;">Hi ${clientName},</p>
          <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
            This is a friendly reminder that you have a BrainWise assessment waiting for you.
          </p>
          <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 8px;font-weight:600;">Don't Forget Your Assessment:</p>
          <ul style="font-size:15px;color:#374151;line-height:1.8;padding-left:20px;margin:0 0 16px;">
            <li>${instrumentName}</li>
          </ul>
          <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">
            Please complete your assessment within <strong>14 days</strong> of your original invitation.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background:#2563eb;border-radius:6px;padding:12px 28px;">
            <a href="${signupUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Get Started</a>
          </td></tr></table>
          <p style="font-size:14px;color:#6b7280;margin:0;">Best regards,<br/><strong>The BrainWise Team</strong></p>
        </td></tr>
        <tr><td style="background:#f3f4f6;padding:16px 32px;text-align:center;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">© ${new Date().getFullYear()} BrainWise. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: client.client_email,
          subject: "Friendly Reminder: Your BrainWise Assessment is Waiting",
          html,
        },
      });
      if (error) {
        console.error("[CoachClients] remind send-email error:", error);
        toast.warning("Failed to send reminder email.");
      } else {
        toast.success(`Reminder sent to ${client.client_email}`);
      }
    } catch (err) {
      console.error("[CoachClients] remind exception:", err);
      toast.warning("Failed to send reminder email.");
    } finally {
      setSendingReminderId(null);
    }
  };

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your coaching clients and assessments</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => { resetForm(); setModalOpen(true); }}>
              <Plus className="h-4 w-4" /> Order Assessment for New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Order Assessment</DialogTitle>
              <DialogDescription>Set up an assessment for a new or existing client</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="coach-pays" className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="coach-pays">I'll Pay for My Client</TabsTrigger>
                <TabsTrigger value="client-pays">Client Pays Themselves</TabsTrigger>
              </TabsList>

              {/* Shared form fields */}
              <div className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">First Name</Label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Last Name</Label>
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Client Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Personal Note <span className="text-muted-foreground">(optional)</span></Label>
                  <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="A brief message to your client..." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Assessment Instruments <span className="text-muted-foreground">(select at least one)</span></Label>
                  <div className={`space-y-2 rounded-md border p-3 ${instrumentError ? "border-destructive" : "border-border"}`}>
                    {INSTRUMENTS.map(inst => (
                      <label key={inst.id} className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={selectedInstruments.includes(inst.id)}
                          onCheckedChange={() => toggleInstrument(inst.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-sm">{inst.id}</span>
                          <span className="text-muted-foreground text-xs ml-2">— {inst.name}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{inst.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {instrumentError && (
                    <p className="text-xs text-destructive">Please select at least one instrument.</p>
                  )}
                  {selectedInstruments.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedInstruments.length} instrument{selectedInstruments.length !== 1 ? "s" : ""} selected
                      {" "}— ${(selectedInstruments.length * 29.99).toFixed(2)} total
                    </p>
                  )}
                </div>
              </div>

              <TabsContent value="coach-pays" className="mt-4">
                <Button className="w-full gap-2" onClick={handleOrderCoachPays} disabled={submitting || !email}>
                  <ClipboardCheck className="h-4 w-4" /> {submitting ? "Processing..." : "Proceed to Payment"}
                </Button>
              </TabsContent>

              <TabsContent value="client-pays" className="mt-4">
                <Button className="w-full gap-2" onClick={handleOrderClientPays} disabled={submitting || !email}>
                  <Send className="h-4 w-4" /> {submitting ? "Sending..." : "Send Invitation"}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalUniqueClients}</p>
              <p className="text-xs text-muted-foreground">Total Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-accent/10 p-2"><ClipboardCheck className="h-5 w-5 text-accent" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Completed This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-destructive/10 p-2"><Clock className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pending}</p>
              <p className="text-xs text-muted-foreground">Assessments Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <Users className="h-12 w-12 text-muted-foreground/40" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground">No clients yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get started by ordering an assessment for your first client.
              </p>
            </div>
            <Button className="gap-2" onClick={() => { resetForm(); setModalOpen(true); }}>
              <Plus className="h-4 w-4" /> Order Your First Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Roster</CardTitle>
            <CardDescription>
              {clients.length} assessment{clients.length !== 1 ? "s" : ""} across {totalUniqueClients} client{totalUniqueClients !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Instrument</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.client_name || c.client_email}
                      </TableCell>
                      <TableCell className="text-sm">{c.instrument_name || "—"}</TableCell>
                      <TableCell>{getStatusBadge(c.assessment_status, c.invitation_status)}</TableCell>
                      <TableCell className="text-sm">
                        {c.completed_at ? format(new Date(c.completed_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={c.assessment_status !== "completed"}
                          onClick={() => toast.info("Client results view coming soon.")}
                        >
                          <Eye className="h-3 w-3" /> Results
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          disabled={(c.invitation_status !== "sent" && c.invitation_status !== "opened") || sendingReminderId === c.id}
                          onClick={() => handleRemind(c)}
                        >
                          <Mail className="h-3 w-3" /> {sendingReminderId === c.id ? "Sending..." : "Remind"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
