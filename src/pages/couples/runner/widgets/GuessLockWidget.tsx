import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { CoupleContext, CoupleStep } from "../coupleShared";

export type GuessValue = Record<string, { guess: number; confidence?: string }>;

function label(dim: string) {
  return dim.charAt(0).toUpperCase() + dim.slice(1);
}

/** Pull a 0-100 score for a dimension name out of a dimension_scores blob. */
export function scoreFor(scores: unknown, dim: string): number | null {
  if (!scores || typeof scores !== "object") return null;
  const obj = scores as Record<string, unknown>;
  const direct = obj[dim] ?? obj[label(dim)] ?? obj[dim.toUpperCase()];
  const read = (v: unknown): number | null => {
    if (typeof v === "number") return v;
    if (v && typeof v === "object") {
      const inner = v as Record<string, unknown>;
      for (const k of ["score", "value", "percentile", "normalized"]) {
        if (typeof inner[k] === "number") return inner[k] as number;
      }
    }
    return null;
  };
  const d = read(direct);
  if (d != null) return d;
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase().includes(dim.toLowerCase())) {
      const n = read(v);
      if (n != null) return n;
    }
  }
  return null;
}

export function GuessLockWidget({
  step,
  couple,
  value,
  onChange,
  readOnly,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  value: GuessValue;
  onChange: (next: GuessValue) => void;
  readOnly?: boolean;
}) {
  const dims = step.dimensions || [];
  const taps = step.confidenceTap || [];
  const [ownScores, setOwnScores] = useState<Record<string, unknown> | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const current: GuessValue = value && typeof value === "object" ? value : {};

  useEffect(() => {
    if (!step.showOwnScoresAsReference) return;
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("assessment_results")
        .select("dimension_scores, created_at")
        .eq("user_id", uid)
        .eq("instrument_id", step.instrument || "INST-001")
        .is("superseded_at", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const row = (data as Array<{ dimension_scores: unknown }> | null)?.[0];
      if (row?.dimension_scores) setOwnScores(row.dimension_scores as Record<string, unknown>);
      else setNoProfile(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [step.showOwnScoresAsReference, step.instrument]);

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
      {step.showOwnScoresAsReference && noProfile && (
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
