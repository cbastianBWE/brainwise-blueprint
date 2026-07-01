import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2, Mail, Upload, Download, Trash2, Users, Send,
} from "lucide-react";
import { PUBLIC_INSTRUMENTS } from "@/lib/instruments";

const NONE = "__none__";

const ORG_LEVELS = ["IC", "Manager", "Director", "VP", "C-Suite", "Other"];

const ORG_LEVEL_NORMALIZE: Record<string, string> = {
  ic: "IC",
  manager: "Manager",
  director: "Director",
  vp: "VP",
  "c-suite": "C-Suite",
  csuite: "C-Suite",
  "c suite": "C-Suite",
  other: "Other",
};

interface Department {
  id: string;
  name: string;
}

interface PendingInvitation {
  id: string;
  invitee_email: string;
  account_type: string | null;
  department_name: string | null;
  org_level: string | null;
  expires_at: string | null;
  created_at: string;
}

type ParsedRow = {
  invitee_email: string;
  department_name: string | null;
  supervisor_email: string | null;
  org_level: string | null;
};

type BulkResultRow = {
  row_index: number;
  invitee_email: string;
  success: boolean;
  invitation_id: string | null;
  code: string | null;
  department_created: boolean;
  error_code: string | null;
  error_message: string | null;
  email_sent: boolean;
  email_error: string | null;
};

type BulkStage = "idle" | "preview" | "sending" | "results";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function roleLabel(at: string | null) {
  switch (at) {
    case "corporate_employee": return "Member";
    case "company_admin": return "Company Admin";
    case "org_admin": return "Org Admin";
    default: return "Other";
  }
}

