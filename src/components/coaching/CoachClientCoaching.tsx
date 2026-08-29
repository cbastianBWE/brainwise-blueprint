import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CoachSessionRow {
  session_id: string;
  activity_id: string;
  activity_code: string | null;
  activity_title: string | null;
  module_group: string | null;
  tier: string | null;
  run_number: number | null;
  session_status: string | null;
  responses: unknown;
  note_body: string | null;
  note_updated_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  visibility: string | null;
}

interface Props {
  clientUserId: string;
  clientName?: string;
}

export default function CoachClientCoaching({ clientUserId }: Props) {
  const [rows, setRows] = useState<CoachSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!clientUserId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc("bw_coach_client_coaching" as any, {
        p_client_user_id: clientUserId,
      });
      if (err) throw new Error(err.message);
      setRows(((data as any[]) ?? []) as CoachSessionRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load coaching sessions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [clientUserId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-3">Coaching sessions</h2>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2
            className="h-6 w-6 animate-spin text-muted-foreground"
            role="status"
            aria-label="Loading coaching sessions"
          />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          <p className="text-sm text-muted-foreground text-center">
            Couldn't load coaching sessions: {error}
          </p>
          <Button variant="outline" size="sm" onClick={fetchSessions}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-8 text-sm">
          No coaching sessions to show yet.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const title = r.activity_title || "Coaching session";
            const tier = r.tier;
            const date = r.completed_at
              ? new Date(r.completed_at).toLocaleDateString()
              : null;
            const note = (r.note_body ?? "").trim();
            return (
              <Card key={r.session_id}>
                <CardContent className="space-y-3 p-4">
                  <Link
                    to={`/coaching/session/${r.session_id}`}
                    className="flex items-center gap-3 rounded-md transition-colors hover:bg-accent/50"
                  >
                    <Sparkles
                      className="h-5 w-5 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{title}</p>
                        {tier && <Badge variant="outline">{tier}</Badge>}
                        {r.visibility === "client_shared" && (
                          <Badge variant="outline">Shared by client</Badge>
                        )}
                      </div>
                      {date && <p className="text-sm text-muted-foreground">{date}</p>}
                    </div>
                  </Link>
                  {note && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Note</p>
                      <p className="line-clamp-2 whitespace-pre-wrap text-sm text-foreground">
                        {note}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
