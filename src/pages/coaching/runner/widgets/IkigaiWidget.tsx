import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  IkigaiRegionsView,
  IKIGAI_LENSES,
  type IkigaiMap,
  type IkigaiLens,
} from "@/components/coaching/CoachingViews";
import { mmIsFilled, type MMValue } from "@/components/coaching/MultimodalField";
import { type Step, type Session, type Responses, buildUserPatch } from "../shared";
import { ListBuilderWidget } from "./ListBuilderWidget";

export function IkigaiWidget({
  step,
  session,
  responses,
  setResponses,
  activityCode,
  setCoachingRemaining,
}: {
  step: Step;
  session: Session;
  responses: Responses;
  setResponses: (u: (prev: Responses) => Responses) => void;
  activityCode: string;
  setCoachingRemaining: (n: number) => void;
}) {
  const [mapping, setMapping] = useState(false);
  const lenses = step.lenses || [];
  const mapKey = step.mapKey || "ikigai_map";
  const overrideKey = step.override?.storeKey || "ikigai_overrides";
  const regionLabels = step.regionLabels || {};
  const map = (responses as any)[mapKey] as IkigaiMap | undefined;
  const overrides =
    ((responses as any)[overrideKey] as Record<string, IkigaiLens[]>) || {};

  const totalItems = lenses.reduce((n, l) => {
    const arr = (responses as any)[l.storeKey] as MMValue[] | undefined;
    return n + (Array.isArray(arr) ? arr.filter((v) => mmIsFilled(v)).length : 0);
  }, 0);

  const doMap = async () => {
    if (!session) return;
    setMapping(true);
    try {
      await supabase.rpc("coaching_session_save", {
        p_session_id: session.id,
        p_current_step: session.current_step,
        p_patch: buildUserPatch(responses) as any,
      });
      const { data, error } = await supabase.functions.invoke(
        step.mapAction?.function || "coaching-ikigai-map",
        { body: { session_id: session.id } },
      );
      if (error) {
        const status = (error as any).context?.status;
        if (status === 402) {
          toast.error("You've used your coaching runs.", {
            description: "Upgrade for more.",
            action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
          });
        } else if (status === 403) {
          toast.error("Access denied for this activity.");
        } else {
          toast.error("Couldn't map your Ikigai. Please try again.");
        }
        return;
      }
      const remaining = (data as any)?.coaching_remaining;
      if (typeof remaining === "number") setCoachingRemaining(remaining);
      const { data: row } = await supabase
        .from("coaching_activity_sessions")
        .select("responses")
        .eq("id", session.id)
        .maybeSingle();
      if (row?.responses) {
        setResponses(() => row.responses as Responses);
      } else {
        const returnedMap = (data as any)?.ikigai_map;
        const html = (data as any)?.analysis_html;
        setResponses((r) => ({
          ...r,
          ...(returnedMap ? { [mapKey]: returnedMap } : {}),
          ...(html ? { analysis: { ...(r.analysis || {}), html } } : {}),
        }));
      }
    } finally {
      setMapping(false);
    }
  };

  const setOverride = (label: string, next: IkigaiLens[]) => {
    setResponses((r) => {
      const cur = { ...(((r as any)[overrideKey] as Record<string, IkigaiLens[]>) || {}) };
      cur[label] = next;
      return { ...r, [overrideKey]: cur };
    });
  };
  const clearOverride = (label: string) => {
    setResponses((r) => {
      const cur = { ...(((r as any)[overrideKey] as Record<string, IkigaiLens[]>) || {}) };
      delete cur[label];
      return { ...r, [overrideKey]: cur };
    });
  };

  const sufficiency = map?.sufficiency;
  const isHog = step.variant === "hedgehog";
  const lensChoices = (step.lenses || []).map((l) => l.key);

  const LENS_COLOR: Record<string, string> = {
    love: "var(--bw-orange)", good: "var(--bw-navy-500)", need: "var(--bw-plum)", paid: "var(--bw-mustard)",
    passion: "var(--bw-orange)", best: "var(--bw-navy-500)", engine: "var(--bw-plum)",
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-sm font-semibold">How this works</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isHog ? (
            <>
              Brainstorm each of the three circles below — just put down whatever
              comes, one idea per line. You don&apos;t need to sort them. When
              you&apos;re ready, choose <span className="font-medium">Map my Hedgehog</span> and
              your coach will work out where your ideas overlap and show you the
              picture. Nothing is fixed: you can adjust where any idea sits, and
              re-map as often as you like.
            </>
          ) : (
            <>
              Brainstorm each of the four lenses below — just put down whatever comes,
              one idea per line. You don&apos;t need to sort them. When you&apos;re ready,
              choose <span className="font-medium">Map my Ikigai</span> and your coach
              will work out where your ideas overlap and show you the picture. Nothing
              is fixed: you can adjust where any idea sits, and re-map as often as
              you like.
            </>
          )}
        </p>
      </div>
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {lenses.map((l) => {
          const color = LENS_COLOR[l.key] || undefined;
          return (
            <div
              key={l.key}
              className="rounded-md border p-3"
              style={color ? { borderColor: color } : undefined}
            >
              <p className="text-sm font-medium" style={color ? { color } : undefined}>
                {l.label}
              </p>
              {l.prompt && (
                <p className="mt-1 text-xs text-muted-foreground">{l.prompt}</p>
              )}
              <div className="mt-3">
                <ListBuilderWidget
                  step={{ ...step, key: l.storeKey, helper: undefined, prioritize: undefined, min: 0 } as Step}
                  items={((responses as any)[l.storeKey] as MMValue[]) || []}
                  onChange={(v) => setResponses((r) => ({ ...r, [l.storeKey]: v }))}
                  sessionId={session.id}
                  activityCode={activityCode}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <Button
          onClick={doMap}
          disabled={mapping || totalItems === 0}
          variant={map?.items?.length && sufficiency?.enough === false ? "default" : "default"}
        >
          {mapping && <Loader2 className="h-4 w-4 animate-spin" />}
          {map?.items?.length ? "Re-map" : step.mapAction?.label || (isHog ? "Map my Hedgehog" : "Map my Ikigai")}
        </Button>
        {totalItems === 0 && (
          <p className="text-xs text-muted-foreground">
            Add at least one item in any lens.
          </p>
        )}
      </div>

      {map?.items?.length && sufficiency && sufficiency.enough === false ? (
        <div
          className="rounded-md border p-4"
          style={{ borderColor: "var(--bw-orange)", background: "color-mix(in oklab, var(--bw-orange) 8%, transparent)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--bw-orange)" }}>
            Go deeper
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your map is looking a little thin. A few questions to go deeper — add
            anything they spark, then re-map. You can still continue when you're
            ready.
          </p>
          {sufficiency.note && (
            <p className="mt-2 text-sm">{sufficiency.note}</p>
          )}
          {sufficiency.questions?.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {sufficiency.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {map?.items?.length ? (
        <IkigaiRegionsView
          map={map}
          overrides={overrides as Record<string, string[]>}
          regionLabels={regionLabels}
          renderItem={(it, cand) => {
            const current = new Set<IkigaiLens>(it.lenses);
            const hasOverride = !!overrides[it.label];
            return (
              <IkigaiItemCard
                item={it}
                cand={cand}
                current={current}
                hasOverride={hasOverride}
                regionLabels={regionLabels}
                onToggle={(ln, checked) => {
                  const next = new Set(current);
                  if (checked) next.add(ln);
                  else if (next.size > 1) next.delete(ln);
                  setOverride(it.label, Array.from(next));
                }}
                onReset={() => clearOverride(it.label)}
              />
            );
          }}
        />
      ) : null}
    </div>
  );
}

function IkigaiItemCard({
  item,
  cand,
  current,
  hasOverride,
  regionLabels,
  onToggle,
  onReset,
}: {
  item: { label: string; reasoning?: string };
  cand: boolean;
  current: Set<IkigaiLens>;
  hasOverride: boolean;
  regionLabels: Record<string, string>;
  onToggle: (ln: IkigaiLens, checked: boolean) => void;
  onReset: () => void;
}) {
  const [showReason, setShowReason] = useState(false);
  return (
    <div className="rounded-md border bg-background p-2 text-xs">
      <div className="flex items-center gap-1 font-medium">
        {cand && (
          <span aria-hidden style={{ color: "var(--bw-orange)" }}>★</span>
        )}
        <span>{item.label}</span>
        {item.reasoning && (
          <button
            type="button"
            className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground underline"
            onClick={() => setShowReason((v) => !v)}
            aria-expanded={showReason}
          >
            {showReason ? "hide why" : "why?"}
          </button>
        )}
      </div>
      {showReason && item.reasoning && (
        <p className="mt-1 text-[11px] italic text-muted-foreground">{item.reasoning}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {IKIGAI_LENSES.map((ln) => {
          const checked = current.has(ln);
          return (
            <label
              key={ln}
              className={
                "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 " +
                (checked
                  ? "border-primary bg-primary/10"
                  : "text-muted-foreground")
              }
            >
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={checked}
                onChange={(e) => onToggle(ln, e.target.checked)}
              />
              {regionLabels[ln] || ln}
            </label>
          );
        })}
        {hasOverride && (
          <button
            type="button"
            className="text-[10px] uppercase tracking-wide text-muted-foreground underline"
            onClick={onReset}
          >
            reset
          </button>
        )}
      </div>
    </div>
  );
}
