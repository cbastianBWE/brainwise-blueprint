import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminSession } from "@/hooks/useSuperAdminSession";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, AlertTriangle } from "lucide-react";

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
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const auditLoggedRef = useRef(false);

  useEffect(() => {
    if (!orgId || !user) return;

    const load = async () => {
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
    };

    load();
  }, [orgId, user, sessionId]);

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
    </div>
  );
}
