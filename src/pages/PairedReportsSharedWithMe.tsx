import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  ArchiveReportDialog,
  ArchivedBadge,
  RestoreReportButton,
} from "@/components/reports/ArchiveReportDialog";
import { Archive } from "lucide-react";


interface ReportRow {
  report_id: string;
  kind: "team" | "paired";
  relationship_mode: string | null;
  member_count: number;
  narrative_status: string;
  computed_at: string | null;
  subjects: string;
  archived_at: string | null;
  archive_reason: string | null;
  can_archive: boolean;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

function capitalize(s: string | null | undefined) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PairedReportsSharedWithMe() {
  const { profile } = useUserProfile();
  const isSuperAdmin = profile?.account_type === "brainwise_super_admin";
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveTarget, setArchiveTarget] = useState<ReportRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("bw_list_my_reports");
    if (!error) {
      const all = (data as ReportRow[]) ?? [];
      // Archived reports are hidden outright here: restore is super admin only and
      // lives on the main Team & Paired Reports page, so there is nothing to act on.
      setRows(all.filter((r) => r.kind === "paired" && !r.archived_at));

    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Paired Reports Shared With Me</h1>
        <p className="text-sm text-muted-foreground">
          Paired reports you are part of.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No paired reports have been shared with you yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.report_id} className={r.archived_at ? "opacity-60" : undefined}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">Paired report</CardTitle>
                <div className="flex items-center gap-2">
                  {r.archived_at && (
                    <ArchivedBadge archivedAt={r.archived_at} reason={r.archive_reason} />
                  )}
                  {r.relationship_mode && (
                    <Badge variant="secondary">{capitalize(r.relationship_mode)}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="space-y-1 text-sm">
                  <div>{r.subjects}</div>
                  <div className="text-muted-foreground">{formatDate(r.computed_at)}</div>
                  {r.archived_at && r.archive_reason && (
                    <div className="text-xs text-muted-foreground">{r.archive_reason}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.archived_at && isSuperAdmin && (
                    <RestoreReportButton kind="paired" reportId={r.report_id} onRestored={load} />
                  )}
                  {!r.archived_at && r.can_archive && (
                    <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(r)}>
                      <Archive className="h-4 w-4 mr-1" />
                      Archive
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/paired-report/${r.report_id}`}>Open</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ArchiveReportDialog
        open={archiveTarget !== null}
        onOpenChange={(o) => { if (!o) setArchiveTarget(null); }}
        kind="paired"
        reportId={archiveTarget?.report_id ?? ""}
        subjects={archiveTarget?.subjects ?? ""}
        dateLabel={formatDate(archiveTarget?.computed_at ?? null)}
        onArchived={load}
      />
    </div>
  );
}
