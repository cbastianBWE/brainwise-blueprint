import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminSession } from "@/hooks/useSuperAdminSession";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Building2, UserCog, UserPlus, Loader2 } from "lucide-react";

interface OrgUser {
  id: string;
  full_name: string | null;
  email: string;
  account_type: string | null;
  subscription_status: string;
  has_completed: boolean;
}

export default function CompanyDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();
  const { sessionId } = useSuperAdminSession();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const auditLoggedRef = useRef(false);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignEmail, setAssignEmail] = useState("");
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !user) return;

    // Fetch org name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();
    setOrgName(org?.name || "Unknown Organization");

    // Fetch users in org
    const { data: orgUsers } = await supabase
      .from("users")
      .select("id, full_name, email, account_type, subscription_status")
      .eq("organization_id", orgId);

    if (!orgUsers) { setLoading(false); return; }

    // Check completed assessments for each user
    const userIds = orgUsers.map(u => u.id);
    const { data: completedAssessments } = await supabase
      .from("assessments")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "completed");

    const completedSet = new Set(completedAssessments?.map(a => a.user_id) || []);

    const enriched: OrgUser[] = orgUsers.map(u => ({
      ...u,
      has_completed: completedSet.has(u.id),
    }));

    setUsers(enriched);
    setLoading(false);

    // Audit logging — fire once
    if (!auditLoggedRef.current) {
      auditLoggedRef.current = true;

      const entries = [
        {
          action_type: "company_account_viewed",
          company_id: orgId,
          session_id: sessionId,
          detail: { url: window.location.pathname, timestamp: new Date().toISOString() },
        },
        ...enriched.map(u => ({
          action_type: "individual_record_viewed",
          company_id: orgId,
          affected_user_id: u.id,
          session_id: sessionId,
          detail: { url: window.location.pathname, timestamp: new Date().toISOString() },
        })),
      ];

      await supabase.functions.invoke("log-audit", { body: { entries } });
    }
  }, [orgId, user, sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentOrgAdmin = useMemo(
    () => users.find((u) => u.account_type === "org_admin") || null,
    [users]
  );

  const handleAssignOrgAdmin = async () => {
    if (!assignEmail.trim() || !orgId) return;
    setAssigning(true);

    const { error } = await supabase.rpc("admin_assign_org_admin", {
      p_target_email: assignEmail.trim(),
      p_organization_id: orgId,
      p_is_transfer: !!currentOrgAdmin,
    });

    setAssigning(false);

    if (error) {
      toast({
        title: currentOrgAdmin ? "Transfer failed" : "Assignment failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: currentOrgAdmin ? "Org admin transferred" : "Org admin assigned",
      description: `${assignEmail.trim()} is now the org admin.`,
    });

    setAssignDialogOpen(false);
    setAssignEmail("");
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" className="gap-2" onClick={() => navigate("/super-admin/companies")}>
        <ArrowLeft className="h-4 w-4" /> Back to Company Accounts
      </Button>

      {/* Scoped banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Building2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">
            You are viewing <strong>{orgName}</strong>. Data on this page is scoped to this organization only.
          </p>
        </CardContent>
      </Card>

      {/* Org Admin */}
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
                <p className="font-medium text-foreground">
                  {currentOrgAdmin.full_name || currentOrgAdmin.email}
                </p>
                <p className="text-sm text-muted-foreground">{currentOrgAdmin.email}</p>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => { setAssignEmail(""); setAssignDialogOpen(true); }}
              >
                <UserCog className="h-4 w-4" />
                Transfer to Another User
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">No org admin assigned.</p>
              <Button
                className="gap-2"
                onClick={() => { setAssignEmail(""); setAssignDialogOpen(true); }}
              >
                <UserPlus className="h-4 w-4" />
                Assign Org Admin
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{orgName} — Users</CardTitle>
          <CardDescription>{users.length} member{users.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Assessment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name || <span className="text-muted-foreground italic">No name</span>}
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{u.account_type || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.subscription_status === "active" ? "default" : "outline"}>
                        {u.subscription_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.has_completed ? (
                        <Badge className="bg-accent text-accent-foreground">Completed</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={assignDialogOpen}
        onOpenChange={(open) => !assigning && setAssignDialogOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentOrgAdmin ? "Transfer Org Admin" : "Assign Org Admin"}
            </DialogTitle>
            <DialogDescription>
              {currentOrgAdmin
                ? `${currentOrgAdmin.full_name || currentOrgAdmin.email} will be demoted to Company Admin. The new Org Admin must already be a member of this organization.`
                : "The user must already be a member of this organization (account type corporate_employee or company_admin)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="assign-email">User Email</Label>
            <Input
              id="assign-email"
              type="email"
              placeholder="user@company.com"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              disabled={assigning}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button onClick={handleAssignOrgAdmin} disabled={assigning || !assignEmail.trim()}>
              {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {currentOrgAdmin ? "Transfer" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
