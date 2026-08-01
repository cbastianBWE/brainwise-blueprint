import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BrandedPlaceholder, renderImg } from "./journeyShared";
import { fetchFocusAreas, GATE_LABEL, type FocusAreaRow } from "./focusShared";

/**
 * Self-serve focus-area selection, shown under the 0.1 journey map.
 *
 * Three catalog flags govern exposure and are all enforced here:
 *  - `content_ready = false` → "Coming soon", never selectable, never enterable.
 *  - `self_selectable = false` (or `practitioner_gated`) → no choose control,
 *    a "your practitioner opens this" state instead.
 *  - `gate` → a small badge so the review/practitioner gate is visible.
 */
export function FocusAreaPicker({ relationshipId }: { relationshipId: string }) {
  const [areas, setAreas] = useState<FocusAreaRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
    if (!area.content_ready || !area.self_selectable || area.practitioner_gated) return;
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
    return <p className="text-sm text-muted-foreground">More areas are coming.</p>;
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
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((a) => {
              const practitionerOnly = !a.self_selectable || a.practitioner_gated;
              const comingSoon = !a.content_ready;
              const choosable = !practitionerOnly && !comingSoon;
              const note = notes[a.area_code];
              const outcomes = a.learning_outcomes || [];
              const open = !!expanded[a.area_code];
              const gateLabel = a.gate ? GATE_LABEL[a.gate] || a.gate : null;
              return (
                <div
                  key={a.area_code}
                  className={
                    "overflow-hidden rounded-lg border text-left " +
                    (comingSoon || practitionerOnly
                      ? "opacity-75"
                      : a.selected
                        ? "border-primary bg-primary/5"
                        : "")
                  }
                >
                  <div className="h-24 w-full overflow-hidden bg-muted">
                    {a.hero_image_url ? (
                      <img
                        src={renderImg(a.hero_image_url, 480, 192)}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <BrandedPlaceholder />
                    )}
                  </div>

                  <div className="space-y-2 p-3">
                    <button
                      type="button"
                      disabled={!choosable || busy === a.area_code}
                      onClick={() => toggle(a)}
                      className="block w-full text-left disabled:cursor-default"
                    >
                      <div className="flex items-start gap-2">
                        {comingSoon ? null : practitionerOnly ? (
                          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : a.selected ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        ) : null}
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium">{a.title}</p>
                          {a.description && (
                            <p className="text-xs text-muted-foreground">{a.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {comingSoon
                              ? "Coming soon"
                              : practitionerOnly
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

                    <div className="flex flex-wrap gap-1.5">
                      {comingSoon && <Badge variant="secondary">Coming soon</Badge>}
                      {gateLabel && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {gateLabel}
                        </Badge>
                      )}
                      {(a.tags || []).map((t) => (
                        <Badge key={t} variant="outline" className="text-xs font-normal">
                          {t}
                        </Badge>
                      ))}
                    </div>

                    {outcomes.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((e) => ({ ...e, [a.area_code]: !e[a.area_code] }))
                          }
                          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          {open ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          What you'll work on
                        </button>
                        {open && (
                          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                            {outcomes.map((o, i) => (
                              <li key={i}>{o}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {note && <p className="text-xs text-muted-foreground">{note}</p>}
                  </div>
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
