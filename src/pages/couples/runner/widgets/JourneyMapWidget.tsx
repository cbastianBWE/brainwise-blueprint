import { useEffect, useState } from "react";
import { Check, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CoupleStep } from "../coupleShared";

interface FocusArea {
  code: string;
  label: string;
  blurb?: string | null;
}

interface Stop {
  module: number;
  count: number;
}

function pickLabel(row: Record<string, unknown>, code: string): string {
  for (const k of ["title", "name", "label", "area_title", "display_name"]) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return code;
}

function pickBlurb(row: Record<string, unknown>): string | null {
  for (const k of ["description", "blurb", "summary", "subtitle"]) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

export function JourneyMapWidget({
  step,
  value,
  onChange,
}: {
  step: CoupleStep;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [areas, setAreas] = useState<FocusArea[]>([]);
  const [loading, setLoading] = useState(true);

  const gated = new Set(step.practitionerGatedAreas || []);
  const selected = Array.isArray(value) ? value : [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Core path
      const { data: acts } = await supabase
        .from("relationship_activities")
        .select("area_code, module_number")
        .eq("status", "active");
      const rows = (acts as Array<{ area_code: string | null; module_number: number | null }>) || [];
      const core = new Map<number, number>();
      for (const r of rows) {
        if (r.area_code !== "core" || r.module_number == null) continue;
        core.set(r.module_number, (core.get(r.module_number) || 0) + 1);
      }
      const path = [...core.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([module, count]) => ({ module, count }));

      // Focus Areas — from their own table when it exists, otherwise from the
      // non-core area codes the catalogue already carries.
      let list: FocusArea[] = [];
      const fa = await (supabase as any).from("relationship_focus_areas").select("*");
      if (!fa.error && Array.isArray(fa.data)) {
        list = (fa.data as Array<Record<string, unknown>>)
          .map((r) => {
            const code = String(r.code ?? r.area_code ?? "");
            return { code, label: pickLabel(r, code), blurb: pickBlurb(r) };
          })
          .filter((a) => a.code);
      } else {
        const seen = new Map<string, number>();
        for (const r of rows) {
          if (!r.area_code || r.area_code === "core") continue;
          seen.set(r.area_code, (seen.get(r.area_code) || 0) + 1);
        }
        list = [...seen.keys()].sort().map((code) => ({ code, label: code }));
      }
      for (const g of gated) if (!list.some((a) => a.code === g)) list.push({ code: g, label: g });

      if (cancelled) return;
      setStops(path);
      setAreas(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (code: string) => {
    if (gated.has(code)) return;
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  };

  return (
    <div className="space-y-6">
      {step.intro && <p className="whitespace-pre-line text-sm text-muted-foreground">{step.intro}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Building your map…
        </div>
      ) : (
        <>
          {/* The path */}
          <div className="rounded-lg border bg-muted/20 p-4">
            <ol className="relative flex flex-col gap-0 sm:flex-row sm:items-start sm:justify-between">
              {stops.map((s, i) => (
                <li key={s.module} className="relative flex flex-1 items-center gap-3 sm:flex-col sm:gap-2 sm:text-center">
                  {i < stops.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-4 top-9 h-8 w-px bg-border sm:left-1/2 sm:top-4 sm:h-px sm:w-full"
                    />
                  )}
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background text-xs font-semibold text-primary">
                    {s.module}
                  </span>
                  <span className="py-2 text-xs text-muted-foreground sm:py-0">
                    {s.count} {s.count === 1 ? "activity" : "activities"}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Branches */}
          {areas.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {areas.map((a) => {
                const isGated = gated.has(a.code);
                const isOn = selected.includes(a.code);
                return (
                  <div key={a.code} className="relative pl-5">
                    <span aria-hidden className="absolute left-0 top-1/2 h-px w-4 bg-border" />
                    <button
                      type="button"
                      aria-pressed={isOn}
                      aria-disabled={isGated}
                      onClick={() => toggle(a.code)}
                      className={
                        "flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors " +
                        (isGated
                          ? "cursor-not-allowed border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground"
                          : isOn
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50")
                      }
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                        {isGated ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <span
                            className={
                              "flex h-4 w-4 items-center justify-center rounded-sm border " +
                              (isOn ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")
                            }
                          >
                            {isOn && <Check className="h-3 w-3" />}
                          </span>
                        )}
                      </span>
                      <span>
                        <span className="font-medium">{a.label}</span>
                        {a.blurb && <span className="mt-0.5 block text-muted-foreground">{a.blurb}</span>}
                        {isGated && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            Opens with a practitioner.
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
