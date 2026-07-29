import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { CoupleContext, CoupleStep } from "../coupleShared";

/**
 * desire_grid — 4.2 (affection) and 4.3 (desire).
 *
 * Hard rules, do not relax:
 *  - Picks are written to `relationship_desire_picks` (step.storeTo), never to session responses.
 *    This widget therefore never calls the runner's onChange.
 *  - The partner's row is never read. Not for a count, not for progress, not to grey anything out.
 *    The only partner signal used here is CoupleContext.partnerSubmitted.
 *  - Overlap is computed in SQL (relationship_token_desire_overlap). Nothing is joined client-side.
 *  - No progress bar, no percentage, no nudge to mark more.
 */

export type GridBucket = string;
export type DesirePicks = Record<string, GridBucket>;
export type AffectionPick = { liking?: string; timing?: string };
export type AffectionPicks = Record<string, AffectionPick>;

interface GridItem {
  key: string;
  label: string;
  imageUrl?: string;
}

/**
 * PLACEHOLDER VOCABULARY (4.3).
 * The real item list is authored, reviewed and agreed separately, then delivered
 * on the step as `step.items`. Do not extend this list by hand.
 */
const PLACEHOLDER_DESIRE_ITEMS: GridItem[] = [
  { key: "placeholder_1", label: "Placeholder item one" },
  { key: "placeholder_2", label: "Placeholder item two" },
  { key: "placeholder_3", label: "Placeholder item three" },
  { key: "placeholder_4", label: "Placeholder item four" },
  { key: "placeholder_5", label: "Placeholder item five" },
  { key: "placeholder_6", label: "Placeholder item six" },
];

/** 4.2 — everyday, non-sexual closeness. */
const AFFECTION_ITEMS: GridItem[] = [
  { key: "holding_hands", label: "Holding hands" },
  { key: "hugs", label: "Hugs" },
  { key: "sitting_close", label: "Sitting close" },
  { key: "hand_on_shoulder", label: "A hand on the shoulder" },
  { key: "waking_up_close", label: "Waking up close" },
  { key: "falling_asleep_touching", label: "Falling asleep touching" },
];

const DESIRE_BUCKET_LABELS: Record<string, string> = {
  like: "Already like it",
  curious: "Curious about it",
  not_for_me: "Not for me",
  off_the_table: "Off the table",
};

const LIKING_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "love", label: "Love it" },
  { key: "like", label: "Like it" },
  { key: "neutral", label: "Don't mind" },
  { key: "rather_not", label: "Rather not" },
];

const TIMING_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "anytime", label: "Anytime" },
  { key: "at_home", label: "At home" },
  { key: "out_and_about", label: "Out and about" },
  { key: "quiet_moments", label: "Quiet moments" },
];

function ItemCard({ item, children }: { item: GridItem; children: React.ReactNode }) {
  return (
    <li className="overflow-hidden rounded-lg border">
      {/* Image slot: ready for the curated library, never blocking on artwork. */}
      <div className="flex h-24 items-center justify-center bg-muted/40">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="px-3 text-center text-sm font-medium">{item.label}</span>
        )}
      </div>
      <div className="space-y-3 p-3">
        <p className="text-sm font-medium">{item.label}</p>
        {children}
      </div>
    </li>
  );
}

