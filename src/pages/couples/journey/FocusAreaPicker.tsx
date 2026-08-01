import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchFocusAreas, type FocusAreaRow } from "./focusShared";

/**
 * Self-serve focus-area selection, shown under the 0.1 journey map.
 *
 * Nothing here is required to move on, so it stays quiet: no areas ready means
 * a single line, not an empty grid of shells.
 */
export function FocusAreaPicker({ relationshipId }: { relationshipId: string }) {
  const [areas, setAreas] = useState<FocusAreaRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setAreas(await fetchFocusAreas(relationshipId));
  }, [relationshipId]);

  useEffect(() => {
    void load();
  }, [load]);

  const clusters = useMemo(() => {
    const m = new Map<string, FocusAreaRow[]>();
    for (const a of areas || []) {
      const k = a.cluster || "";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    return Array.from(m.entries());
  }, [areas]);

  const toggle = async (area: FocusAreaRow) => {
    if (!area.self_selectable || area.practitioner_gated) return;
    setBusy(area.area_code);
    setNotes((n) => ({ ...n, [area.area_code]: "" }));
    const fn = area.selected
      ? "relationship_unchoose_focus_area"
      : "relationship_choose_focus_area";
    const { data, error } = await supabase.rpc(fn, {
      p_relationship: relationshipId,
      p_area_code: area.area_code,
    });
    const res = (data as Array<{ ok: boolean; reason: string }> | null)?.[0];
    if (!error && res && !res.ok) {
      const msg =
        res.reason === "work_started"
          ? "You've started this one, so it stays."
          : res.reason === "practitioner_only"
            ? "Your practitioner opens this one."
            : "That didn't go through. Try again in a moment.";
      setNotes((n) => ({ ...n, [area.area_code]: msg }));
    }
    await load();
    setBusy(null);
  };

  if (areas === null) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading focus areas…
      </div>
    );
  }

  if (areas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">More areas are coming.</p>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Focus areas</h3>
        <p className="text-xs text-muted-foreground">
          Most couples pick a few, and you can change your mind later.
        </p>
      </div>
      {clusters.map(([cluster, rows]) => (
        <div key={cluster} className="space-y-2">
          {cluster && (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {cluster}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map((a) => {
              const locked = !a.self_selectable || a.practitioner_gated;
              const note = notes[a.area_code];
              return (
                <div
                  key={a.area_code}
                  className={
                    "rounded-lg border p-3 text-left " +
                    (locked
                      ? "opacity-70"
                      : a.selected
                        ? "border-primary bg-primary/5"
                        : "")
                  }
                >
                  <button
                    type="button"
                    disabled={locked || busy === a.area_code}
                    onClick={() => toggle(a)}
                    className="block w-full text-left disabled:cursor-default"
                  >
                    <div className="flex items-start gap-2">
                      {locked ? (
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : a.selected ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      ) : null}
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {locked
                            ? "Your practitioner opens this one."
                            : [
                                a.core_prereq_label,
                                a.planned_activity_count
                                  ? `${a.planned_activity_count} ${a.planned_activity_count === 1 ? "activity" : "activities"}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                      </div>
                    </div>
                  </button>
                  {note && (
                    <p className="mt-2 text-xs text-muted-foreground">{note}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

export default FocusAreaPicker;
