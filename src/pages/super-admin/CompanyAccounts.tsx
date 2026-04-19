import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Eye } from "lucide-react";

interface OrgRow {
  id: string;
  name: string;
  subscription_status: string | null;
  seat_count: number;
  seats_used: number;
}

export default function CompanyAccounts() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase.rpc as any)("super_admin_list_orgs_with_usage");
      setOrgs((data as OrgRow[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Company Accounts</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all organization accounts</p>
      </div>

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
                    <TableHead>Status</TableHead>
                    <TableHead>Seats Purchased</TableHead>
                    <TableHead>Seats Used</TableHead>
                    <TableHead>Participation Rate</TableHead>
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
                        <TableCell>
                          <Badge variant={org.subscription_status === "active" ? "default" : "secondary"}>
                            {org.subscription_status || "inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{org.seat_count}</TableCell>
                        <TableCell>{org.seats_used}</TableCell>
                        <TableCell>{rate}%</TableCell>
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
