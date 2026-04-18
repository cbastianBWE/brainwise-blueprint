import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, AlertTriangle, X } from "lucide-react";

const ADD_DEPT_VALUE = "__add_department__";

const ORG_LEVELS = [
  { value: "IC", label: "IC" },
  { value: "Manager", label: "Manager" },
  { value: "Director", label: "Director" },
  { value: "VP", label: "VP" },
  { value: "C-Suite", label: "C-Suite" },
  { value: "Other", label: "Other" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [orgId, setOrgId] = useState<string | null | undefined>(undefined); // undefined = loading
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<string>("");
  const [supervisor, setSupervisor] = useState("");
  const [orgLevel, setOrgLevel] = useState<string>("");
  const [sending, setSending] = useState(false);

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [creatingDept, setCreatingDept] = useState(false);

  const [manualCodeAlert, setManualCodeAlert] = useState<{ email: string; code: string } | null>(null);

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
      // Invalidate pending invites regardless
      await qc.invalidateQueries({ queryKey: ["admin-pending-invitations", orgId] });

      if (result?.email_sent) {
        toast({
          title: "Invitation sent",
          description: `Sent to ${cleanedEmail}. Code: ${result.code}`,
        });
      } else {
        setManualCodeAlert({ email: cleanedEmail, code: result?.code || "(no code returned)" });
      }
      // Clear email + supervisor; keep dept + org_level
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

  // Render states
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

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
          <CardDescription>Unredeemed invitations that have not yet expired.</CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsQuery.isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (invitationsQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending invitations.</p>
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
                {invitationsQuery.data!.map((inv) => (
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
    </div>
  );
}
