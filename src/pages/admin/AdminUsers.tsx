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
import { Loader2, AlertTriangle, X, Upload, Download, KeyRound, Search, UserX, UserCheck, Users2, RefreshCw, Briefcase, CheckCircle2 } from "lucide-react";

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

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDeactivateDialog, setBulkDeactivateDialog] = useState<{
    open: boolean;
    sending: boolean;
    results: null | {
      succeeded: number;
      failed: Array<{ user_id: string; error: string }>;
      emails_sent: number;
      emails_failed: number;
      email_failures: Array<{ user_id: string; error: string }>;
    };
  }>({ open: false, sending: false, results: null });

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

  const epnAssignmentsQuery = useQuery({
    queryKey: ["epn-assignments", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("executive_perspective_assignments")
        .select("id, assignee_user_id, status, assigned_at, started_at, completed_at, assigned_by, notes")
        .eq("organization_id", orgId)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        assignee_user_id: string;
        status: string;
        assigned_at: string;
        started_at: string | null;
        completed_at: string | null;
        assigned_by: string | null;
        notes: string | null;
      }>;
    },
  });

  const departments = departmentsQuery.data || [];

  const isBulkEligible = (u: { id: string; account_type: string | null; deactivated_at: string | null }) => {
    if (!user) return false;
    if (u.id === user.id) return false;
    if (u.deactivated_at) return false;
    if (u.account_type === "company_admin" || u.account_type === "org_admin" || u.account_type === "brainwise_super_admin") return false;
    return true;
  };

  // Prune selectedUserIds when org users data changes
  useEffect(() => {
    const data = orgUsersQuery.data;
    if (!data) return;
    setSelectedUserIds((prev) => {
      if (prev.size === 0) return prev;
      const eligibleIds = new Set(data.filter(isBulkEligible).map((u) => u.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (eligibleIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgUsersQuery.data, user?.id]);

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
    const targetLabel = deactivateDialog.userName || deactivateDialog.userEmail;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setDeactivateDialog((s) => ({ ...s, sending: false }));
      toast({ title: "Not signed in", description: "Please log in again.", variant: "destructive" });
      return;
    }

    let response: Response;
    let result: any = {};
    try {
      response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deactivate-and-notify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            target_user_id: deactivateDialog.userId,
            reason: trimmedReason.length > 0 ? trimmedReason : null,
          }),
        }
      );
      try { result = await response.json(); } catch { /* ignore */ }
    } catch (err: any) {
      setDeactivateDialog((s) => ({ ...s, sending: false }));
      toast({ title: "Network error", description: err?.message || "Network error", variant: "destructive" });
      return;
    }

    if (!response.ok || result?.success === false) {
      setDeactivateDialog((s) => ({ ...s, sending: false }));
      const code = result?.code;
      if (response.status === 403 || code === "42501") {
        toast({ title: "Forbidden", description: "You don't have permission to deactivate this user.", variant: "destructive" });
      } else if (response.status === 404 || code === "P0002") {
        toast({ title: "User not found", variant: "destructive" });
      } else {
        toast({ title: "Error", description: result?.error || "Something went wrong", variant: "destructive" });
      }
      return;
    }

    setDeactivateDialog({ open: false, userId: null, userEmail: null, userName: null, targetRole: null, reason: "", sending: false });
    if (result.email_sent) {
      toast({
        title: "User deactivated",
        description: `${targetLabel} has been deactivated. They've been emailed their options. They have 90 days to reactivate.`,
      });
    } else {
      toast({
        title: "User deactivated, email failed",
        description: `${targetLabel} has been deactivated, but the notification email could not be sent (${result.email_error || "unknown error"}). Please contact them directly.`,
        variant: "default",
      });
    }
    await qc.invalidateQueries({ queryKey: ["admin-org-users", orgId] });
  };

  const handleConfirmBulkDeactivate = async () => {
    if (selectedUserIds.size === 0) return;
    setBulkDeactivateDialog((s) => ({ ...s, sending: true }));

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setBulkDeactivateDialog((s) => ({ ...s, sending: false }));
      toast({ title: "Not signed in", description: "Please log in again.", variant: "destructive" });
      return;
    }

    let response: Response;
    let result: any = {};
    try {
      response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-deactivate-and-notify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ user_ids: Array.from(selectedUserIds) }),
        }
      );
      try { result = await response.json(); } catch { /* ignore */ }
    } catch (err: any) {
      setBulkDeactivateDialog((s) => ({ ...s, sending: false }));
      toast({ title: "Network error", description: err?.message || "Network error", variant: "destructive" });
      return;
    }

    if (!response.ok || result?.success === false) {
      setBulkDeactivateDialog((s) => ({ ...s, sending: false }));
      toast({ title: "Error", description: result?.error || "Something went wrong", variant: "destructive" });
      return;
    }

    setBulkDeactivateDialog({
      open: true,
      sending: false,
      results: {
        succeeded: result.deactivation.succeeded,
        failed: result.deactivation.failed || [],
        emails_sent: result.email_results.sent,
        emails_failed: result.email_results.failed,
        email_failures: result.email_results.failures || [],
      },
    });
    setSelectedUserIds(new Set());
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

  const handleAssignExecutivePerspective = async () => {
    if (!orgId || epnSelectedIds.size === 0) return;
    setEpnSubmitting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setEpnSubmitting(false);
      toast({ title: "Not signed in", description: "Please log in again.", variant: "destructive" });
      return;
    }

    let response: Response;
    let result: any = {};
    try {
      response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign_epn_send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            assignee_user_ids: Array.from(epnSelectedIds),
            organization_id: orgId,
            notes: epnNotes.trim() || null,
          }),
        }
      );
      try {
        result = await response.json();
      } catch {
        // ignore
      }
    } catch (err: any) {
      setEpnSubmitting(false);
      toast({ title: "Network error", description: err.message, variant: "destructive" });
      return;
    }

    setEpnSubmitting(false);

    if (!response.ok) {
      toast({
        title: "Assignment failed",
        description: result?.error || `HTTP ${response.status}`,
        variant: "destructive",
      });
      return;
    }

    const inserted = (result?.inserted_count ?? 0) as number;
    const skipped = (result?.skipped_count ?? 0) as number;
    const invalid = (result?.invalid_user_ids ?? []) as string[];
    const invalidCount = invalid.length;
    const emailsSent = (result?.emails_sent ?? 0) as number;
    const emailsFailed = (result?.emails_failed ?? 0) as number;

    if (inserted > 0) {
      let description = `${inserted} new assignment${inserted === 1 ? "" : "s"}`;
      if (skipped > 0) description += `, ${skipped} already assigned`;
      if (invalidCount > 0) description += `, ${invalidCount} skipped (invalid)`;
      description += `. ${emailsSent} email${emailsSent === 1 ? "" : "s"} sent`;
      if (emailsFailed > 0) description += `, ${emailsFailed} failed`;
      description += ".";
      toast({ title: "Executive Perspective NAI assigned", description });
      setEpnSelectedIds(new Set());
      setEpnNotes("");
      await qc.invalidateQueries({ queryKey: ["epn-assignments", orgId] });
    } else if (skipped > 0) {
      toast({
        title: "No new assignments",
        description: `${skipped} user${skipped === 1 ? "" : "s"} already had active assignments.`,
      });
    } else if (invalidCount > 0) {
      toast({
        title: "Assignment failed",
        description: "All selected users were rejected as invalid.",
        variant: "destructive",
      });
    } else {
      toast({ title: "No new assignments" });
    }
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage members of your organization.</p>
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

      <Tabs defaultValue="invite" className="w-full">
        <TabsList>
          <TabsTrigger value="invite">Invite</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="epn">
            <Briefcase className="h-4 w-4 mr-1.5" />
            Executive Perspective NAI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite" className="space-y-6 max-w-5xl">
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
        </TabsContent>

        <TabsContent value="users" className="space-y-6 max-w-7xl">
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
                <div className="flex items-center gap-2">
                  {selectedUserIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBulkDeactivateDialog({ open: true, sending: false, results: null })}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate selected ({selectedUserIds.size})
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleReconcileSupervisors} disabled={reconciling}>
                    {reconciling ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Reconcile supervisors
                  </Button>
                </div>
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
                (() => {
                  const eligibleVisible = filteredUsers.filter(isBulkEligible);
                  const eligibleVisibleIds = eligibleVisible.map((u) => u.id);
                  const selectedVisibleCount = eligibleVisibleIds.filter((id) => selectedUserIds.has(id)).length;
                  const allSelected = eligibleVisible.length > 0 && selectedVisibleCount === eligibleVisible.length;
                  const someSelected = selectedVisibleCount > 0 && !allSelected;
                  const toggleAll = (checked: boolean) => {
                    setSelectedUserIds((prev) => {
                      const next = new Set(prev);
                      if (checked) {
                        eligibleVisibleIds.forEach((id) => next.add(id));
                      } else {
                        eligibleVisibleIds.forEach((id) => next.delete(id));
                      }
                      return next;
                    });
                  };
                  const toggleOne = (id: string, checked: boolean) => {
                    setSelectedUserIds((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(id);
                      else next.delete(id);
                      return next;
                    });
                  };
                  return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={(c) => toggleAll(c === true)}
                          disabled={eligibleVisible.length === 0}
                          aria-label="Select all eligible users"
                        />
                      </TableHead>
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
                      const eligible = isBulkEligible(u);
                      return (
                        <TableRow key={u.id} className={isDeactivated ? "opacity-60" : undefined}>
                          <TableCell className="w-10">
                            {eligible ? (
                              <Checkbox
                                checked={selectedUserIds.has(u.id)}
                                onCheckedChange={(c) => toggleOne(u.id, c === true)}
                                aria-label={`Select ${u.email}`}
                              />
                            ) : null}
                          </TableCell>
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
                  );
                })()
              )}
            </CardContent>
          </Card>
        );
      })()}
        </TabsContent>

        <TabsContent value="epn" className="space-y-6 max-w-5xl">
          {(() => {
            const allOrgUsers = orgUsersQuery.data || [];
            const eligible = allOrgUsers
              .filter((u) => !u.deactivated_at && u.id !== user?.id)
              .filter((u) => {
                if (epnFilter === "all") return true;
                if (epnFilter === "leaders") {
                  return u.org_level === "Director" || u.org_level === "VP" || u.org_level === "C-Suite";
                }
                return u.org_level === epnFilter;
              })
              .slice()
              .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));

            const toggle = (id: string) => {
              setEpnSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            };
            const selectAllVisible = () => {
              setEpnSelectedIds((prev) => {
                const next = new Set(prev);
                eligible.forEach((u) => next.add(u.id));
                return next;
              });
            };
            const clearSelection = () => setEpnSelectedIds(new Set());

            const userMap = new Map(allOrgUsers.map((u) => [u.id, u]));
            const assignments = epnAssignmentsQuery.data || [];
            const sq = epnSearch.trim().toLowerCase();
            const enriched = assignments.map((a) => {
              const assignee = userMap.get(a.assignee_user_id);
              const assigner = a.assigned_by ? userMap.get(a.assigned_by) : null;
              return {
                ...a,
                assignee_email: assignee?.email ?? "",
                assignee_name: assignee?.full_name ?? null,
                assignee_level: assignee?.org_level ?? null,
                assigner_label: assigner?.full_name || assigner?.email || null,
              };
            });
            const filteredAssignments = !sq
              ? enriched
              : enriched.filter(
                  (a) =>
                    a.assignee_email.toLowerCase().includes(sq) ||
                    (a.assignee_name?.toLowerCase().includes(sq) ?? false)
                );

            const renderStatusBadge = (status: string) => {
              switch (status) {
                case "pending":
                  return <Badge variant="outline">pending</Badge>;
                case "in_progress":
                  return <Badge variant="secondary">in progress</Badge>;
                case "completed":
                  return <Badge className="bg-accent text-accent-foreground">completed</Badge>;
                case "declined":
                  return <Badge variant="destructive">declined</Badge>;
                case "expired":
                  return <Badge variant="secondary" className="opacity-60">expired</Badge>;
                default:
                  return <Badge variant="outline">{status}</Badge>;
              }
            };

            return (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Assign Executive Perspective NAI</CardTitle>
                    <CardDescription>
                      Assign the Executive Perspective NAI to leaders. Recipients will see this assessment in their assessments list and rate how their employees experience AI adoption. The standard NAI is unaffected.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        The Executive Perspective NAI is a leader-perspective rewording of the standard NAI. Leaders rate how their employees experience AI adoption. Their responses contribute to a leader-vs-employee delta view in the NAI dashboard, but do NOT count toward the standard NAI organizational aggregate. Leaders should still take the standard NAI separately.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2 max-w-md">
                      <Label htmlFor="epn-filter">Filter by org level</Label>
                      <Select value={epnFilter} onValueChange={setEpnFilter}>
                        <SelectTrigger id="epn-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All levels</SelectItem>
                          <SelectItem value="leaders">Leaders only (Director / VP / C-Suite)</SelectItem>
                          <SelectItem value="Director">Director</SelectItem>
                          <SelectItem value="VP">VP</SelectItem>
                          <SelectItem value="C-Suite">C-Suite</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="IC">IC</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={selectAllVisible} disabled={eligible.length === 0}>
                          Select all visible
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearSelection} disabled={epnSelectedIds.size === 0}>
                          Clear selection
                        </Button>
                      </div>
                      <span className="text-sm text-muted-foreground">{epnSelectedIds.size} selected</span>
                    </div>

                    <div className="max-h-96 overflow-y-auto border rounded-md">
                      {eligible.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No matching users to assign.</p>
                      ) : (
                        <ul className="divide-y">
                          {eligible.map((u) => {
                            const checked = epnSelectedIds.has(u.id);
                            return (
                              <li key={u.id} className="flex items-center gap-3 px-3 py-2">
                                <Checkbox
                                  id={`epn-user-${u.id}`}
                                  checked={checked}
                                  onCheckedChange={() => toggle(u.id)}
                                />
                                <Label htmlFor={`epn-user-${u.id}`} className="flex-1 cursor-pointer font-normal">
                                  {(u.full_name || u.email)} — {u.org_level || "Other"}
                                </Label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="epn-notes">Notes (optional)</Label>
                      <Textarea
                        id="epn-notes"
                        placeholder="e.g. Q3 leadership cycle"
                        value={epnNotes}
                        onChange={(e) => setEpnNotes(e.target.value.slice(0, 500))}
                        maxLength={500}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleAssignExecutivePerspective}
                        disabled={epnSelectedIds.size === 0 || epnSubmitting}
                      >
                        {epnSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Assign to {epnSelectedIds.size} user{epnSelectedIds.size === 1 ? "" : "s"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Current assignments</CardTitle>
                    <CardDescription>
                      Pending, in-progress, and completed Executive Perspective assignments for this organization.
                    </CardDescription>
                    <div className="relative max-w-sm pt-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 mt-1 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        value={epnSearch}
                        onChange={(e) => setEpnSearch(e.target.value)}
                        placeholder="Search by email or name…"
                        className="pl-8"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {epnAssignmentsQuery.isLoading ? (
                      <div className="py-8 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredAssignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No assignments yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role/Level</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Assigned</TableHead>
                            <TableHead>Started</TableHead>
                            <TableHead>Completed</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAssignments.map((a) => {
                            const truncated = a.notes && a.notes.length > 60 ? a.notes.slice(0, 60) + "…" : a.notes;
                            return (
                              <TableRow key={a.id}>
                                <TableCell className="font-medium">
                                  {a.assignee_name || a.assignee_email || a.assignee_user_id}
                                  {a.assignee_name && (
                                    <div className="text-xs text-muted-foreground">{a.assignee_email}</div>
                                  )}
                                </TableCell>
                                <TableCell>{a.assignee_level || "—"}</TableCell>
                                <TableCell>{renderStatusBadge(a.status)}</TableCell>
                                <TableCell>{formatDate(a.assigned_at)}</TableCell>
                                <TableCell>{formatDate(a.started_at)}</TableCell>
                                <TableCell>{formatDate(a.completed_at)}</TableCell>
                                <TableCell title={a.notes ?? undefined} className="text-sm text-muted-foreground">
                                  {truncated || "—"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

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
              This will deactivate {deactivateDialog.userName || deactivateDialog.userEmail}. They will lose access immediately. They will be emailed with their options: convert to a personal account, download their data, or de-identify themselves now. They have 90 days to be reactivated. After that, their account is automatically de-identified.
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
        open={bulkDeactivateDialog.open}
        onOpenChange={(open) => {
          if (bulkDeactivateDialog.sending) return;
          if (!open) {
            setBulkDeactivateDialog({ open: false, sending: false, results: null });
          }
        }}
      >
        <DialogContent>
          {bulkDeactivateDialog.results === null ? (
            <>
              <DialogHeader>
                <DialogTitle>Deactivate {selectedUserIds.size} users</DialogTitle>
                <DialogDescription>
                  This will deactivate {selectedUserIds.size} users. Each will lose access immediately and will be emailed with their options. Each has 90 days to be reactivated. Continue?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setBulkDeactivateDialog({ open: false, sending: false, results: null })}
                  disabled={bulkDeactivateDialog.sending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmBulkDeactivate}
                  disabled={bulkDeactivateDialog.sending || selectedUserIds.size === 0}
                >
                  {bulkDeactivateDialog.sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Deactivate {selectedUserIds.size}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {(() => {
                const r = bulkDeactivateDialog.results;
                const totalAttempted = r.succeeded + r.failed.length;
                const allSucceeded = r.failed.length === 0 && r.emails_failed === 0;
                const lookupLabel = (uid: string) => {
                  const u = (orgUsersQuery.data || []).find((x) => x.id === uid);
                  return u?.email || `User ${uid.slice(0, 8)}`;
                };
                return (
                  <>
                    <DialogHeader>
                      <DialogTitle>Bulk deactivation results</DialogTitle>
                      <DialogDescription>
                        {r.succeeded} of {totalAttempted} users deactivated. {r.emails_sent} notification emails sent.
                      </DialogDescription>
                    </DialogHeader>

                    {allSucceeded && (
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-[var(--bw-forest)] shrink-0 mt-0.5" />
                        <span>All {r.succeeded} users deactivated and notified successfully.</span>
                      </div>
                    )}

                    {r.failed.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Some deactivations failed</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {r.failed.map((f) => (
                              <li key={f.user_id}>{lookupLabel(f.user_id)}: {f.error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {r.emails_failed > 0 && r.succeeded > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Some emails failed to send</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {r.email_failures.map((f) => (
                              <li key={f.user_id}>{lookupLabel(f.user_id)}: {f.error}</li>
                            ))}
                          </ul>
                          <p className="mt-2 text-sm">
                            These users were deactivated but did not receive notification emails. You may want to contact them directly.
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                    <DialogFooter>
                      <Button onClick={() => setBulkDeactivateDialog({ open: false, sending: false, results: null })}>
                        Close
                      </Button>
                    </DialogFooter>
                  </>
                );
              })()}
            </>
          )}
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
