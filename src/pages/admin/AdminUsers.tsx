import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, X, Upload, Download, KeyRound, Search, UserX, UserCheck, Users2, RefreshCw, Briefcase } from "lucide-react";

const ADD_DEPT_VALUE = "__add_department__";

const ORG_LEVELS = [
  { value: "IC", label: "IC" },
  { value: "Manager", label: "Manager" },
  { value: "Director", label: "Director" },
  { value: "VP", label: "VP" },
  { value: "C-Suite", label: "C-Suite" },
  { value: "Other", label: "Other" },
];

const ROLE_LABELS: Record<string, string> = {
  corporate_employee: "Employee",
  company_admin: "Company Admin",
  org_admin: "Org Admin",
  brainwise_super_admin: "Super Admin",
};

function formatRole(accountType: string | null) {
  if (!accountType) return "Other";
  return ROLE_LABELS[accountType] || "Other";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
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

const ORG_LEVEL_NORMALIZE: Record<string, string> = {
  "ic": "IC",
  "manager": "Manager",
  "director": "Director",
  "vp": "VP",
  "c-suite": "C-Suite",
  "csuite": "C-Suite",
  "c suite": "C-Suite",
  "other": "Other",
};

function BulkInviteCard({
  orgId,
  departments,
}: {
  orgId: string;
  departments: Array<{ id: string; name: string }>;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkStage, setBulkStage] = useState<BulkStage>("idle");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkResultRow[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const escapeCsv = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
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

      // Normalize headers per row
      const normalized: ParsedRow[] = rawRows.map((row) => {
        const map: Record<string, any> = {};
        for (const k of Object.keys(row)) {
          map[k.toLowerCase().trim()] = row[k];
        }
        const email = (map["email"] ?? "").toString().trim();
        const dept = map["department"];
        const supervisor = map["supervisor"];
        const level = map["level"] ?? map["org_level"];
        const levelStr = level ? String(level).trim() : "";
        const normalizedLevel = levelStr
          ? (ORG_LEVEL_NORMALIZE[levelStr.toLowerCase()] ?? levelStr)
          : null;
        return {
          invitee_email: email,
          department_name: dept ? String(dept).trim() : null,
          supervisor_email: supervisor ? String(supervisor).trim() : null,
          org_level: normalizedLevel,
        };
      });

      const missing = normalized.filter((r) => !r.invitee_email).length;
      if (missing > 0) {
        toast({
          title: `${missing} rows missing email — fix file and retry`,
          variant: "destructive",
        });
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
        }
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
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-pending-invitations", orgId] }),
      qc.invalidateQueries({ queryKey: ["admin-departments", orgId] }),
    ]);
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
  const failCount = createFailedCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk invite</CardTitle>
        <CardDescription>
          Upload a CSV or Excel file with columns: email (required), department, supervisor, level.
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
              {emailFailedCount > 0 && (
                <>, <strong>{emailFailedCount}</strong> created but email failed</>
              )}
              {createFailedCount > 0 && (
                <>, <strong>{createFailedCount}</strong> failed</>
              )}
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
                            <span className="text-sm text-muted-foreground">
                              {r.error_message || "—"}
                            </span>
                          ) : emailFailed ? (
                            <div className="space-y-1">
                              {r.code && (
                                <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">
                                  {r.code}
                                </code>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Share code manually. Email error: {r.email_error || "unknown"}
                              </div>
                            </div>
                          ) : r.code ? (
                            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">
                              {r.code}
                            </code>
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
              {failCount > 0 && (
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

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [orgId, setOrgId] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<string>("");
  const [supervisor, setSupervisor] = useState("");
  const [orgLevel, setOrgLevel] = useState<string>("");
  const [sending, setSending] = useState(false);

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [creatingDept, setCreatingDept] = useState(false);

  const [manualCodeAlert, setManualCodeAlert] = useState<{ email: string; code: string } | null>(null);

  const [resetDialog, setResetDialog] = useState<{
    open: boolean;
    userId: string | null;
    userEmail: string | null;
    userName: string | null;
    sending: boolean;
  }>({ open: false, userId: null, userEmail: null, userName: null, sending: false });

  const [deactivateDialog, setDeactivateDialog] = useState<{
    open: boolean;
    userId: string | null;
    userEmail: string | null;
    userName: string | null;
    targetRole: string | null;
    reason: string;
    sending: boolean;
  }>({ open: false, userId: null, userEmail: null, userName: null, targetRole: null, reason: "", sending: false });

  const [reactivateDialog, setReactivateDialog] = useState<{
    open: boolean;
    userId: string | null;
    userEmail: string | null;
    userName: string | null;
    daysRemaining: number;
    sending: boolean;
  }>({ open: false, userId: null, userEmail: null, userName: null, daysRemaining: 0, sending: false });

  const [supervisorDialog, setSupervisorDialog] = useState<{
    open: boolean;
    userId: string | null;
    userEmail: string | null;
    userName: string | null;
    currentSupervisorId: string | null;
    selectedSupervisorId: string;
    sending: boolean;
  }>({ open: false, userId: null, userEmail: null, userName: null, currentSupervisorId: null, selectedSupervisorId: "", sending: false });

  const [reconciling, setReconciling] = useState(false);

  const [pendingSearch, setPendingSearch] = useState("");
  const [usersSearch, setUsersSearch] = useState("");

  // Executive Perspective state
  const [epnFilter, setEpnFilter] = useState<string>("leaders");
  const [epnSelectedIds, setEpnSelectedIds] = useState<Set<string>>(new Set());
  const [epnNotes, setEpnNotes] = useState("");
  const [epnSubmitting, setEpnSubmitting] = useState(false);
  const [epnSearch, setEpnSearch] = useState("");

  // Load org_id for current admin
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      setOrgId(data?.organization_id ?? null);
    })();
  }, [user]);

  const departmentsQuery = useQuery({
    queryKey: ["admin-departments", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("departments")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  const invitationsQuery = useQuery({
    queryKey: ["admin-pending-invitations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("corporate_invitations")
        .select("id, invitee_email, department_name, org_level, expires_at, created_at")
        .eq("organization_id", orgId)
        .is("redeemed_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        invitee_email: string;
        department_name: string | null;
        org_level: string | null;
        expires_at: string;
        created_at: string;
      }>;
    },
  });

  const orgUsersQuery = useQuery({
    queryKey: ["admin-org-users", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_org_users_view")
        .select("id, email, full_name, account_type, organization_id, department_id, org_level, deactivated_at, reactivation_deadline, deactivation_reason, supervisor_user_id, department_joined_id, department_joined_name, supervisor_joined_id, supervisor_joined_email, supervisor_joined_full_name")
        .eq("organization_id", orgId!)
        .order("email", { ascending: true });
      if (error) throw error;
      const rows = (data || []) as Array<Record<string, unknown>>;
      return rows.map((r) => ({
        id: r.id as string,
        email: r.email as string,
        full_name: (r.full_name as string | null) ?? null,
        account_type: (r.account_type as string | null) ?? null,
        department_id: (r.department_id as string | null) ?? null,
        org_level: (r.org_level as string | null) ?? null,
        deactivated_at: (r.deactivated_at as string | null) ?? null,
        reactivation_deadline: (r.reactivation_deadline as string | null) ?? null,
        deactivation_reason: (r.deactivation_reason as string | null) ?? null,
        supervisor_user_id: (r.supervisor_user_id as string | null) ?? null,
        department: r.department_joined_id
          ? { id: r.department_joined_id as string, name: (r.department_joined_name as string) ?? "" }
          : null,
        supervisor: r.supervisor_joined_id
          ? {
              id: r.supervisor_joined_id as string,
              email: (r.supervisor_joined_email as string) ?? "",
              full_name: (r.supervisor_joined_full_name as string | null) ?? null,
            }
          : null,
      })) as Array<{
        id: string;
        email: string;
        full_name: string | null;
        account_type: string | null;
        department_id: string | null;
        department: { id: string; name: string } | null;
        org_level: string | null;
        deactivated_at: string | null;
        reactivation_deadline: string | null;
        deactivation_reason: string | null;
        supervisor_user_id: string | null;
        supervisor: { id: string; email: string; full_name: string | null } | null;
      }>;
    },
  });

  const departments = departmentsQuery.data || [];

  const handleDeptSelectChange = (value: string) => {
    if (value === ADD_DEPT_VALUE) {
      setNewDeptName("");
      setDeptDialogOpen(true);
      return;
    }
    setDepartment(value);
  };

  const handleCreateDepartment = async () => {
    const name = newDeptName.trim();
    if (!name || !orgId) return;
    setCreatingDept(true);
    const { error } = await (supabase.rpc as any)("department_create", {
      p_organization_id: orgId,
      p_name: name,
    });
    setCreatingDept(false);
    if (error) {
      toast({
        title: "Could not create department",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Department created", description: name });
    setDeptDialogOpen(false);
    setNewDeptName("");
    await qc.invalidateQueries({ queryKey: ["admin-departments", orgId] });
    setDepartment(name);
  };

  const isValid = useMemo(
    () => email.trim().length > 0 && email.includes("@") && department.length > 0,
    [email, department]
  );

  const handleSendInvitation = async () => {
    if (!isValid || !orgId) return;
    setSending(true);
    setManualCodeAlert(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setSending(false);
      toast({ title: "Not signed in", description: "Please log in again.", variant: "destructive" });
      return;
    }

    const cleanedEmail = email.trim();
    const cleanedSupervisor = supervisor.trim();

    let response: Response;
    let result: any = {};
    try {
      response = await fetch(
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
            invitee_email: cleanedEmail,
            department_name: department,
            supervisor_email: cleanedSupervisor || null,
            org_level: orgLevel === "" ? null : orgLevel,
            account_type: "corporate_employee",
          }),
        }
      );
      try {
        result = await response.json();
      } catch {
        // ignore
      }
    } catch (err: any) {
      setSending(false);
      toast({ title: "Network error", description: err.message, variant: "destructive" });
      return;
    }

    setSending(false);

    if (response.ok) {
      await qc.invalidateQueries({ queryKey: ["admin-pending-invitations", orgId] });

      if (result?.email_sent) {
        toast({
          title: "Invitation sent",
          description: `Sent to ${cleanedEmail}. Code: ${result.code}`,
        });
      } else {
        setManualCodeAlert({ email: cleanedEmail, code: result?.code || "(no code returned)" });
      }
      setEmail("");
      setSupervisor("");
      return;
    }

    const status = response.status;
    const errCode = result?.code;
    const errMsg = result?.error;

    if (status === 409 || errCode === "23505") {
      toast({ title: "Already exists", description: "An account already exists for that email address.", variant: "destructive" });
    } else if (status === 403 || errCode === "42501") {
      toast({ title: "Forbidden", description: "You don't have permission to create invitations for this organization.", variant: "destructive" });
    } else if (status === 400 || errCode === "22023") {
      toast({ title: "Invalid request", description: errMsg || "Bad request", variant: "destructive" });
    } else {
      toast({ title: "Error", description: errMsg || "Something went wrong, please try again.", variant: "destructive" });
    }
  };

  const openResetDialog = (u: { id: string; email: string; full_name: string | null }) => {
    setResetDialog({
      open: true,
      userId: u.id,
      userEmail: u.email,
      userName: u.full_name,
      sending: false,
    });
  };

  const handleSendPasswordReset = async () => {
    if (!resetDialog.userId) return;
    setResetDialog((s) => ({ ...s, sending: true }));

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setResetDialog((s) => ({ ...s, sending: false }));
      toast({ title: "Not signed in", description: "Please log in again.", variant: "destructive" });
      return;
    }

    let response: Response;
    let result: any = {};
    try {
      response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin_trigger_password_reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ target_user_id: resetDialog.userId }),
        }
      );
      try {
        result = await response.json();
      } catch {
        // ignore
      }
    } catch (err: any) {
      setResetDialog((s) => ({ ...s, sending: false }));
      toast({ title: "Network error", description: err.message, variant: "destructive" });
      return;
    }

    if (response.ok && result?.email_sent === true) {
      const target = result?.target_email || resetDialog.userEmail;
      setResetDialog({ open: false, userId: null, userEmail: null, userName: null, sending: false });
      toast({ title: "Password reset email sent", description: `Sent to ${target}` });
      return;
    }

    if (response.ok && result?.email_sent === false) {
      setResetDialog({ open: false, userId: null, userEmail: null, userName: null, sending: false });
      toast({
        title: "Password reset link created, email delivery failed",
        description: "Contact the user directly.",
        variant: "destructive",
      });
      return;
    }

    setResetDialog((s) => ({ ...s, sending: false }));
    const status = response.status;
    const errCode = result?.code;
    if (status === 403 || errCode === "42501") {
      toast({ title: "Forbidden", description: "You don't have permission to reset this user's password.", variant: "destructive" });
    } else if (status === 404) {
      toast({ title: "User not found", variant: "destructive" });
    } else {
      toast({ title: "Error", description: result?.error || "Something went wrong", variant: "destructive" });
    }
  };

  const openDeactivateDialog = (u: { id: string; email: string; full_name: string | null; account_type: string | null }) => {
    setDeactivateDialog({
      open: true,
      userId: u.id,
      userEmail: u.email,
      userName: u.full_name,
      targetRole: u.account_type,
      reason: "",
      sending: false,
    });
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateDialog.userId) return;
    setDeactivateDialog((s) => ({ ...s, sending: true }));
    const trimmedReason = deactivateDialog.reason.trim();
    const { error } = await (supabase.rpc as any)("user_deactivate", {
      p_target_user_id: deactivateDialog.userId,
      p_reason: trimmedReason.length > 0 ? trimmedReason : null,
    });
    if (error) {
      setDeactivateDialog((s) => ({ ...s, sending: false }));
      const code = (error as any).code;
      if (code === "42501") {
        toast({ title: "Forbidden", description: "You don't have permission to deactivate this user.", variant: "destructive" });
      } else if (code === "P0002") {
        toast({ title: "User not found", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }
    const targetLabel = deactivateDialog.userName || deactivateDialog.userEmail;
    setDeactivateDialog({ open: false, userId: null, userEmail: null, userName: null, targetRole: null, reason: "", sending: false });
    toast({ title: "User deactivated", description: `${targetLabel} has been deactivated with a 90-day reactivation window.` });
    await qc.invalidateQueries({ queryKey: ["admin-org-users", orgId] });
  };

  const openReactivateDialog = (u: {
    id: string;
    email: string;
    full_name: string | null;
    reactivation_deadline: string | null;
  }) => {
    const days = u.reactivation_deadline
      ? Math.max(0, Math.ceil((new Date(u.reactivation_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;
    setReactivateDialog({
      open: true,
      userId: u.id,
      userEmail: u.email,
      userName: u.full_name,
      daysRemaining: days,
      sending: false,
    });
  };

  const handleConfirmReactivate = async () => {
    if (!reactivateDialog.userId) return;
    setReactivateDialog((s) => ({ ...s, sending: true }));
    const { error } = await (supabase.rpc as any)("user_reactivate", {
      p_target_user_id: reactivateDialog.userId,
    });
    if (error) {
      setReactivateDialog((s) => ({ ...s, sending: false }));
      const code = (error as any).code;
      if (code === "42501") {
        toast({ title: "Forbidden", description: "You don't have permission to reactivate this user.", variant: "destructive" });
      } else if (code === "22023") {
        toast({ title: "Cannot reactivate", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }
    const targetLabel = reactivateDialog.userName || reactivateDialog.userEmail;
    setReactivateDialog({ open: false, userId: null, userEmail: null, userName: null, daysRemaining: 0, sending: false });
    toast({ title: "User reactivated", description: `${targetLabel} is active again.` });
    await qc.invalidateQueries({ queryKey: ["admin-org-users", orgId] });
  };

  const openSupervisorDialog = (u: {
    id: string;
    email: string;
    full_name: string | null;
    supervisor_user_id: string | null;
  }) => {
    setSupervisorDialog({
      open: true,
      userId: u.id,
      userEmail: u.email,
      userName: u.full_name,
      currentSupervisorId: u.supervisor_user_id,
      selectedSupervisorId: u.supervisor_user_id ?? "__unset__",
      sending: false,
    });
  };

  const handleSaveSupervisor = async () => {
    if (!supervisorDialog.userId) return;
    setSupervisorDialog((s) => ({ ...s, sending: true }));
    const supervisorId = supervisorDialog.selectedSupervisorId === "__unset__" ? null : supervisorDialog.selectedSupervisorId;
    const { error } = await (supabase.rpc as any)("user_assign_supervisor", {
      p_target_user_id: supervisorDialog.userId,
      p_supervisor_user_id: supervisorId,
    });
    if (error) {
      setSupervisorDialog((s) => ({ ...s, sending: false }));
      const code = (error as any).code;
      if (code === "42501") {
        toast({ title: "Forbidden", description: "You don't have permission to change this user's supervisor.", variant: "destructive" });
      } else if (code === "22023") {
        toast({ title: "Cannot assign", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }
    const targetLabel = supervisorDialog.userName || supervisorDialog.userEmail;
    setSupervisorDialog({ open: false, userId: null, userEmail: null, userName: null, currentSupervisorId: null, selectedSupervisorId: "", sending: false });
    toast({ title: "Supervisor updated", description: supervisorId ? `${targetLabel}'s supervisor has been changed.` : `${targetLabel}'s supervisor has been cleared.` });
    await qc.invalidateQueries({ queryKey: ["admin-org-users", orgId] });
  };

  const handleReconcileSupervisors = async () => {
    if (!orgId) return;
    setReconciling(true);
    const { data, error } = await (supabase.rpc as any)("reconcile_supervisors_for_org", {
      p_organization_id: orgId,
    });
    setReconciling(false);
    if (error) {
      toast({ title: "Reconcile failed", description: error.message, variant: "destructive" });
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const n: number = row?.out_users_patched ?? 0;
    if (n === 0) {
      toast({ title: "No supervisor changes", description: "All supervisor assignments are already in place." });
    } else {
      toast({ title: "Supervisors reconciled", description: `${n} user${n === 1 ? "" : "s"} updated from pending invitation data.` });
    }
    await qc.invalidateQueries({ queryKey: ["admin-org-users", orgId] });
  };

  if (orgId === undefined) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orgId === null) {
    return (
      <div className="p-6 max-w-3xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No organization</AlertTitle>
          <AlertDescription>
            Your account is not linked to an organization. Contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">Invite new users to your organization.</p>
      </div>

      {manualCodeAlert && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <div className="flex-1">
            <AlertTitle>Email delivery failed</AlertTitle>
            <AlertDescription>
              Invitation created for <strong>{manualCodeAlert.email}</strong>, but email delivery failed.
              Share this code manually:{" "}
              <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{manualCodeAlert.code}</code>
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setManualCodeAlert(null)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invite a user</CardTitle>
          <CardDescription>Send an invitation code to a new corporate employee.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="employee@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-dept">Department *</Label>
              <Select value={department} onValueChange={handleDeptSelectChange} disabled={sending}>
                <SelectTrigger id="invite-dept">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ADD_DEPT_VALUE}>+ Add department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-supervisor">Supervisor email</Label>
              <Input
                id="invite-supervisor"
                type="email"
                placeholder="manager@company.com"
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
                disabled={sending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-level">Org level</Label>
              <Select value={orgLevel || "__unset__"} onValueChange={(v) => setOrgLevel(v === "__unset__" ? "" : v)} disabled={sending}>
                <SelectTrigger id="invite-level">
                  <SelectValue placeholder="-- Not specified --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__">-- Not specified --</SelectItem>
                  {ORG_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSendInvitation} disabled={!isValid || sending}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send invitation
            </Button>
          </div>
        </CardContent>
      </Card>

      <BulkInviteCard orgId={orgId} departments={departments} />

      {(() => {
        const allPending = invitationsQuery.data || [];
        const q = pendingSearch.trim().toLowerCase();
        const filteredPending = !q
          ? allPending
          : allPending.filter(
              (inv) =>
                inv.invitee_email.toLowerCase().includes(q) ||
                (inv.department_name?.toLowerCase().includes(q) ?? false)
            );
        return (
          <Card>
            <CardHeader>
              <CardTitle>Pending invitations</CardTitle>
              <CardDescription>Unredeemed invitations that have not yet expired.</CardDescription>
              <div className="relative max-w-sm pt-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 mt-1 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  placeholder="Search by email or department…"
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              {invitationsQuery.isLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : allPending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No pending invitations.</p>
              ) : filteredPending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No invitations match your search.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Org Level</TableHead>
                      <TableHead>Sent on</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPending.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invitee_email}</TableCell>
                        <TableCell>{inv.department_name || "—"}</TableCell>
                        <TableCell>{inv.org_level || "—"}</TableCell>
                        <TableCell>{formatDate(inv.created_at)}</TableCell>
                        <TableCell>{formatDate(inv.expires_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {(() => {
        const allUsers = orgUsersQuery.data || [];
        const q = usersSearch.trim().toLowerCase();
        const filteredUsers = !q
          ? allUsers
          : allUsers.filter(
              (u) =>
                u.email.toLowerCase().includes(q) ||
                (u.full_name?.toLowerCase().includes(q) ?? false) ||
                (u.department?.name?.toLowerCase().includes(q) ?? false) ||
                (u.supervisor?.full_name?.toLowerCase().includes(q) ?? false) ||
                (u.supervisor?.email?.toLowerCase().includes(q) ?? false)
            );
        return (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle>Users in your organization</CardTitle>
                  <CardDescription>All users currently linked to your organization.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleReconcileSupervisors} disabled={reconciling}>
                  {reconciling ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Reconcile supervisors
                </Button>
              </div>
              <div className="relative max-w-sm pt-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 mt-1 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  placeholder="Search by email, name, department, or supervisor…"
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              {orgUsersQuery.isLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : allUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No users in your organization yet.
                </p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No users match your search.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Supervisor</TableHead>
                      <TableHead>Org Level</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => {
                      const isDeactivated = !!u.deactivated_at;
                      const inGrace = isDeactivated && u.reactivation_deadline && new Date(u.reactivation_deadline).getTime() > Date.now();
                      const graceExpired = isDeactivated && !inGrace;
                      const daysRemaining = u.reactivation_deadline
                        ? Math.max(0, Math.ceil((new Date(u.reactivation_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                        : 0;
                      const isSelf = u.id === user?.id;
                      return (
                        <TableRow key={u.id} className={isDeactivated ? "opacity-60" : undefined}>
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell>{u.full_name || "—"}</TableCell>
                          <TableCell>{formatRole(u.account_type)}</TableCell>
                          <TableCell>
                            {!isDeactivated ? (
                              <Badge variant="outline">Active</Badge>
                            ) : inGrace ? (
                              <div className="space-y-0.5">
                                <Badge variant="secondary">Deactivated</Badge>
                                <div className={`text-xs ${daysRemaining <= 7 ? "text-destructive" : "text-muted-foreground"}`}>
                                  {daysRemaining} days remaining
                                </div>
                              </div>
                            ) : (
                              <Badge variant="destructive">Grace expired</Badge>
                            )}
                          </TableCell>
                          <TableCell>{u.department?.name || "—"}</TableCell>
                          <TableCell>{u.supervisor?.full_name || u.supervisor?.email || "—"}</TableCell>
                          <TableCell>{u.org_level || "—"}</TableCell>
                          <TableCell className="text-right">
                            {isSelf || graceExpired ? (
                              <span className="text-muted-foreground">—</span>
                            ) : inGrace ? (
                              <div className="flex justify-end gap-2">
                                <Button variant="default" size="sm" onClick={() => openReactivateDialog(u)}>
                                  <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                                  Reactivate
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openResetDialog(u)}
                                >
                                  <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                                  Reset password
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openSupervisorDialog(u)}
                                >
                                  <Users2 className="h-3.5 w-3.5 mr-1.5" />
                                  Change supervisor
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => openDeactivateDialog(u)}>
                                  <UserX className="h-3.5 w-3.5 mr-1.5" />
                                  Deactivate
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })()}

      <Dialog open={deptDialogOpen} onOpenChange={(open) => !creatingDept && setDeptDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription>Create a new department in your organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-dept-name">Department name</Label>
            <Input
              id="new-dept-name"
              placeholder="e.g. Engineering"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              disabled={creatingDept}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)} disabled={creatingDept}>
              Cancel
            </Button>
            <Button onClick={handleCreateDepartment} disabled={creatingDept || !newDeptName.trim()}>
              {creatingDept && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {creatingDept ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetDialog.open}
        onOpenChange={(open) => {
          if (resetDialog.sending) return;
          if (!open) {
            setResetDialog({ open: false, userId: null, userEmail: null, userName: null, sending: false });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Send a password reset email to {resetDialog.userName || resetDialog.userEmail}? They'll
              receive an email with a link to set a new password. The link expires in 1 hour.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setResetDialog({ open: false, userId: null, userEmail: null, userName: null, sending: false })
              }
              disabled={resetDialog.sending}
            >
              Cancel
            </Button>
            <Button onClick={handleSendPasswordReset} disabled={resetDialog.sending}>
              {resetDialog.sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send reset email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deactivateDialog.open}
        onOpenChange={(open) => {
          if (deactivateDialog.sending) return;
          if (!open) {
            setDeactivateDialog({ open: false, userId: null, userEmail: null, userName: null, targetRole: null, reason: "", sending: false });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate user</DialogTitle>
            <DialogDescription>
              This will deactivate {deactivateDialog.userName || deactivateDialog.userEmail}. They will lose access immediately and can be reactivated within 90 days. After that, their account data is scheduled for permanent removal.
            </DialogDescription>
          </DialogHeader>
          {deactivateDialog.targetRole === "brainwise_super_admin" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>This user is a super admin</AlertTitle>
              <AlertDescription>
                You are about to deactivate a BrainWise super admin. Make sure this is intentional.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="deactivate-reason">Reason (optional)</Label>
            <Input
              id="deactivate-reason"
              placeholder="e.g. Left the company"
              value={deactivateDialog.reason}
              onChange={(e) => setDeactivateDialog((s) => ({ ...s, reason: e.target.value }))}
              disabled={deactivateDialog.sending}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">Captured in the audit log for this action.</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeactivateDialog({ open: false, userId: null, userEmail: null, userName: null, targetRole: null, reason: "", sending: false })
              }
              disabled={deactivateDialog.sending}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeactivate} disabled={deactivateDialog.sending}>
              {deactivateDialog.sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reactivateDialog.open}
        onOpenChange={(open) => {
          if (reactivateDialog.sending) return;
          if (!open) {
            setReactivateDialog({ open: false, userId: null, userEmail: null, userName: null, daysRemaining: 0, sending: false });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate user</DialogTitle>
            <DialogDescription>
              Restore access for {reactivateDialog.userName || reactivateDialog.userEmail}? They have {reactivateDialog.daysRemaining} day{reactivateDialog.daysRemaining === 1 ? "" : "s"} remaining in their grace window. Reactivation will clear the deactivation state and restore their account immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setReactivateDialog({ open: false, userId: null, userEmail: null, userName: null, daysRemaining: 0, sending: false })
              }
              disabled={reactivateDialog.sending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmReactivate} disabled={reactivateDialog.sending}>
              {reactivateDialog.sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={supervisorDialog.open}
        onOpenChange={(open) => {
          if (supervisorDialog.sending) return;
          if (!open) {
            setSupervisorDialog({ open: false, userId: null, userEmail: null, userName: null, currentSupervisorId: null, selectedSupervisorId: "", sending: false });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change supervisor</DialogTitle>
            <DialogDescription>
              Select a new supervisor for {supervisorDialog.userName || supervisorDialog.userEmail}, or clear the supervisor assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="supervisor-select">Supervisor</Label>
            <Select
              value={supervisorDialog.selectedSupervisorId}
              onValueChange={(v) => setSupervisorDialog((s) => ({ ...s, selectedSupervisorId: v }))}
              disabled={supervisorDialog.sending}
            >
              <SelectTrigger id="supervisor-select">
                <SelectValue placeholder="Select a supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unset__">— No supervisor —</SelectItem>
                {(orgUsersQuery.data || [])
                  .filter((cand) => cand.id !== supervisorDialog.userId && !cand.deactivated_at)
                  .slice()
                  .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email))
                  .map((cand) => (
                    <SelectItem key={cand.id} value={cand.id}>
                      {cand.full_name || cand.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setSupervisorDialog({ open: false, userId: null, userEmail: null, userName: null, currentSupervisorId: null, selectedSupervisorId: "", sending: false })
              }
              disabled={supervisorDialog.sending}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSupervisor} disabled={supervisorDialog.sending}>
              {supervisorDialog.sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
