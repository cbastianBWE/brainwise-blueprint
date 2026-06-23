import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportRow {
  report_id: string;
  kind: "team" | "paired";
  relationship_mode: string | null;
  member_count: number;
  narrative_status: string;
  computed_at: string | null;
  subjects: string;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

export default function TeamReportsSharedWithMe() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("bw_list_my_reports");
    if (!error) {
      const all = (data as ReportRow[]) ?? [];
      setRows(all.filter((r) => r.kind === "team"));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team Reports Shared With Me</h1>
        <p className="text-sm text-muted-foreground">
          Team reports you are part of.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No team reports have been shared with you yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.report_id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Team report</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="space-y-1 text-sm">
                  <div>{r.member_count} members</div>
                  <div className="text-muted-foreground">{formatDate(r.computed_at)}</div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/team-report/${r.report_id}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
