import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface JourneyRow {
  activity_id: string;
  code: string;
  title: string;
  module_number: number;
  sequence: number;
  est_minutes_low: number | null;
  est_minutes_high: number | null;
  allowed: boolean;
  reason: string | null;
  own_status: string | null;
  partner_status: string | null;
  reveal_pending: boolean | null;
}

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  completed: "Completed",
};

export default function RelationshipJourney() {
  const { relationshipId } = useParams<{ relationshipId: string }>();
  const [rows, setRows] = useState<JourneyRow[] | null>(null);
  const [otherName, setOtherName] = useState<string>("Your partner");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!relationshipId) return;
    let cancelled = false;
    (async () => {
      const [state, names] = await Promise.all([
        supabase.rpc("relationship_journey_state", { p_relationship: relationshipId }),
        supabase.rpc("relationship_first_names", { p_relationship: relationshipId }),
      ]);
      if (cancelled) return;
      if (state.error) {
        setError(state.error.message);
        setRows([]);
        return;
      }
      setRows(((state.data as JourneyRow[]) || []).slice().sort(
        (a, b) => a.module_number - b.module_number || a.sequence - b.sequence,
      ));
      const n = (names.data as any[])?.[0];
      if (n?.other_first_name) setOtherName(n.other_first_name);
    })();
    return () => {
      cancelled = true;
    };
  }, [relationshipId]);

  if (!rows) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const modules = Array.from(new Set(rows.map((r) => r.module_number)));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Your journey</h1>
        <p className="text-sm text-muted-foreground">
          Work through it at your own pace. Some steps open once you have both finished the one before.
        </p>
      </header>

      {modules.map((m) => (
        <Card key={m}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Module {m}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows
              .filter((r) => r.module_number === m)
              .map((r) => {
                const est =
                  r.est_minutes_low && r.est_minutes_high
                    ? `${r.est_minutes_low}–${r.est_minutes_high} min`
                    : r.est_minutes_low
                      ? `${r.est_minutes_low} min`
                      : null;
                const inner = (
                  <div className="flex flex-col gap-1.5 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {!r.allowed && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="text-sm font-medium">{r.title}</span>
                      {r.reveal_pending && (
                        <Badge variant="default" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          Something to see
                        </Badge>
                      )}
                      <Badge variant="secondary">{STATUS_LABEL[r.own_status || "not_started"] || r.own_status}</Badge>
                      {est && <span className="text-xs text-muted-foreground">{est}</span>}
                    </div>
                    {!r.allowed && r.reason && (
                      <p className="text-xs text-muted-foreground">{r.reason}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {otherName}: {STATUS_LABEL[r.partner_status || "not_started"]?.toLowerCase() || r.partner_status}
                    </p>
                  </div>
                );
                return r.allowed ? (
                  <Link
                    key={r.activity_id}
                    to={`/couples/${relationshipId}/activity/${r.code}`}
                    className="block transition-opacity hover:opacity-90"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={r.activity_id} className="opacity-60">
                    {inner}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
