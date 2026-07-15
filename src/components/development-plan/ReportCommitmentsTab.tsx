import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Trash2 } from "lucide-react";

interface ReportRow {
  report_id: string;
  kind: "team" | "paired";
  relationship_mode: string | null;
  subjects: string;
  computed_at: string | null;
}
interface Shared {
  id: string;
  action_text: string;
  created_by_name: string | null;
  is_mine: boolean;
}
interface Mine {
  id: string;
  source_report_id: string;
  action_text: string;
  status: string;
}

type RpcFn = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;

export default function ReportCommitmentsTab({ kind }: { kind: "team" | "paired" }) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [shared, setShared] = useState<Record<string, Shared[]>>({});
  const [mine, setMine] = useState<Record<string, Mine[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const rpc = supabase.rpc as unknown as RpcFn;
      const { data: repData } = await rpc("bw_list_my_reports");
      const reps = ((repData as ReportRow[]) ?? []).filter((r) => r.kind === kind);
      setReports(reps);

      const { data: mineData } = await rpc("dp_list_my_report_commitments", { p_kind: kind });
      const mineByReport: Record<string, Mine[]> = {};
      ((mineData as Mine[]) ?? []).forEach((m) => {
        (mineByReport[m.source_report_id] ??= []).push(m);
      });
      setMine(mineByReport);

      const sharedByReport: Record<string, Shared[]> = {};
      await Promise.all(
        reps.map(async (r) => {
          const { data } = await rpc("report_list_commitments", { p_report_id: r.report_id, p_kind: kind });
          sharedByReport[r.report_id] = (data as Shared[]) ?? [];
        }),
      );
      setShared(sharedByReport);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => { load(); }, [load]);

  const archive = async (id: string) => {
    const rpc = supabase.rpc as unknown as RpcFn;
    const { error } = await rpc("report_archive_commitment", { p_commitment_id: id });
    if (error) { toast.error("Couldn't remove that commitment."); return; }
    toast.success("Commitment removed.");
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-muted-foreground py-8">
        Couldn't load your {kind} commitments. Please try again.
      </p>
    );
  }
  if (reports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8">
        You're not part of any {kind} reports yet, or none have been released to you.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((r) => {
        const sh = shared[r.report_id] ?? [];
        const mn = mine[r.report_id] ?? [];
        const href = r.kind === "team" ? `/team-report/${r.report_id}` : `/paired-report/${r.report_id}`;
        return (
          <Card key={`${r.kind}-${r.report_id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {r.kind === "team"
                      ? "Team report"
                      : `Paired report${r.relationship_mode ? ` (${r.relationship_mode})` : ""}`}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">{r.subjects}</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={href}>Open report</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Shared {kind === "team" ? "team" : "paired"} commitments
                </h4>
                {sh.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {sh.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-start gap-2 rounded-md border border-border p-2.5 text-sm"
                      >
                        <div className="flex-1">
                          <span>{c.action_text}</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            — {c.is_mine ? "you" : (c.created_by_name || "a teammate")}
                          </span>
                        </div>
                        {c.is_mine && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => archive(c.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  My commitments from this report
                </h4>
                {mn.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None yet — open the report to add some.</p>
                ) : (
                  <ul className="space-y-2">
                    {mn.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-start gap-2 rounded-md border border-border p-2.5 text-sm"
                      >
                        <Badge variant="outline" className="capitalize">
                          {m.status.replace("_", " ")}
                        </Badge>
                        <span className="flex-1">{m.action_text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