function ChoiceRow({
  options,
  selected,
  onSelect,
  disabled,
  ariaLabel,
}: {
  options: Array<{ key: string; label: string }>;
  selected?: string;
  onSelect: (key: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const on = selected === o.key;
        return (
          <Button
            key={o.key}
            type="button"
            size="sm"
            variant={on ? "default" : "outline"}
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onSelect(o.key)}
          >
            {on && <Check className="h-3 w-3" />}
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}

export function DesireGridWidget({
  step,
  couple,
  relationshipId,
  activityId,
  readOnly,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  relationshipId?: string;
  activityId?: string;
  readOnly?: boolean;
}) {
  const mode = step.gridMode === "affection" ? "affection" : "desire";
  const runNumber = typeof step.runNumber === "number" ? step.runNumber : 1;
  // The table stores the 4.3 grid under its catalogue name.
  const dbMode = mode === "affection" ? "affection" : "desire_vocabulary";

  const items: GridItem[] = useMemo(() => {
    const fromStep = Array.isArray(step.items) ? step.items : null;
    if (fromStep && fromStep.length > 0) {
      return fromStep
        .map((raw: any) =>
          typeof raw === "string"
            ? { key: raw, label: raw }
            : { key: String(raw?.key ?? raw?.label ?? ""), label: String(raw?.label ?? raw?.key ?? ""), imageUrl: raw?.imageUrl },
        )
        .filter((i) => i.key && i.label);
    }
    return mode === "affection" ? AFFECTION_ITEMS : PLACEHOLDER_DESIRE_ITEMS;
  }, [step.items, mode]);

  const usingPlaceholders = mode === "desire" && !(Array.isArray(step.items) && step.items.length > 0);

  const buckets = useMemo(() => {
    const dims = Array.isArray(step.dimensions) && step.dimensions.length > 0
      ? step.dimensions
      : ["like", "curious", "not_for_me", "off_the_table"];
    return dims.map((d) => ({ key: d, label: DESIRE_BUCKET_LABELS[d] || d }));
  }, [step.dimensions]);

  const [picks, setPicks] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [lockedAt, setLockedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  // Load only this user's row. RLS scopes to auth.uid(); we also filter explicitly.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!relationshipId || !activityId) {
        setLoading(false);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase
        .from("relationship_desire_picks")
        .select("picks, locked_at")
        .eq("relationship_id", relationshipId)
        .eq("activity_id", activityId)
        .eq("user_id", uid)
        .eq("run_number", runNumber)
        .eq("grid_mode", dbMode)
        .maybeSingle();
      if (cancelled) return;
      if (err) setError("We couldn't load your answers just now.");
      setPicks((data?.picks as Record<string, unknown>) || {});
      setLockedAt((data?.locked_at as string | null) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [relationshipId, activityId, runNumber, mode, dbMode]);

  const persist = useCallback(
    async (next: Record<string, unknown>) => {
      if (!relationshipId || !activityId) return;
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;
      setSaving(true);
      const { error: err } = await supabase
        .from("relationship_desire_picks")
        .upsert(
          [
            {
              relationship_id: relationshipId,
              activity_id: activityId,
              user_id: uid,
              run_number: runNumber,
              grid_mode: dbMode,
              picks: next as never,
            },
          ],
          { onConflict: "relationship_id,user_id,activity_id,run_number" },
        );
      setSaving(false);
      setError(err ? "That didn't save. It'll try again when you make the next change." : null);
    },
    [relationshipId, activityId, runNumber, dbMode],
  );

  const update = (nextPicks: Record<string, unknown>) => {
    setPicks(nextPicks);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void persist(nextPicks), 400);
  };

  const disabled = !!readOnly || !!lockedAt;

  // Once this side is in and the barrier hasn't cleared, the step says only its waiting copy.
  const waiting = !!step.barrier && !couple.barrierCleared && (disabled || couple.partnerSubmitted);
  if (waiting) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm">
          {step.waitingCopy ||
            `Your answers are in. Nothing is shown until ${couple.otherFirstName} has finished their side.`}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Getting your answers…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step.intro && <p className="whitespace-pre-line text-sm text-muted-foreground">{step.intro}</p>}

      {mode === "affection" && (
        <p className="text-sm text-muted-foreground">
          Nothing here is sexual. This is everyday closeness: two things for each one, how much you like it and
          when you want it.
        </p>
      )}

      {mode === "desire" && (
        <p className="text-sm text-muted-foreground">
          Skip anything that doesn't apply. There is no right amount to mark.
        </p>
      )}

      {usingPlaceholders && (
        <div className="rounded-md border border-dashed p-3">
          <p className="text-sm font-medium">Placeholder vocabulary</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The item list for this screen is being authored and reviewed separately. These placeholders are here so
            the screen works; they are not the real content.
          </p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <ItemCard key={item.key} item={item}>
            {mode === "desire" ? (
              <ChoiceRow
                ariaLabel={`How ${item.label} sits for you`}
                options={buckets}
                selected={(picks as DesirePicks)[item.key]}
                disabled={disabled}
                onSelect={(k) => {
                  const cur = (picks as DesirePicks)[item.key];
                  const next = { ...(picks as DesirePicks) };
                  if (cur === k) delete next[item.key];
                  else next[item.key] = k;
                  update(next);
                }}
              />
            ) : (
              <div className="space-y-2">
                <ChoiceRow
                  ariaLabel={`How much you like ${item.label}`}
                  options={LIKING_OPTIONS}
                  selected={((picks as AffectionPicks)[item.key] || {}).liking}
                  disabled={disabled}
                  onSelect={(k) => {
                    const cur = (picks as AffectionPicks)[item.key] || {};
                    const next = { ...(picks as AffectionPicks), [item.key]: { ...cur, liking: cur.liking === k ? undefined : k } };
                    update(next);
                  }}
                />
                <ChoiceRow
                  ariaLabel={`When you want ${item.label}`}
                  options={TIMING_OPTIONS}
                  selected={((picks as AffectionPicks)[item.key] || {}).timing}
                  disabled={disabled}
                  onSelect={(k) => {
                    const cur = (picks as AffectionPicks)[item.key] || {};
                    const next = { ...(picks as AffectionPicks), [item.key]: { ...cur, timing: cur.timing === k ? undefined : k } };
                    update(next);
                  }}
                />
              </div>
            )}
          </ItemCard>
        ))}
      </ul>

      <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
        {saving && <Loader2 className="h-3 w-3 animate-spin" />}
        {error ? <span>{error}</span> : <span>Saved as you go. Mark as many or as few as you want.</span>}
      </div>
    </div>
  );
}
