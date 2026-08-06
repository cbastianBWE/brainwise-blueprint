import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { widgetRegistry, UnknownWidget } from "../widgetRegistry";
import { substituteStep, type CoupleContext, type CoupleStep } from "../coupleShared";

/**
 * Renders another activity's steps inline, through this same couples registry,
 * so a reused step gets couples behavior. Answers nest under this step's key.
 */
export function ReusedStepsWidget({
  step,
  couple,
  value,
  onChange,
  sessionId,
  activityCode,
  readOnly,
  relationshipId,
  activityId,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  sessionId: string;
  activityCode: string;
  readOnly?: boolean;
  relationshipId?: string;
  activityId?: string;
}) {
  const sourceCode = step.reuse_from || step.reworked_from;
  const [loading, setLoading] = useState(true);
  const [sourceSteps, setSourceSteps] = useState<CoupleStep[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sourceCode) {
        setLoading(false);
        return;
      }
      let def: any = null;
      const pub = await (supabase as any)
        .from("coaching_activities_public")
        .select("definition")
        .eq("code", sourceCode)
        .maybeSingle();
      def = pub?.data?.definition ?? null;
      if (!def) {
        const raw = await supabase
          .from("coaching_activities")
          .select("definition")
          .eq("code", sourceCode)
          .maybeSingle();
        def = (raw.data as any)?.definition ?? null;
      }
      if (cancelled) return;
      const steps = Array.isArray(def?.steps) ? (def.steps as CoupleStep[]) : null;
      setSourceSteps(steps);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceCode]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!sourceSteps || sourceSteps.length === 0) {
    return <UnknownWidget name={step.widget} />;
  }

  const nested = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const reworked = !!step.reworked_from;

  return (
    <div className="space-y-6">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}

      {sourceSteps.map((raw, i) => {
        const src = substituteStep(raw, couple);
        // The couples intro on the outer step wins for reworked sources.
        const sub: CoupleStep = reworked && step.intro ? { ...src, intro: undefined } : src;
        if (step.namesOnly) {
          sub.subfields = undefined;
          sub.requiredToComplete = false;
        }
        if (step.gentle) sub.requiredToComplete = false;

        const subKey = sub.key || sub.id || `step_${i}`;
        const renderer = widgetRegistry[sub.widget];

        return (
          <div key={subKey} className="space-y-2">
            {sub.title && <p className="text-base font-semibold">{sub.title}</p>}
            {renderer ? (
              renderer({
                step: sub,
                couple,
                value: nested[subKey],
                onChange: (next) => onChange({ ...nested, [subKey]: next }),
                sessionId,
                activityCode,
                responses: nested,
                readOnly,
                relationshipId,
                activityId,
              })
            ) : (
              <UnknownWidget name={sub.widget} />
            )}
          </div>
        );
      })}
    </div>
  );
}
