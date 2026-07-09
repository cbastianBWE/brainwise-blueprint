import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  InnerTeamCircleView,
  TEAM_LAYERS,
  effectiveTeamLayer,
  type InnerTeamMap,
  type InnerTeamCharacter,
  type TeamLayer,
} from "@/components/coaching/CoachingViews";
import { type Step, type Session, type Responses, buildUserPatch } from "../shared";

export function InnerTeamWidget({
  step, session, responses, setResponses, activityCode, setCoachingRemaining,
}: {
  step: Step; session: Session; responses: Responses;
  setResponses: (u: (prev: Responses) => Responses) => void;
  activityCode: string; setCoachingRemaining: (n: number) => void;
}) {
  const [mapping, setMapping] = useState(false);
  const charactersKey = step.charactersKey || "it_characters";
  const elicitKey = step.elicitKey || "it_elicit";
  const mapKey = step.mapKey || "inner_team_map";
  const overrideKey = step.override?.storeKey || "inner_team_overrides";
  const layerLabels = step.layerLabels || {};
  const powerLabels = step.powerLabels || {};
  const attributeLabels = step.attributeLabels || {};
  const map = (responses as any)[mapKey] as InnerTeamMap | undefined;
  const overrides = ((responses as any)[overrideKey] as Record<string, string>) || {};
  const suggestLabel = step.suggestAction?.label || "Suggest my team";
  const mapLabel = step.mapAction?.label || "Map my team";
  const hasTeam = !!map?.characters?.length;

  const rawRoster = (responses as any)[charactersKey];
  const roster: { name: string; description: string }[] = Array.isArray(rawRoster)
    ? rawRoster.map((v: any) => typeof v === "string" ? { name: v, description: "" } : { name: v?.name || "", description: v?.description || "" })
    : [];
  const rosterFilled = roster.filter((c) => c.name.trim().length > 0);

  const elicitBag = ((responses as any)[elicitKey] as Record<string, any>) || {};
  const hasAnyAnswer = Object.values(elicitBag).some((a: any) => a && typeof a === "object" && (
    (typeof a.text === "string" && a.text.trim().length > 0) || a.mode === "audio" || a.mode === "video"
  ));

  const setRoster = (next: { name: string; description: string }[]) =>
    setResponses((r) => ({ ...r, [charactersKey]: next }));
  const updateChar = (i: number, patch: Partial<{ name: string; description: string }>) =>
    setRoster(roster.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeChar = (i: number) => setRoster(roster.filter((_, idx) => idx !== i));
  const addChar = () => setRoster([...roster, { name: "", description: "" }]);

  const run = async () => {
    if (!session) return;
    setMapping(true);
    try {
      await supabase.rpc("coaching_session_save", {
        p_session_id: session.id, p_current_step: session.current_step,
        p_patch: buildUserPatch(responses) as any,
      });
      const { data, error } = await supabase.functions.invoke(
        step.mapAction?.function || step.suggestAction?.function || "coaching-inner-team-map",
        { body: { session_id: session.id } },
      );
      if (error) {
        const status = (error as any).context?.status;
        if (status === 402) {
          toast.error("You've used your coaching runs.", { description: "Upgrade for more.", action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") } });
        } else if (status === 403) { toast.error("Access denied for this activity."); }
        else { toast.error("Couldn't sketch your team. Please answer a question or two first, then try again."); }
        return;
      }
      const remaining = (data as any)?.coaching_remaining;
      if (typeof remaining === "number") setCoachingRemaining(remaining);
      const { data: row } = await supabase.from("coaching_activity_sessions").select("responses").eq("id", session.id).maybeSingle();
      if (row?.responses) { setResponses(() => row.responses as Responses); }
      else {
        const returnedMap = (data as any)?.inner_team_map;
        const returnedRoster = (data as any)?.roster;
        const html = (data as any)?.analysis_html;
        setResponses((r) => ({
          ...r,
          ...(returnedMap ? { [mapKey]: returnedMap } : {}),
          ...(Array.isArray(returnedRoster) ? { [charactersKey]: returnedRoster } : {}),
          ...(html ? { analysis: { ...(r.analysis || {}), html } } : {}),
        }));
      }
    } finally { setMapping(false); }
  };

  const setLayerOverride = (name: string, layer: TeamLayer) =>
    setResponses((r) => ({ ...r, [overrideKey]: { ...(((r as any)[overrideKey] as Record<string, string>) || {}), [name]: layer } }));
  const clearLayerOverride = (name: string) =>
    setResponses((r) => { const cur = { ...(((r as any)[overrideKey] as Record<string, string>) || {}) }; delete cur[name]; return { ...r, [overrideKey]: cur }; });

  return (
    <div className="space-y-6">
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-sm font-semibold">How this works</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose {suggestLabel} and your coach will read your answers and sketch a first team — each player with a name and a short description. Then shape it: rename a player, rewrite a description, remove one that doesn't fit, or add one your coach missed. When it feels right, {mapLabel} to see how your players ally, clash and drive your decisions. Nothing is fixed — re-map as often as you like.
        </p>
      </div>
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}

      {!hasTeam ? (
        <div className="flex items-center gap-3">
          <Button onClick={run} disabled={mapping || !hasAnyAnswer}>
            {mapping && <Loader2 className="h-4 w-4 animate-spin" />}
            {suggestLabel}
          </Button>
          {!hasAnyAnswer && <p className="text-xs text-muted-foreground">Answer a question or two above first.</p>}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <p className="text-sm font-semibold">Your team</p>
            <p className="text-sm text-muted-foreground">Edit any name or description, remove a player, or add one your coach missed. Then re-map to update the profiles below.</p>
            <div className="space-y-3">
              {roster.map((c, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={c.name}
                      onChange={(e) => updateChar(i, { name: e.target.value })}
                      className="h-8 text-sm font-medium"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeChar(i)} aria-label="Remove player">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={c.description}
                    onChange={(e) => updateChar(i, { description: e.target.value })}
                    className="mt-2 min-h-[52px] text-sm"
                  />
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addChar}>
              <Plus className="h-4 w-4" /> Add a player
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={run} disabled={mapping || rosterFilled.length === 0}>
              {mapping && <Loader2 className="h-4 w-4 animate-spin" />}
              {mapLabel}
            </Button>
            {rosterFilled.length === 0 && <p className="text-xs text-muted-foreground">Keep at least one player.</p>}
          </div>

          {map?.sufficiency && map.sufficiency.enough === false ? (
            <div className="rounded-md border p-4" style={{ borderColor: "var(--bw-orange)", background: "color-mix(in oklab, var(--bw-orange) 8%, transparent)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--bw-orange)" }}>A part of you may be missing</p>
              <p className="mt-1 text-sm text-muted-foreground">Your coach spotted an angle you haven't covered. Add anything these spark — as a new player above, or back in your answers — then re-map. You can still continue when you're ready.</p>
              {map.sufficiency.note && <p className="mt-2 text-sm">{map.sufficiency.note}</p>}
              {map.sufficiency.questions?.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{map.sufficiency.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
              )}
            </div>
          ) : null}

          <InnerTeamCircleView
            map={map}
            overrides={overrides}
            layerLabels={layerLabels}
            renderItem={(c, grow, shrink) => (
              <InnerTeamCharacterCard
                character={c} grow={grow} shrink={shrink}
                effectiveLayer={effectiveTeamLayer(c, overrides)}
                hasOverride={!!overrides[c.name]}
                layerLabels={layerLabels} powerLabels={powerLabels} attributeLabels={attributeLabels}
                onSetLayer={(ln) => setLayerOverride(c.name, ln)}
                onReset={() => clearLayerOverride(c.name)}
              />
            )}
          />
        </>
      )}
    </div>
  );
}

function InnerTeamCharacterCard({
  character,
  grow,
  shrink,
  effectiveLayer,
  hasOverride,
  layerLabels,
  powerLabels,
  attributeLabels,
  onSetLayer,
  onReset,
}: {
  character: InnerTeamCharacter;
  grow: boolean;
  shrink: boolean;
  effectiveLayer: TeamLayer;
  hasOverride: boolean;
  layerLabels: Record<string, string>;
  powerLabels: Record<string, string>;
  attributeLabels: Record<string, string>;
  onSetLayer: (l: TeamLayer) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const c = character;
  const attr = (k: string, v?: string) =>
    v ? (
      <p className="text-xs">
        <span className="font-medium">{attributeLabels[k] || k}:</span> {v}
      </p>
    ) : null;
  return (
    <div className="rounded-md border bg-background p-2 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left font-medium"
      >
        {grow && (
          <span aria-hidden style={{ color: "var(--bw-orange)" }}>★</span>
        )}
        <span>{c.name}</span>
        {c.power_now && (
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {powerLabels[c.power_now] || c.power_now}
          </span>
        )}
        {shrink && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            (ease off)
          </span>
        )}
        <span className="ml-auto text-muted-foreground">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {attr("description", c.description)}
          {attr("core_desire", c.core_desire)}
          {attr("greatest_fear", c.greatest_fear)}
          {attr("strength", c.strength)}
          {attr("weakness", c.weakness)}
          {attr("when_useful", c.when_useful)}
          {attr("talent", c.talent)}
          {c.power_future && attr("power_future", powerLabels[c.power_future] || c.power_future)}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Layer:
            </span>
            {TEAM_LAYERS.map((ln) => (
              <button
                key={ln}
                type="button"
                onClick={() => onSetLayer(ln)}
                className={
                  "rounded-full border px-2 py-0.5 text-[11px] " +
                  (effectiveLayer === ln
                    ? "border-[var(--bw-orange)] text-[var(--bw-orange)]"
                    : "border-border text-muted-foreground")
                }
              >
                {(layerLabels[ln] || ln).split("—")[0].trim()}
              </button>
            ))}
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
      )}
    </div>
  );
}
