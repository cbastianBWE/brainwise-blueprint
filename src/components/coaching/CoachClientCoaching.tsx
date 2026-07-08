import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CoachingSessionRow {
  id: string;
  activity_id: string;
  completed_at: string | null;
  coaching_activities: { title: string | null; tier: string | null } | null;
}

interface Props {
  clientUserId: string;
  clientName?: string;
}

export default function CoachClientCoaching({ clientUserId }: Props) {
  const [rows, setRows] = useState<CoachingSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!clientUserId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("coaching_activity_sessions")
        .select("id, activity_id, completed_at, coaching_activities(title, tier)")
        .eq("user_id", clientUserId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      if (err) throw new Error(err.message);
      setRows((data as unknown as CoachingSessionRow[]) ?? []);
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
          No coaching sessions shared with you yet.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const title = r.coaching_activities?.title || "Coaching session";
            const tier = r.coaching_activities?.tier;
            const date = r.completed_at
              ? new Date(r.completed_at).toLocaleDateString()
              : null;
            return (
              <Link key={r.id} to={`/coaching/session/${r.id}`} className="block">
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Sparkles
                      className="h-5 w-5 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{title}</p>
                        {tier && <Badge variant="outline">{tier}</Badge>}
                      </div>
                      {date && (
                        <p className="text-sm text-muted-foreground">{date}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
