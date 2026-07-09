import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { type Step, humanizeBand } from "../shared";

const PTP_DIM_ORDER = ["DIM-PTP-01", "DIM-PTP-02", "DIM-PTP-03", "DIM-PTP-04", "DIM-PTP-05"];
const PTP_DIM_NAMES: Record<string, string> = {
  "DIM-PTP-01": "Protection",
  "DIM-PTP-02": "Participation",
  "DIM-PTP-03": "Prediction",
  "DIM-PTP-04": "Purpose",
  "DIM-PTP-05": "Pleasure",
};
const PTP_DIM_COLORS: Record<string, string> = {
  "DIM-PTP-01": "#021F36",
  "DIM-PTP-02": "#006D77",
  "DIM-PTP-03": "#6D6875",
  "DIM-PTP-04": "#3C096C",
  "DIM-PTP-05": "#FFB703",
};

export function PtpDisplayWidget({ step, userId }: { step: Step; userId: string }) {
  const instrument = step.instrument || "INST-001";
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, { mean?: number; band?: string }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("assessment_results")
        .select("dimension_scores, created_at, superseded_at, assessment:assessments(instrument_id)")
        .eq("user_id", userId)
        .is("superseded_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      const row = (data || []).find(
        (r: any) => r?.assessment?.instrument_id === instrument,
      ) as any;
      setScores((row?.dimension_scores as any) || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, instrument]);

  return (
    <div className="space-y-4">
      {step.body && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{step.body}</p>
      )}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your profile…
        </div>
      ) : !scores ? (
        <p className="text-sm text-muted-foreground">
          Your profile isn't available right now.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PTP_DIM_ORDER.map((dim) => {
            const s = scores[dim];
            const mean = typeof s?.mean === "number" ? s.mean : null;
            const color = PTP_DIM_COLORS[dim];
            const bandLabel = humanizeBand(s?.band, mean);
            return (
              <Card
                key={dim}
                className="border-l-4 p-4"
                style={{ borderLeftColor: color }}
              >
                <div className="text-sm font-semibold text-foreground">
                  {PTP_DIM_NAMES[dim]}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold" style={{ color }}>
                    {mean != null ? Math.round(mean) : "—"}
                  </span>
                  <span className="text-sm text-muted-foreground">{bandLabel}</span>
                </div>
                {mean != null && (
                  <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, mean))}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
