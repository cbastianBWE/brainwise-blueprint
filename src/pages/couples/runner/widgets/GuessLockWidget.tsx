import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { CoupleContext, CoupleStep } from "../coupleShared";

export type GuessValue = Record<string, { guess: number; confidence?: string }>;

function label(dim: string) {
  return dim.charAt(0).toUpperCase() + dim.slice(1);
}

export function GuessLockWidget({
  step,
  couple,
  value,
  onChange,
  readOnly,
  activityId,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  value: GuessValue;
  onChange: (next: GuessValue) => void;
  readOnly?: boolean;
  activityId?: string;
}) {
  const dims = step.dimensions || [];
  const taps = step.confidenceTap || [];
  const [ownScores, setOwnScores] = useState<Record<string, number> | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const current: GuessValue = value && typeof value === "object" ? value : {};

  useEffect(() => {
    if (!step.showOwnScoresAsReference) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("relationship_own_dimension_scores", {
        p_activity: activityId ?? null,
      });
      if (cancelled) return;
      if (error) {
        setLoadError(true);
        return;
      }
      const rows = (data as Array<{ dimension_key: string; score: number }> | null) || [];
      if (rows.length === 0) {
        setNoProfile(true);
        return;
      }
      const map: Record<string, number> = {};
      rows.forEach((r) => {
        map[r.dimension_key] = Number(r.score);
      });
      setOwnScores(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [step.showOwnScoresAsReference, activityId]);

  const locked = !!readOnly;

  const setGuess = (dim: string, guess: number) => {
    if (locked) return;
    onChange({ ...current, [dim]: { ...(current[dim] || { guess }), guess } });
  };
  const setConfidence = (dim: string, confidence: string) => {
    if (locked) return;
    const entry = current[dim] || { guess: 50 };
    onChange({ ...current, [dim]: { ...entry, confidence: entry.confidence === confidence ? undefined : confidence } });
  };

  const waiting = !!step.barrier && locked && !couple.barrierCleared;

  if (waiting && step.waitingCopy) {
    return <p className="whitespace-pre-line text-sm text-muted-foreground">{step.waitingCopy}</p>;
  }

  return (
    <div className="space-y-6">
      {step.selfIntro && <p className="whitespace-pre-line text-sm text-muted-foreground">{step.selfIntro}</p>}
      {step.showOwnScoresAsReference && loadError && (
        <p className="text-xs text-muted-foreground">We couldn't load your reference marks just now.</p>
      )}
      {step.showOwnScoresAsReference && !loadError && noProfile && (
        <p className="text-xs text-muted-foreground">We don't have your own scores on file, so there are no reference marks here.</p>
      )}


      <div className="space-y-5">
        {dims.map((dim) => {
          const entry = current[dim];
          const guess = typeof entry?.guess === "number" ? entry.guess : 50;
          const ref = ownScores ? scoreFor(ownScores, dim) : null;
          return (
            <div key={dim} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{label(dim)}</span>
                <span className="text-xs text-muted-foreground">{Math.round(guess)}</span>
              </div>
              <div className="relative">
                {ref != null && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-1 h-5 w-px bg-muted-foreground/40"
                    style={{ left: `${Math.max(0, Math.min(100, ref))}%` }}
                  />
                )}
                <Slider
                  value={[guess]}
                  min={0}
                  max={100}
                  step={1}
                  disabled={locked}
                  onValueChange={(v) => setGuess(dim, v[0])}
                  aria-label={label(dim)}
                />
              </div>
              {taps.length > 0 && (
                <div className="flex gap-2 pt-1">
                  {taps.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={entry?.confidence === t ? "default" : "outline"}
                      disabled={locked}
                      onClick={() => setConfidence(dim, t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
