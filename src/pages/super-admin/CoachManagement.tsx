import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Download, Upload, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

const CERT_TYPES = [
  { value: "ptp_coach", label: "PTP Certified Coach" },
  { value: "ai_transformation_coach", label: "AI Transformation Certified Coach" },
  { value: "ai_transformation_ptp_coach", label: "AI Transformation + PTP Certified Coach" },
  { value: "my_brainwise_coach", label: "My BrainWise Coach" },
] as const;

const CERT_LABELS: Record<string, string> = Object.fromEntries(
  CERT_TYPES.map((c) => [c.value, c.label])
);

interface Invitation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  certification_type: string;
  created_at: string;
  expires_at: string;
  email_send_status: "sent" | "failed" | null;
  email_send_error: string | null;
  email_last_attempt_at: string | null;
}

// Helper: inspect the invite-coach response body and produce a user-facing summary.
// invite-coach returns per-recipient results regardless of HTTP status, so the frontend
// must NOT rely on the transport-level `error` check alone (200 and 207 are both success
// at the transport layer but 207 indicates per-recipient failures).
type InviteCoachResult = {
  email: string;
  success: boolean;
  mode?: "created" | "resent" | "failed" | "rejected";
  invitation_id?: string;
  error?: string;
};

type InviteCoachResponse = {
  success?: boolean;
  sent?: number;
  failed?: number;
  results?: InviteCoachResult[];
};

function inspectInviteCoachResponse(
  data: InviteCoachResponse | null | undefined,
  transportError: { message: string } | null | undefined
): { allSucceeded: boolean; summary: string; failures: InviteCoachResult[] } {
  if (transportError) {
    return {
      allSucceeded: false,
      summary: transportError.message,
      failures: [],
    };
  }
  const results = data?.results ?? [];
  const failures = results.filter((r) => !r.success);
  const allSucceeded = failures.length === 0 && results.length > 0;
  let summary: string;
  if (allSucceeded) {
    summary = `${results.length} invitation${results.length === 1 ? "" : "s"} sent.`;
  } else if (results.length === 0) {
    summary = "No invitations were processed.";
  } else {
    const sent = results.length - failures.length;
    summary = `${sent} sent, ${failures.length} failed. First failure: ${failures[0].error ?? "Unknown error"} (${failures[0].email})`;
  }
  return { allSucceeded, summary, failures };
}

interface Coach {
  id: string;
  full_name: string | null;
  email: string;
  certifications: { id: string; certification_type: string; status: string }[];
}

interface BulkRow {
  first_name: string;
  last_name: string;
  email: string;
  certification_type: string;
}

