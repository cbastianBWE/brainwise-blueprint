import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  UserCog, UserPlus, Loader2, MoreHorizontal, UserMinus, UserCheck, Users, RefreshCw, Briefcase,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";

const NONE_SUPERVISOR = "__none__";

interface MemberRow {
  id: string;
  email: string;
  full_name: string | null;
  account_type: string | null;
  organization_id: string | null;
  department_id: string | null;
  org_level: string | null;
  deactivated_at: string | null;
  reactivation_deadline: string | null;
  deactivation_reason: string | null;
  supervisor_user_id: string | null;
  department_joined_name: string | null;
  supervisor_joined_full_name: string | null;
  supervisor_joined_email: string | null;
}

function displayName(m: { full_name: string | null; email: string }) {
  return m.full_name || m.email;
}

export default function CompanyMembersSection({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [supervisorDashEnabled, setSupervisorDashEnabled] = useState(false);

  // Org admin dialog
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPending, setAdminPending] = useState(false);
  const [manualInviteCode, setManualInviteCode] = useState<string | null>(null);

  // Supervisor dialog
  const [supDialogRow, setSupDialogRow] = useState<MemberRow | null>(null);
  const [supSelected, setSupSelected] = useState<string>(NONE_SUPERVISOR);
  const [supPending, setSupPending] = useState(false);

  // Deactivate dialog
  const [deactRow, setDeactRow] = useState<MemberRow | null>(null);
  const [deactReason, setDeactReason] = useState("");
  const [deactPending, setDeactPending] = useState(false);

  // Reactivate dialog
  const [reactRow, setReactRow] = useState<MemberRow | null>(null);
  const [reactPending, setReactPending] = useState(false);

  // Reconcile
  const [reconcilePending, setReconcilePending] = useState(false);
  // Supervisor dashboard toggle
  const [dashPending, setDashPending] = useState(false);

  const load = useCallback(async () => {
    const [membersRes, contractRes] = await Promise.all([
      (supabase as any).from("admin_org_users_view").select("*").eq("organization_id", orgId),
      (supabase as any).from("corporate_contracts").select("supervisor_dashboard_enabled").eq("organization_id", orgId).maybeSingle(),
    ]);

    if (membersRes.error) {
      toast({ title: "Failed to load members", description: membersRes.error.message, variant: "destructive" });
    } else {
      const rows = (membersRes.data || []) as MemberRow[];
      rows.sort((a, b) => displayName(a).localeCompare(displayName(b)));
      setMembers(rows);
    }
    if (!contractRes.error) {
      setSupervisorDashEnabled(!!contractRes.data?.supervisor_dashboard_enabled);
    }
    setLoading(false);
  }, [orgId, toast]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const currentOrgAdmin = useMemo(
    () => members.find((m) => m.account_type === "org_admin") || null,
    [members],
  );

  const activeMembers = useMemo(() => members.filter((m) => m.deactivated_at === null), [members]);

  // ---- Org Admin ----
  const openAdminDialog = () => {
    setAdminEmail("");
    setManualInviteCode(null);
    setAdminDialogOpen(true);
  };

  const handleAssignOrInvite = async () => {
    const email = adminEmail.trim();
    if (!email) return;
    setAdminPending(true);
    setManualInviteCode(null);

    const { data, error } = await (supabase.rpc as any)("admin_assign_or_invite_org_admin", {
      p_organization_id: orgId,
      p_email: email,
    });

    if (error) {
      setAdminPending(false);
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }

    const mode = (data as any)?.mode;

    try {
      if (mode === "promoted") {
        toast({
          title: currentOrgAdmin ? "Org admin transferred" : "Org admin assigned",
          description: `${email} is now the org admin.`,
        });
        setAdminDialogOpen(false);
        await load();
      } else if (mode === "already_org_admin") {
        toast({ title: "Already the org admin", description: email });
        setAdminDialogOpen(false);
      } else if (mode === "invite_needed") {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const resp = await fetch(
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
              invitee_email: email,
              account_type: "org_admin",
            }),
          },
        );
        const result = await resp.json().catch(() => ({}));
        if (resp.ok && result.email_sent) {
          toast({ title: "Invitation sent", description: result.code ? `Code: ${result.code}` : email });
          setAdminDialogOpen(false);
        } else if (resp.ok && !result.email_sent) {
          setManualInviteCode(result.code || null);
          toast({
            title: "Invitation created (email not sent)",
            description: "Share the manual invite code with the user.",
          });
        } else {
          toast({
            title: "Invitation failed",
            description: result.error || `HTTP ${resp.status}`,
            variant: "destructive",
          });
        }
        await load();
      } else {
        toast({ title: "Unexpected response", description: JSON.stringify(data) });
      }
    } finally {
      setAdminPending(false);
    }
  };

  // ---- Supervisor reconcile ----
  const handleReconcile = async () => {
    setReconcilePending(true);
    const { data, error } = await (supabase.rpc as any)("reconcile_supervisors_for_org", {
      p_organization_id: orgId,
    });
    setReconcilePending(false);
    if (error) {
      toast({ title: "Reconcile failed", description: error.message, variant: "destructive" });
      return;
    }
    const patched = (data as any)?.out_users_patched ?? (Array.isArray(data) ? (data[0] as any)?.out_users_patched : 0) ?? 0;
    toast({ title: "Reconcile complete", description: `${patched} user${patched === 1 ? "" : "s"} patched.` });
    await load();
  };

  // ---- Supervisor assignment ----
  const openSupervisorDialog = (row: MemberRow) => {
    setSupDialogRow(row);
    setSupSelected(row.supervisor_user_id || NONE_SUPERVISOR);
  };

  const handleSaveSupervisor = async () => {
    if (!supDialogRow) return;
    setSupPending(true);
    const supId = supSelected === NONE_SUPERVISOR ? null : supSelected;
    const { error } = await (supabase.rpc as any)("user_assign_supervisor", {
      p_target_user_id: supDialogRow.id,
      p_supervisor_user_id: supId,
    });
    setSupPending(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Supervisor updated" });
    setSupDialogRow(null);
    await load();
  };

  // ---- Deactivate ----
  const openDeactivateDialog = (row: MemberRow) => {
    setDeactRow(row);
    setDeactReason("");
  };
  const handleDeactivate = async () => {
    if (!deactRow) return;
    setDeactPending(true);
    const { error } = await (supabase.rpc as any)("user_deactivate", {
      p_target_user_id: deactRow.id,
      p_reason: deactReason.trim() || null,
    });
    setDeactPending(false);
    if (error) {
      toast({ title: "Deactivation failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "User deactivated", description: displayName(deactRow) });
    setDeactRow(null);
    await load();
  };

  // ---- Reactivate ----
  const handleReactivate = async () => {
    if (!reactRow) return;
    setReactPending(true);
    const { error } = await (supabase.rpc as any)("user_reactivate", {
      p_target_user_id: reactRow.id,
    });
    setReactPending(false);
    if (error) {
      toast({ title: "Reactivation failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "User reactivated", description: displayName(reactRow) });
    setReactRow(null);
    await load();
  };

  // ---- Supervisor dashboard switch ----
  const handleToggleDash = async (next: boolean) => {
    const prev = supervisorDashEnabled;
    setSupervisorDashEnabled(next);
    setDashPending(true);
    const { error } = await (supabase.rpc as any)("supervisor_dashboard_set", {
      p_org: orgId,
      p_enabled: next,
    });
    setDashPending(false);
    if (error) {
      setSupervisorDashEnabled(prev);
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: next ? "Supervisor dashboard enabled" : "Supervisor dashboard disabled" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card A — Org Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-5 w-5 text-primary" />
            Org Admin
          </CardTitle>
          <CardDescription>
            The contract-owning administrator for this organization. Exactly one per org.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentOrgAdmin ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">{displayName(currentOrgAdmin)}</p>
                <p className="text-sm text-muted-foreground">{currentOrgAdmin.email}</p>
              </div>
              <Button variant="outline" className="gap-2" onClick={openAdminDialog}>
                <UserCog className="h-4 w-4" />
                Transfer to Another User
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">No org admin assigned.</p>
              <Button className="gap-2" onClick={openAdminDialog}>
                <UserPlus className="h-4 w-4" />
                Assign Org Admin
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card B — Members roster */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              {members.length} member{members.length === 1 ? "" : "s"}
            </CardTitle>
            <CardDescription>Manage roles, supervisors, and active status.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleReconcile}
            disabled={reconcilePending}
          >
            {reconcilePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reconcile supervisors
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Org Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const isActive = m.deactivated_at === null;
                  const supDisplay = m.supervisor_joined_full_name || m.supervisor_joined_email || "—";
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.full_name || <span className="text-muted-foreground italic">No name</span>}
                      </TableCell>
                      <TableCell className="text-sm">{m.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {(m.account_type || "—").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{m.department_joined_name || "—"}</TableCell>
                      <TableCell className="text-sm">{supDisplay}</TableCell>
                      <TableCell className="text-sm">{m.org_level || "—"}</TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge className="bg-accent text-accent-foreground">Active</Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="destructive">Deactivated</Badge>
                            {m.reactivation_deadline && (
                              <p className="text-xs text-muted-foreground">
                                reactivate by {new Date(m.reactivation_deadline).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openSupervisorDialog(m)}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Assign / change supervisor
                            </DropdownMenuItem>
                            {isActive ? (
                              <DropdownMenuItem
                                onSelect={() => openDeactivateDialog(m)}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => setReactRow(m)}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Card C — Supervisor Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Supervisor Dashboard</CardTitle>
          <CardDescription>
            Controls whether supervisors in this organization can see their team dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="sup-dash-switch" className="text-sm">
              {supervisorDashEnabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="sup-dash-switch"
              checked={supervisorDashEnabled}
              onCheckedChange={handleToggleDash}
              disabled={dashPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---- Org admin dialog ---- */}
      <Dialog
        open={adminDialogOpen}
        onOpenChange={(open) => !adminPending && setAdminDialogOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentOrgAdmin ? "Transfer Org Admin" : "Assign Org Admin"}</DialogTitle>
            <DialogDescription>
              If this email is already a member of this organization, they will be promoted to org admin
              (and the current org admin demoted to company admin). If they do not have an account yet,
              we will email them an invitation to join as the org admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-email">User Email</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="user@company.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              disabled={adminPending}
            />
          </div>
          {manualInviteCode && (
            <Alert>
              <AlertDescription>
                Email was not sent. Share this invite code manually: <code className="font-mono">{manualInviteCode}</code>
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminDialogOpen(false)} disabled={adminPending}>
              Cancel
            </Button>
            <Button onClick={handleAssignOrInvite} disabled={adminPending || !adminEmail.trim()}>
              {adminPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {currentOrgAdmin ? "Transfer / Invite" : "Assign / Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Supervisor dialog ---- */}
      <Dialog
        open={!!supDialogRow}
        onOpenChange={(open) => !supPending && !open && setSupDialogRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign / change supervisor</DialogTitle>
            <DialogDescription>
              {supDialogRow ? `For ${displayName(supDialogRow)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Supervisor</Label>
            <Select value={supSelected} onValueChange={setSupSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Select supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SUPERVISOR}>None (clear supervisor)</SelectItem>
                {activeMembers
                  .filter((m) => m.id !== supDialogRow?.id)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {displayName(m)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupDialogRow(null)} disabled={supPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveSupervisor} disabled={supPending}>
              {supPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Deactivate dialog ---- */}
      <Dialog
        open={!!deactRow}
        onOpenChange={(open) => !deactPending && !open && setDeactRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate user</DialogTitle>
            <DialogDescription>
              {deactRow ? `${displayName(deactRow)} will lose access. You can reactivate them later.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="deact-reason">Reason (optional)</Label>
            <Textarea
              id="deact-reason"
              value={deactReason}
              onChange={(e) => setDeactReason(e.target.value)}
              disabled={deactPending}
              placeholder="Why is this user being deactivated?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactRow(null)} disabled={deactPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={deactPending}>
              {deactPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Reactivate confirm ---- */}
      <Dialog
        open={!!reactRow}
        onOpenChange={(open) => !reactPending && !open && setReactRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate user</DialogTitle>
            <DialogDescription>
              {reactRow ? `Restore access for ${displayName(reactRow)}?` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactRow(null)} disabled={reactPending}>
              Cancel
            </Button>
            <Button onClick={handleReactivate} disabled={reactPending}>
              {reactPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
