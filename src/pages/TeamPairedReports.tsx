import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Users } from "lucide-react";
import GenerateReportDialog from "@/components/reports/GenerateReportDialog";
import ManageReportAccessDialog from "@/components/reports/ManageReportAccessDialog";

interface ReportRow {
  report_id: string;
  kind: "team" | "paired";
  relationship_mode: string | null;
  member_count: number;
  narrative_status: string;
  computed_at: string | null;
  subjects: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "complete":
      return <Badge>Ready</Badge>;
    case "generating":
      return <Badge variant="secondary">Generating</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "pending":
    default:
      return <Badge variant="outline">Not generated</Badge>;
  }
}

function capitalize(s: string | null | undefined) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

export default function TeamPairedReports() {
  const { profile } = useUserProfile();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageReport, setManageReport] = useState<{ reportId: string; kind: "team" | "paired"; title: string } | null>(null);
  const isSuperAdmin = profile?.account_type === "brainwise_super_admin";

  const allowedModes = useMemo<("work" | "personal" | "romantic")[]>(() => {
    const t = profile?.account_type;
    if (t === "coach" || t === "brainwise_super_admin") return ["work", "personal", "romantic"];
    return ["work"];
  }, [profile?.account_type]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("bw_list_my_reports");
    if (!error) {
      setRows(((data as ReportRow[]) ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team & Paired Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate and open team and paired PTP reports.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-sm text-muted-foreground text-center">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm text-muted-foreground">No reports yet.</p>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                Generate your first report
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const typeLabel =
                    r.kind === "team"
                      ? "Team"
                      : `Paired${r.relationship_mode ? ` (${capitalize(r.relationship_mode)})` : ""}`;
                  const href =
                    r.kind === "team"
                      ? `/team-report/${r.report_id}`
                      : `/paired-report/${r.report_id}`;
                  return (
                    <TableRow key={`${r.kind}-${r.report_id}`}>
                      <TableCell>{typeLabel}</TableCell>
                      <TableCell className="max-w-md">
                        <span className="line-clamp-2">{r.subjects}</span>
                      </TableCell>
                      <TableCell>{statusBadge(r.narrative_status)}</TableCell>
                      <TableCell>{formatDate(r.computed_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setManageReport({
                                  reportId: r.report_id,
                                  kind: r.kind,
                                  title: r.subjects,
                                })
                              }
                            >
                              <Users className="h-4 w-4 mr-1" />
                              Manage access
                            </Button>
                          )}
                          <Button asChild variant="outline" size="sm">
                            <Link to={href}>Open</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <GenerateReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        allowedModes={allowedModes}
        onGenerated={load}
      />
    </div>
  );
}