export default function CompanyInvitationsSection({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pending, setPending] = useState<PendingInvitation[]>([]);

  // Single invite form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("corporate_employee");
  const [deptName, setDeptName] = useState<string>(NONE);
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [orgLevel, setOrgLevel] = useState<string>(NONE);
  const [requiredInstrumentId, setRequiredInstrumentId] = useState("INST-001");
  const [sendingSingle, setSendingSingle] = useState(false);
  const [manualCode, setManualCode] = useState<{ email: string; code: string } | null>(null);

  // Revoke dialog
  const [revokeRow, setRevokeRow] = useState<PendingInvitation | null>(null);
  const [revokePending, setRevokePending] = useState(false);

  const loadPending = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("corporate_invitations")
      .select("id, invitee_email, account_type, department_name, org_level, expires_at, created_at")
      .eq("organization_id", orgId)
      .is("redeemed_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load invitations", description: error.message, variant: "destructive" });
      return;
    }
    setPending((data || []) as PendingInvitation[]);
  }, [orgId, toast]);

  const load = useCallback(async () => {
    const [deptRes, _] = await Promise.all([
      (supabase as any).from("departments").select("id, name").eq("organization_id", orgId),
      loadPending(),
    ]);
    if (deptRes.error) {
      toast({ title: "Failed to load departments", description: deptRes.error.message, variant: "destructive" });
    } else {
      const rows = (deptRes.data || []) as Department[];
      rows.sort((a, b) => a.name.localeCompare(b.name));
      setDepartments(rows);
    }
    setLoading(false);
  }, [orgId, toast, loadPending]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const resetSingleForm = () => {
    setEmail("");
    setRole("corporate_employee");
    setDeptName(NONE);
    setSupervisorEmail("");
    setOrgLevel(NONE);
    setRequiredInstrumentId("INST-001");
  };

  const handleSendSingle = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    setSendingSingle(true);
    setManualCode(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    let resp: Response;
    let result: any = {};
    try {
      resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invitation_send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            organization_id: orgId,
            invitee_email: trimmed,
            department_name: deptName === NONE ? null : deptName,
            supervisor_email: supervisorEmail.trim() || null,
            org_level: orgLevel === NONE ? null : orgLevel,
            account_type: role,
            required_instrument_id: requiredInstrumentId,
          }),
        },
      );
      result = await resp.json().catch(() => ({}));
    } catch (err: any) {
      setSendingSingle(false);
      toast({ title: "Network error", description: err.message, variant: "destructive" });
      return;
    }

    setSendingSingle(false);

    if (resp.ok && result.email_sent) {
      toast({ title: "Invitation sent", description: result.code ? `Code: ${result.code}` : trimmed });
      resetSingleForm();
      await loadPending();
    } else if (resp.ok && !result.email_sent) {
      setManualCode({ email: trimmed, code: result.code || "" });
      toast({ title: "Invitation created (email not sent)", description: "Share the manual code." });
      resetSingleForm();
      await loadPending();
    } else {
      toast({
        title: "Invitation failed",
        description: result.error || `HTTP ${resp.status}`,
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async () => {
    if (!revokeRow) return;
    setRevokePending(true);
    const { error } = await (supabase.rpc as any)("admin_invitation_revoke", {
      p_invitation_id: revokeRow.id,
    });
    setRevokePending(false);
    if (error) {
      toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Invitation revoked", description: revokeRow.invitee_email });
    setRevokeRow(null);
    await loadPending();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="space-y-6">
      {/* Card A — Single invite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" />
            Single invite
          </CardTitle>
          <CardDescription>Invite one user to this organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-email">Email *</Label>
              <Input
                id="inv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sendingSingle}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole} disabled={sendingSingle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate_employee">Member</SelectItem>
                  <SelectItem value="company_admin">Company Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={deptName} onValueChange={setDeptName} disabled={sendingSingle}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-sup">Supervisor email</Label>
              <Input
                id="inv-sup"
                type="email"
                value={supervisorEmail}
                onChange={(e) => setSupervisorEmail(e.target.value)}
                disabled={sendingSingle}
                placeholder="supervisor@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Org Level</Label>
              <Select value={orgLevel} onValueChange={setOrgLevel} disabled={sendingSingle}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {ORG_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assessment</Label>
              <Select value={requiredInstrumentId} onValueChange={setRequiredInstrumentId} disabled={sendingSingle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PUBLIC_INSTRUMENTS.map((i) => (
                    <SelectItem key={i.instrument_id} value={i.instrument_id}>
                      {i.short_name} ({i.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {manualCode && (
            <Alert>
              <AlertTitle>Manual invite code for {manualCode.email}</AlertTitle>
              <AlertDescription>
                Email was not sent. Share this code with the user:{" "}
                <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">{manualCode.code}</code>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSendSingle} disabled={sendingSingle} className="gap-2">
              {sendingSingle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send invitation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card B — Bulk invite */}
      <BulkInviteCard orgId={orgId} departments={departments} onComplete={loadPending} />

      {/* Card C — Pending invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            {pending.length} pending invitation{pending.length === 1 ? "" : "s"}
          </CardTitle>
          <CardDescription>Outstanding invitations that have not been redeemed.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Org Level</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                      No pending invitations.
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.map((r) => {
                    const expired = r.expires_at && new Date(r.expires_at).getTime() < now;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.invitee_email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{roleLabel(r.account_type)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{r.department_name || "—"}</TableCell>
                        <TableCell className="text-sm">{r.org_level || "—"}</TableCell>
                        <TableCell className="text-sm">{formatDate(r.created_at)}</TableCell>
                        <TableCell className="text-sm">{formatDate(r.expires_at)}</TableCell>
                        <TableCell>
                          {expired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge>Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1"
                            onClick={() => setRevokeRow(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Revoke confirm */}
      <Dialog open={!!revokeRow} onOpenChange={(o) => !o && setRevokeRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke invitation?</DialogTitle>
            <DialogDescription>
              This will revoke the invitation for{" "}
              <strong>{revokeRow?.invitee_email}</strong>. The recipient will no longer be able to redeem it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeRow(null)} disabled={revokePending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revokePending} className="gap-2">
              {revokePending && <Loader2 className="h-4 w-4 animate-spin" />}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Bulk invite card (mirrors AdminUsers.tsx) ─────────────────────────────
function BulkInviteCard({
  orgId,
  departments,
  onComplete,
}: {
  orgId: string;
  departments: Array<{ id: string; name: string }>;
  onComplete: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkStage, setBulkStage] = useState<BulkStage>("idle");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkResultRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [requiredInstrumentId, setRequiredInstrumentId] = useState("INST-001");

  const escapeCsv = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };

  const handleDownloadTemplate = () => {
    const exampleDept1 = departments[0]?.name ?? "Engineering";
    const exampleDept2 = departments[1]?.name ?? departments[0]?.name ?? "Marketing";

    const csv = [
      "email,department,supervisor,level",
      `alice@example.com,${escapeCsv(exampleDept1)},bob@example.com,IC`,
      `bob@example.com,${escapeCsv(exampleDept1)},,Manager`,
      `carol@example.com,${escapeCsv(exampleDept2)},,Director`,
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brainwise-invite-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setBulkStage("idle");
    setParsedRows([]);
    setBulkResults([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });

      if (rawRows.length === 0) {
        toast({ title: "No rows found in file", variant: "destructive" });
        reset();
        return;
      }
      if (rawRows.length > 75) {
        toast({ title: `Max 75 rows per upload. Got ${rawRows.length}.`, variant: "destructive" });
        reset();
        return;
      }

      const normalized: ParsedRow[] = rawRows.map((row) => {
        const map: Record<string, any> = {};
        for (const k of Object.keys(row)) {
          map[k.toLowerCase().trim()] = row[k];
        }
        const emailVal = (map["email"] ?? "").toString().trim();
        const dept = map["department"];
        const supervisor = map["supervisor"];
        const level = map["level"] ?? map["org_level"];
        const levelStr = level ? String(level).trim() : "";
        const normalizedLevel = levelStr
          ? (ORG_LEVEL_NORMALIZE[levelStr.toLowerCase()] ?? levelStr)
          : null;
        return {
          invitee_email: emailVal,
          department_name: dept ? String(dept).trim() : null,
          supervisor_email: supervisor ? String(supervisor).trim() : null,
          org_level: normalizedLevel,
        };
      });

      const missing = normalized.filter((r) => !r.invitee_email).length;
      if (missing > 0) {
        toast({ title: `${missing} rows missing email — fix file and retry`, variant: "destructive" });
        reset();
        return;
      }

      setParsedRows(normalized);
      setBulkStage("preview");
    } catch (err: any) {
      toast({ title: "Failed to parse file", description: err.message, variant: "destructive" });
      reset();
    }
  };

  const handleSend = async () => {
    setBulkStage("sending");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      toast({ title: "Not signed in", variant: "destructive" });
      setBulkStage("preview");
      return;
    }

    let response: Response;
    let result: any = {};
    try {
      response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk_invitation_send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            organization_id: orgId,
            rows: parsedRows,
          }),
        },
      );
      result = await response.json().catch(() => ({}));
    } catch (err: any) {
      toast({ title: "Network error", description: err.message, variant: "destructive" });
      setBulkStage("preview");
      return;
    }

    if (!response.ok) {
      toast({
        title: "Bulk invite failed",
        description: result?.error || `HTTP ${response.status}`,
        variant: "destructive",
      });
      setBulkStage("preview");
      return;
    }

    setBulkResults((result.results || []) as BulkResultRow[]);
    setBulkStage("results");
    await onComplete();
  };

  const downloadFailedCsv = () => {
    const failed = bulkResults.filter((r) => !r.success);
    if (failed.length === 0) return;
    const header = ["email", "department", "supervisor", "level", "error_code", "error_message"];
    const csvLines = [header.join(",")];
    for (const r of failed) {
      const orig = parsedRows[r.row_index] || ({} as ParsedRow);
      const fields = [
        r.invitee_email,
        orig.department_name ?? "",
        orig.supervisor_email ?? "",
        orig.org_level ?? "",
        r.error_code ?? "",
        r.error_message ?? "",
      ].map((v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      });
      csvLines.push(fields.join(","));
    }
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "failed-invitations.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const emailSentCount = bulkResults.filter((r) => r.success && r.email_sent).length;
  const emailFailedCount = bulkResults.filter((r) => r.success && !r.email_sent).length;
  const createFailedCount = bulkResults.filter((r) => !r.success).length;
  const deptCreatedCount = bulkResults.filter((r) => r.department_created).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="h-5 w-5 text-primary" />
          Bulk invite
        </CardTitle>
        <CardDescription>
          Upload a CSV or Excel file with columns: email (required), department, supervisor, level. Up to 75 rows per upload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bulkStage === "idle" && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download template
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose file to upload
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Required column: email. Optional: department, supervisor, level.</p>
              <p>Accepted level values: IC, Manager, Director, VP, C-Suite, Other.</p>
            </div>
          </div>
        )}

        {(bulkStage === "preview" || bulkStage === "sending") && (
          <div className="space-y-4">
            <div className="text-sm">
              Ready to send <strong>{parsedRows.length}</strong> invitations
              {fileName && <> from <span className="text-muted-foreground">{fileName}</span></>}.
              Review and confirm.
            </div>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Org Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 10).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.invitee_email}</TableCell>
                      <TableCell>{r.department_name || "—"}</TableCell>
                      <TableCell>{r.supervisor_email || "—"}</TableCell>
                      <TableCell>{r.org_level || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedRows.length > 10 && (
                <div className="px-4 py-2 text-sm text-muted-foreground border-t">
                  + {parsedRows.length - 10} more
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset} disabled={bulkStage === "sending"}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={bulkStage === "sending"}>
                {bulkStage === "sending" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send invitations
              </Button>
            </div>
          </div>
        )}

        {bulkStage === "results" && (
          <div className="space-y-4">
            <p className="text-sm">
              <strong>{emailSentCount}</strong> sent
              {emailFailedCount > 0 && (<>, <strong>{emailFailedCount}</strong> created but email failed</>)}
              {createFailedCount > 0 && (<>, <strong>{createFailedCount}</strong> failed</>)}
              , <strong>{deptCreatedCount}</strong> departments auto-created
            </p>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row #</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkResults.map((r) => {
                    const emailFailed = r.success && !r.email_sent;
                    return (
                      <TableRow key={r.row_index}>
                        <TableCell>{r.row_index}</TableCell>
                        <TableCell className="font-medium">{r.invitee_email}</TableCell>
                        <TableCell>
                          {!r.success ? (
                            <Badge variant="destructive">Failed</Badge>
                          ) : emailFailed ? (
                            <Badge variant="secondary">Created (email failed)</Badge>
                          ) : (
                            <Badge variant="default">Sent</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!r.success ? (
                            <span className="text-sm text-muted-foreground">{r.error_message || "—"}</span>
                          ) : emailFailed ? (
                            <div className="space-y-1">
                              {r.code && (
                                <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">{r.code}</code>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Share code manually. Email error: {r.email_error || "unknown"}
                              </div>
                            </div>
                          ) : r.code ? (
                            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">{r.code}</code>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2">
              {createFailedCount > 0 && (
                <Button variant="outline" onClick={downloadFailedCsv}>
                  <Download className="h-4 w-4 mr-2" />
                  Download failed rows as CSV
                </Button>
              )}
              <Button onClick={reset}>Upload another file</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