// ─── Single Invite ───
function SingleInviteTab() {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [certType, setCertType] = useState("ptp_coach");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!firstName || !lastName || !email) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("invite-coach", {
      body: { email, first_name: firstName, last_name: lastName, certification_type: certType },
    });
    setSending(false);
    const { allSucceeded, summary } = inspectInviteCoachResponse(data as InviteCoachResponse, error);
    if (allSucceeded) {
      toast({ title: "Invitation Sent", description: `Invitation sent to ${email}` });
      setFirstName(""); setLastName(""); setEmail("");
    } else {
      toast({ title: "Invitation Failed", description: summary, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Last Name</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Certification Level</Label>
        <Select value={certType} onValueChange={setCertType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CERT_TYPES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSend} disabled={sending || !firstName || !lastName || !email}>
        {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Send Invitation
      </Button>
    </div>
  );
}

// ─── Bulk Invite ───
function BulkInviteTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<BulkRow[]>([
    { first_name: "", last_name: "", email: "", certification_type: "ptp_coach" },
  ]);
  const [sending, setSending] = useState(false);

  const updateRow = (i: number, field: keyof BulkRow, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const handleSendAll = async () => {
    const valid = rows.filter((r) => r.first_name && r.last_name && r.email);
    if (!valid.length) return;
    setSending(true);
    let sent = 0, failed = 0;
    const errorEmails: string[] = [];
    for (const row of valid) {
      const { data, error } = await supabase.functions.invoke("invite-coach", { body: row });
      const { allSucceeded } = inspectInviteCoachResponse(data as InviteCoachResponse, error);
      if (allSucceeded) sent++; else { failed++; errorEmails.push(row.email); }
    }
    setSending(false);
    toast({
      title: "Bulk Invite Complete",
      description: failed === 0
        ? `${sent} sent.`
        : `${sent} sent, ${failed} failed${errorEmails.length > 0 ? `: ${errorEmails.slice(0, 3).join(", ")}${errorEmails.length > 3 ? "..." : ""}` : ""}`,
      variant: failed > 0 ? "destructive" : "default",
    });
    if (sent > 0) setRows([{ first_name: "", last_name: "", email: "", certification_type: "ptp_coach" }]);
  };

  return (
    <div className="space-y-4 pt-4">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs">First Name</Label>}
            <Input value={row.first_name} onChange={(e) => updateRow(i, "first_name", e.target.value)} placeholder="First" />
          </div>
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs">Last Name</Label>}
            <Input value={row.last_name} onChange={(e) => updateRow(i, "last_name", e.target.value)} placeholder="Last" />
          </div>
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs">Email</Label>}
            <Input type="email" value={row.email} onChange={(e) => updateRow(i, "email", e.target.value)} placeholder="Email" />
          </div>
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs">Certification</Label>}
            <Select value={row.certification_type} onValueChange={(v) => updateRow(i, "certification_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CERT_TYPES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {rows.length > 1 && (
            <Button variant="ghost" size="icon" onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setRows((prev) => [...prev, { first_name: "", last_name: "", email: "", certification_type: "ptp_coach" }])}>
          <Plus className="h-4 w-4 mr-1" /> Add Another
        </Button>
        <Button onClick={handleSendAll} disabled={sending}>
          {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Send All Invitations
        </Button>
      </div>
    </div>
  );
}

// ─── Upload Excel ───
function UploadExcelTab() {
  const { toast } = useToast();
  const [parsed, setParsed] = useState<BulkRow[]>([]);
  const [sending, setSending] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<BulkRow>(ws);
      setParsed(json.filter((r) => r.email));
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([["first_name", "last_name", "email", "certification_type"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coaches");
    XLSX.writeFile(wb, "coach_invite_template.xlsx");
  };

  const handleSend = async () => {
    if (!parsed.length) return;
    setSending(true);
    let sent = 0, failed = 0;
    for (const row of parsed) {
      const { error } = await supabase.functions.invoke("invite-coach", { body: row });
      if (error) failed++; else sent++;
    }
    setSending(false);
    toast({ title: "Upload Complete", description: `${sent} sent, ${failed} failed.` });
    if (sent > 0) setParsed([]);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex gap-2 items-center">
        <div className="relative">
          <Input type="file" accept=".xlsx" onChange={handleFile} className="w-64" />
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-1" /> Download Template
        </Button>
      </div>
      {parsed.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Certification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsed.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.first_name}</TableCell>
                  <TableCell>{r.last_name}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{CERT_LABELS[r.certification_type] || r.certification_type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={handleSend} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Invitations ({parsed.length})
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Main Page ───
export default function CoachManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [certifyCoach, setCertifyCoach] = useState<Coach | null>(null);
  const [certifyType, setCertifyType] = useState("ptp_coach");
  const [certifying, setCertifying] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invRes, coachRes] = await Promise.all([
      supabase.from("coach_invitations").select("id, first_name, last_name, email, certification_type, created_at, expires_at").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("users").select("id, full_name, email").eq("account_type", "coach").order("full_name"),
    ]);
    setInvitations((invRes.data as Invitation[]) || []);

    const coachUsers = (coachRes.data || []) as { id: string; full_name: string | null; email: string }[];
    if (coachUsers.length) {
      const { data: certs } = await supabase.from("coach_certifications").select("id, user_id, certification_type, status").in("user_id", coachUsers.map((c) => c.id));
      setCoaches(coachUsers.map((c) => ({
        ...c,
        certifications: (certs || []).filter((cert: any) => cert.user_id === c.id),
      })));
    } else {
      setCoaches([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResend = async (inv: Invitation) => {
    const { error } = await supabase.functions.invoke("invite-coach", {
      body: { email: inv.email, first_name: inv.first_name, last_name: inv.last_name, certification_type: inv.certification_type },
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Resent", description: `Invitation resent to ${inv.email}` });
  };

  const handleCancel = async (inv: Invitation) => {
    await supabase.from("coach_invitations").update({ status: "expired" }).eq("id", inv.id);
    setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
    toast({ title: "Cancelled", description: `Invitation to ${inv.email} cancelled.` });
  };

  const handleCertify = async () => {
    if (!certifyCoach || !user) return;
    setCertifying(true);
    const { error } = await supabase.from("coach_certifications").update({
      status: "certified",
      certified_at: new Date().toISOString(),
      certified_by: user.id,
    }).eq("user_id", certifyCoach.id).eq("certification_type", certifyType).eq("status", "in_progress");
    setCertifying(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Certified", description: `${certifyCoach.full_name || certifyCoach.email} marked as ${CERT_LABELS[certifyType]}.` });
      setCertifyCoach(null);
      fetchData();
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Coach Management</h1>

      {/* Section 1 — Invite */}
      <Card>
        <CardHeader><CardTitle>Invite Coaches</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="single">
            <TabsList>
              <TabsTrigger value="single">Single Invite</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Invite</TabsTrigger>
              <TabsTrigger value="upload">Upload Excel</TabsTrigger>
            </TabsList>
            <TabsContent value="single"><SingleInviteTab /></TabsContent>
            <TabsContent value="bulk"><BulkInviteTab /></TabsContent>
            <TabsContent value="upload"><UploadExcelTab /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Section 2 — Pending */}
      <Card>
        <CardHeader><CardTitle>Pending Invitations</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No pending invitations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.first_name} {inv.last_name}</TableCell>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>{CERT_LABELS[inv.certification_type] || inv.certification_type}</TableCell>
                    <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(inv.expires_at).toLocaleDateString()}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleResend(inv)}>Resend</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleCancel(inv)}>Cancel</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Active Coaches */}
      <Card>
        <CardHeader><CardTitle>Active Coaches</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : coaches.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No coaches found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Certifications</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coaches.map((coach) => (
                  <TableRow key={coach.id}>
                    <TableCell>{coach.full_name || "—"}</TableCell>
                    <TableCell>{coach.email}</TableCell>
                    <TableCell className="flex flex-wrap gap-1">
                      {coach.certifications.length === 0 ? (
                        <span className="text-muted-foreground text-sm">None</span>
                      ) : (
                        coach.certifications.map((c) => (
                          <Badge key={c.id} variant={c.status === "certified" ? "default" : "secondary"}>
                            {CERT_LABELS[c.certification_type] || c.certification_type}
                            {c.status === "certified" ? " ✓" : ` (${c.status})`}
                          </Badge>
                        ))
                      )}
                    </TableCell>
                    <TableCell>
                      {coach.certifications.some((c) => c.status === "in_progress") && (
                        <Button size="sm" variant="outline" onClick={() => { setCertifyCoach(coach); setCertifyType(coach.certifications.find((c) => c.status === "in_progress")?.certification_type || "ptp_coach"); }}>
                          Mark Certified
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Certify Dialog */}
      <Dialog open={!!certifyCoach} onOpenChange={(o) => !o && setCertifyCoach(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Coach as Certified</DialogTitle>
            <DialogDescription>
              Certify {certifyCoach?.full_name || certifyCoach?.email} for the selected certification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Certification</Label>
            <Select value={certifyType} onValueChange={setCertifyType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(certifyCoach?.certifications || []).filter((c) => c.status === "in_progress").map((c) => (
                  <SelectItem key={c.certification_type} value={c.certification_type}>
                    {CERT_LABELS[c.certification_type] || c.certification_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertifyCoach(null)}>Cancel</Button>
            <Button onClick={handleCertify} disabled={certifying}>
              {certifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Certification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
