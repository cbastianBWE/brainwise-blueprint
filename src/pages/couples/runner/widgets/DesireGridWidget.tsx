import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { CoupleContext, CoupleStep } from "../coupleShared";

/**
 * desire_grid — 4.2 (affection) and 4.3 (desire).
 *
 * Hard rules, do not relax:
 *  - Items come from `relationship_desire_vocabulary` via step.itemsFrom. No item list lives here.
 *  - Picks are written to `relationship_desire_picks` (step.storeTo), never to session responses.
 *    Desire picks store { bucket: "<item_key's bucket key>" } keyed by item_key. Never the label.
 *  - The partner's row is never read. Not for a count, not for progress, not to grey anything out.
 *    The only partner signal used here is CoupleContext.partnerSubmitted.
 *  - Overlap is computed in SQL (relationship_token_desire_overlap). Nothing is joined client-side.
 *  - No progress bar, no per-category counts or ticks, no nudge to mark more.
 */

export type DesirePicks = Record<string, { bucket?: string }>;
export type AffectionPick = { liking?: string; timing?: string };
export type AffectionPicks = Record<string, AffectionPick>;

interface GridItem {
  key: string;
  label: string;
  helper?: string | null;
  imageUrl?: string | null;
}

interface GridGroup {
  key: string;
  label: string;
  items: GridItem[];
}

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
      {/* Image slot: honored when image_path is set, never blocking on artwork. */}
      <div className="flex h-24 items-center justify-center bg-muted/40">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="px-3 text-center text-sm font-medium">{item.label}</span>
        )}
      </div>
      <div className="space-y-3 p-3">
        <p className="text-sm font-medium">{item.label}</p>
        {item.helper && <p className="text-sm text-muted-foreground">{item.helper}</p>}
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

/** Inline fallback: step.items, rendered as a single unlabelled group. */
function groupsFromStepItems(step: CoupleStep): GridGroup[] {
  const raw = Array.isArray(step.items) ? step.items : [];
  const items = raw
    .map((r: any) =>
      typeof r === "string"
        ? { key: r, label: r }
        : { key: String(r?.key ?? r?.label ?? ""), label: String(r?.label ?? r?.key ?? ""), imageUrl: r?.imageUrl ?? null },
    )
    .filter((i) => i.key && i.label);
  return items.length > 0 ? [{ key: "__inline", label: "", items }] : [];
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
  // The table stores the 4.3 grid under its catalog name.
  const dbMode = mode === "affection" ? "affection" : "desire_vocabulary";

  const buckets = useMemo(
    () => (Array.isArray(step.buckets) ? step.buckets.filter((b) => b?.key && b?.label) : []),
    [step.buckets],
  );

  const [groups, setGroups] = useState<GridGroup[]>(() => groupsFromStepItems(step));
  const [picks, setPicks] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [lockedAt, setLockedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  const bank = step.itemsFrom?.bank ?? (mode === "affection" ? "affection" : "desire");
  const useBank = !!step.itemsFrom;
  const groupByCol = step.itemsFrom?.groupBy ?? "category";
  const groupLabelCol = step.itemsFrom?.groupLabel ?? "category_label";

  // Load the shared vocabulary bank (readable by any signed-in user).
  useEffect(() => {
    if (!useBank) {
      setGroups(groupsFromStepItems(step));
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from("relationship_desire_vocabulary")
        .select("item_key, label, helper, image_path, sort_order, category, category_label")
        .eq("bank", bank)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (err) {
        setError("We couldn't load this list just now.");
        return;
      }
      const ordered: GridGroup[] = [];
      const byKey = new Map<string, GridGroup>();
      for (const row of (data as any[]) || []) {
        const gk = String(row[groupByCol] ?? "");
        const gl = String(row[groupLabelCol] ?? "");
        let g = byKey.get(gk);
        if (!g) {
          g = { key: gk, label: gl, items: [] };
          byKey.set(gk, g);
          ordered.push(g);
        }
        g.items.push({
          key: row.item_key,
          label: row.label,
          helper: row.helper ?? null,
          imageUrl: row.image_path || null,
        });
      }
      setGroups(ordered);
    })();
    return () => {
      cancelled = true;
    };
  }, [useBank, bank, groupByCol, groupLabelCol, step]);

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

  const renderItem = (item: GridItem) => (
    <ItemCard key={item.key} item={item}>
      {mode === "desire" ? (
        <ChoiceRow
          ariaLabel={`How ${item.label} sits for you`}
          options={buckets}
          selected={((picks as DesirePicks)[item.key] || {}).bucket}
          disabled={disabled}
          onSelect={(k) => {
            const cur = ((picks as DesirePicks)[item.key] || {}).bucket;
            const next = { ...(picks as DesirePicks) };
            if (cur === k) delete next[item.key];
            else next[item.key] = { bucket: k };
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
  );

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

      {groups.map((g) => (
        <section key={g.key} className="space-y-3">
          {g.label && <h3 className="text-sm font-semibold">{g.label}</h3>}
          <ul className="grid gap-3 sm:grid-cols-2">{g.items.map(renderItem)}</ul>
        </section>
      ))}

      <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
        {saving && <Loader2 className="h-3 w-3 animate-spin" />}
        {error ? <span>{error}</span> : <span>Saved as you go. Mark as many or as few as you want.</span>}
      </div>
    </div>
  );
}
