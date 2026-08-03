import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AiAnalysisPanel } from "@/components/coaching/CoachingViews";
import { type GuessValue } from "./GuessLockWidget";
import type { CoupleContext, CoupleStep } from "../coupleShared";

export function ProfileRevealWidget({
  step,
  couple,
  responses,
  analysisHtml,
  relationshipId,
  activityId,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  responses: Record<string, unknown>;
  analysisHtml?: string;
  relationshipId?: string;
  activityId?: string;
}) {
  const guesses = (responses?.[step.guessSource || "partner_force_guesses"] as GuessValue) || {};
  const [truth, setTruth] = useState<Record<string, number> | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [shown, setShown] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("relationship_partner_dimension_scores", {
        p_relationship: relationshipId ?? null,
        p_activity: activityId ?? null,
        p_run: null,
      });
      if (cancelled) return;
      if (error) {
        setUnavailable(true);
        return;
      }
      const rows = (data as Array<{ dimension_key: string; score: number }> | null) || [];
      if (rows.length === 0) {
        setTruth(null);
        setUnavailable(!!couple.barrierCleared);
        return;
      }
      const map: Record<string, number> = {};
      rows.forEach((r) => {
        map[r.dimension_key] = Number(r.score);
      });
      setTruth(map);
      setUnavailable(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [relationshipId, activityId, couple.barrierCleared]);

  if (!couple.barrierCleared) {
    return step.waitingCopy ? (
      <p className="whitespace-pre-line text-sm text-muted-foreground">{step.waitingCopy}</p>
    ) : null;
  }

  const rows = Object.keys(guesses).map((dim) => {
    const guess = guesses[dim]?.guess;
    const actual = truth?.[dim] ?? null;
    const gap = typeof guess === "number" && actual != null ? Math.abs(guess - actual) : null;
    return { dim, guess, actual, gap };
  });
  // biggest gap last
  rows.sort((a, b) => (a.gap ?? -1) - (b.gap ?? -1));

  const visible = rows.slice(0, Math.max(1, shown));
  const more = shown < rows.length;

  return (
    <div className="space-y-4">
      {step.revealIntro && <p className="whitespace-pre-line text-sm text-muted-foreground">{step.revealIntro}</p>}

      <div className="space-y-3">
        {visible.map((r) => (
          <div key={r.dim} className="rounded-lg border p-4">
            <p className="text-sm font-semibold capitalize">{r.dim}</p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Your guess</dt>
                <dd className="font-medium">{typeof r.guess === "number" ? Math.round(r.guess) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{couple.otherFirstName}</dt>
                <dd className="font-medium">{r.actual != null ? Math.round(r.actual) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Distance</dt>
                <dd className="font-medium">{r.gap != null ? Math.round(r.gap) : "—"}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {unavailable && (
        <p className="text-xs text-muted-foreground">
          {couple.otherFirstName}'s profile isn't available here yet, so only your guesses are shown.
        </p>
      )}

      {more && (
        <Button variant="outline" size="sm" onClick={() => setShown((s) => s + 1)}>
          Next force
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}

      {!more && step.generateReads && analysisHtml && <AiAnalysisPanel html={analysisHtml} />}
    </div>
  );
}
