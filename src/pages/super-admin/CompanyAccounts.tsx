import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Eye, Plus, FileClock } from "lucide-react";

const EM_SPACE = "\u2003";

interface PendingRequestRow {
  id: string;
  organization_id: string;
  org_name: string;
  report_type: "team" | "paired";
  requested_by_name: string;
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

interface OrgRow {
  id: string;
  name: string;
  seat_count: number;
  seats_used: number;
}

export default function CompanyAccounts() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingRequestRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase.rpc as any)("super_admin_list_orgs_with_usage");
      setOrgs((data as OrgRow[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const loadPending = async () => {
      const { data } = await supabase.rpc("list_report_capacity_requests", { p_status: "pending" });
      setPending(((data ?? []) as unknown as PendingRequestRow[]));
    };
    loadPending();
  }, []);

  const pendingByOrg = pending.reduce<Record<string, number>>((acc, r) => {
    acc[r.organization_id] = (acc[r.organization_id] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all organization accounts</p>
        </div>
        <Button className="gap-1" onClick={() => navigate("/super-admin/create-organization")}>
          <Plus className="h-4 w-4" /> Create Organization
        </Button>
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileClock className="h-5 w-5" />
              Pending Report Requests
              <Badge style={{ background: "#F59E0B", color: "white" }}>{pending.length}</Badge>
            </CardTitle>
            <CardDescription>Organizations asking to expand their report allowance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 text-sm border-b last:border-b-0 pb-2 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.org_name}</span>
                  <span className="text-muted-foreground capitalize">{r.report_type}</span>
                  <span className="text-muted-foreground">· {r.requested_by_name}</span>
                  <span className="text-xs text-muted-foreground">· {timeAgo(r.created_at)}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/super-admin/company/${r.organization_id}?tab=contract`)}
                >
                  Review
                </Button>
              </div>
            ))}
            {pending.length > 5 && (
              <p className="text-xs text-muted-foreground">and {pending.length - 5} more</p>
            )}
          </CardContent>
        </Card>
      )}

      {orgs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No organizations registered yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organizations</CardTitle>
            <CardDescription>{orgs.length} organization{orgs.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization Name</TableHead>
                    <TableHead>Seats Purchased</TableHead>
                    <TableHead>Seats Used</TableHead>
                    <TableHead>Participation Rate</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map(org => {
                    const rate = org.seat_count > 0
                      ? Math.round((org.seats_used / org.seat_count) * 100)
                      : 0;
                    return (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>{org.seat_count}</TableCell>
                        <TableCell>{org.seats_used}</TableCell>
                        <TableCell>{rate}%</TableCell>
                        <TableCell>
                          {pendingByOrg[org.id] ? (
                            <Badge style={{ background: "#F59E0B", color: "white" }}>{pendingByOrg[org.id]}</Badge>
                          ) : (
                            EM_SPACE
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => navigate(`/super-admin/company/${org.id}`)}
                          >
                            <Eye className="h-3 w-3" /> View Account
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
