import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CoupleStep } from "../coupleShared";

interface SafetyItem {
  id: string;
  item_key: string;
  prompt: string;
  item_type: string;
  options: unknown;
  sort_order: number | null;
}

type Answers = Record<string, unknown>;

function optionLabels(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options
      .map((o) => (typeof o === "string" ? o : typeof o === "object" && o ? String((o as any).label ?? (o as any).value ?? "") : ""))
      .filter(Boolean);
  }
  return [];
}

function SilentEvaluator({
  step,
  value,
  onChange,
  relationshipId,
  activityId,
}: {
  step: CoupleStep;
  value: unknown;
  onChange: (next: unknown) => void;
  relationshipId?: string;
  activityId?: string;
}) {
  const done = !!value && typeof value === "object";
  useEffect(() => {
    if (done || !step.evaluator || !relationshipId || !activityId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc(step.evaluator as string, {
        p_relationship: relationshipId,
        p_activity: activityId,
        p_run: null,
        p_answers: {},
      });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      const outcome =
        typeof row === "string" ? row : (row?.outcome ?? row?.result ?? row?.branch ?? (row?.routed ? "routed" : "clear"));
      const key = typeof outcome === "string" ? outcome : "clear";
      const target = (step.branches || {})[key];
      onChange({ branch: key, target, triggered: key !== "clear" && target !== "coach" && target !== "continue" });
    })();
    return () => {
      cancelled = true;
    };
  }, [done, step.evaluator, relationshipId, activityId]);
  return null;
}

export function SafetyScreenWidget({
  step,
  value,
  onChange,
  responses,
  relationshipId,
  activityId,
}: {
  step: CoupleStep;
  value: unknown;
  onChange: (next: unknown) => void;
  responses: Record<string, unknown>;
  relationshipId?: string;
  activityId?: string;
}) {

  const mode: "items" | "branch" | "resource" = step.itemsSource
    ? "items"
    : step.conditionOn
      ? "resource"
      : "branch";

  // ---------- Mode A: question set ----------
  const [items, setItems] = useState<SafetyItem[] | null>(null);
  useEffect(() => {
    if (mode !== "items") return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("relationship_safety_screen_items")
        .select("id, item_key, prompt, item_type, options, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!cancelled) setItems(((data as SafetyItem[]) || []).slice());
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // ---------- Mode C: resources ----------
  // Gating lives in the runner: if this step is rendered at all, its condition is met.
  const [resources, setResources] = useState<Array<Record<string, unknown>> | null>(null);

  useEffect(() => {
    if (mode !== "resource" || !step.resourcesFrom) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc(step.resourcesFrom as string, { p_categories: null });
      if (!cancelled) setResources((data as Array<Record<string, unknown>>) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, step.resourcesFrom]);

  if (mode === "resource") {
    return (
      <div className="space-y-4">
        {step.intro && <p className="whitespace-pre-line text-sm text-muted-foreground">{step.intro}</p>}
        {step.resourcesFrom && resources === null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        {resources && resources.length > 0 && (
          <ul className="space-y-2">
            {resources.map((r, i) => {
              const name = String(r.title ?? r.name ?? r.label ?? "");
              const detail = String(r.description ?? r.detail ?? r.body ?? "");
              const url = typeof r.url === "string" ? r.url : typeof r.link === "string" ? (r.link as string) : "";
              const phone = typeof r.phone === "string" ? (r.phone as string) : "";
              return (
                <li key={i} className="rounded-md border p-3 text-sm">
                  {name && <p className="font-medium">{name}</p>}
                  {detail && <p className="mt-1 text-muted-foreground">{detail}</p>}
                  {phone && <p className="mt-1 text-muted-foreground">{phone}</p>}
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 inline-block text-primary underline underline-offset-2"
                    >
                      {url}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  if (mode === "branch") {
    const branches = step.branches || {};
    const isNeutral = (target: string) => target === "continue" || target === "coach" || target === "clear";
    // Silent, computed branch: no copy at all — evaluate and move on.
    if (!step.intro) {
      return <SilentEvaluator step={step} value={value} onChange={onChange} relationshipId={relationshipId} activityId={activityId} />;
    }
    const picked = (value && typeof value === "object" ? (value as any).branch : undefined) as string | undefined;
    return (
      <div className="space-y-4">
        <p className="whitespace-pre-line text-sm text-muted-foreground">{step.intro}</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(branches).map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={picked === k ? "default" : "outline"}
              onClick={() => onChange({ branch: k, target: branches[k], triggered: !isNeutral(branches[k]) })}
              className="capitalize"
            >
              {k}
            </Button>
          ))}
        </div>
      </div>
    );
  }


  // ---------- Mode A render ----------
  const answers: Answers = value && typeof value === "object" ? (value as Answers) : {};
  const setAnswer = (key: string, v: unknown) => onChange({ ...answers, [key]: v });

  return (
    <div className="space-y-5">
      {step.intro && <p className="whitespace-pre-line text-sm text-muted-foreground">{step.intro}</p>}
      {items === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        items.map((it) => {
          const opts = optionLabels(it.options);
          return (
            <div key={it.id} className="space-y-2">
              <p className="text-sm font-medium">{it.prompt}</p>
              {opts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {opts.map((o) => (
                    <Button
                      key={o}
                      type="button"
                      size="sm"
                      variant={answers[it.item_key] === o ? "default" : "outline"}
                      onClick={() => setAnswer(it.item_key, o)}
                    >
                      {o}
                    </Button>
                  ))}
                </div>
              ) : (
                <Textarea
                  rows={3}
                  value={typeof answers[it.item_key] === "string" ? (answers[it.item_key] as string) : ""}
                  onChange={(e) => setAnswer(it.item_key, e.target.value)}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
