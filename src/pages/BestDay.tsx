import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BestDayLocked from "./best-day/BestDayLocked";
import BestDayForm from "./best-day/BestDayForm";
import BestDayInterview from "./best-day/BestDayInterview";
import BestDayPlan from "./best-day/BestDayPlan";
import {
  localDate,
  type BdoCarryover,
  type BdoItem,
  type BdoPlan,
  type BdoStart,
  type FormSpec,
} from "./best-day/bdoShared";

type Stage = "form" | "interview" | "plan";

async function readFnError(error: unknown): Promise<{ status?: number; code?: string }> {
  const ctx = (error as any)?.context;
  const status: number | undefined = ctx?.status;
  let code: string | undefined;
  try {
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.clone().json();
      code = body?.error;
    }
  } catch {
    /* body already consumed or not JSON */
  }
  return { status, code };
}

export default function BestDay() {
  const [loading, setLoading] = useState(true);
  const [gated, setGated] = useState(false);
  const [plan, setPlan] = useState<BdoPlan | null>(null);
  const [items, setItems] = useState<BdoItem[]>([]);
  const [carryover, setCarryover] = useState<BdoCarryover[]>([]);
  const [spec, setSpec] = useState<FormSpec | null>(null);
  const [stage, setStage] = useState<Stage>("form");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reshaping, setReshaping] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const applyStart = (data: BdoStart) => {
    if (!data || (data as any).gated) {
      setGated(true);
      return;
    }
    const d = data as Extract<BdoStart, { gated: false }>;
    setGated(false);
    setPlan(d.plan);
    setItems(d.items ?? []);
    setCarryover(d.carryover ?? []);
    setStage(d.plan?.plan ? "plan" : "form");
  };

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("bdo_start_today" as any, {
      p_plan_date: localDate(),
    });
    if (error) {
      console.error("[best-day] bdo_start_today failed", error);
      setLoadError(true);
      return null;
    }
    return data as unknown as BdoStart;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const [start, def] = await Promise.all([
        refresh(),
        supabase.rpc("bdo_active_definition" as any),
      ]);
      if (!active) return;
      if (def.error) console.error("[best-day] bdo_active_definition failed", def.error);
      const row: any = Array.isArray(def.data) ? def.data[0] : def.data;
      if (row?.form_spec) setSpec(row.form_spec as FormSpec);
      if (start) applyStart(start);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const reload = async () => {
    const start = await refresh();
    if (start) applyStart(start);
  };

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyIds((s) => new Set(s).add(id));
    try {
      await fn();
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const setStatus = (id: string, status: "pending" | "done" | "dropped") =>
    withBusy(id, async () => {
      const { error } = await supabase.rpc("bdo_set_item_status" as any, {
        p_item_id: id,
        p_status: status,
      });
      if (error) {
        console.error("[best-day] bdo_set_item_status failed", error);
        return;
      }
      await reload();
    });

  const moveItem = (id: string, to: string) =>
    withBusy(id, async () => {
      const { error } = await supabase.rpc("bdo_move_item" as any, {
        p_item_id: id,
        p_to_date: to,
      });
      if (error) {
        console.error("[best-day] bdo_move_item failed", error);
        return;
      }
      await reload();
    });

  const generate = async (action: "generate" | "reshape") => {
    if (!plan) return;
    setNotice(null);
    const setBusy = action === "generate" ? setGenerating : setReshaping;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("best-day-organizer", {
        body: { action, day_plan_id: plan.id },
      });
      if (error) {
        const { status, code } = await readFnError(error);
        if (status === 429 && code === "already_generated_today") {
          setNotice("Your day is already planned. Use reshape if you want to rearrange it.");
          await reload();
          return;
        }
        if (status === 429 && code === "reshape_allowance_spent") {
          setNotice("You have used all of today's reshapes. Your current plan stays as it is.");
          await reload();
          return;
        }
        if (status === 409 && code === "ptp_required") {
          setGated(true);
          return;
        }
        console.error("[best-day] generate failed", error);
        setNotice("That did not come through. Try again in a moment.");
        return;
      }
      await reload();
      setStage("plan");
    } finally {
      setBusy(false);
    }
  };

  const onFormContinue = async (form: Record<string, unknown>, titles: string[]) => {
    if (!plan) return;
    setSubmitting(true);
    try {
      const [saved, typed] = await Promise.all([
        supabase.rpc("bdo_save_form" as any, { p_day_plan_id: plan.id, p_form: form }),
        supabase.rpc("bdo_set_typed_items" as any, { p_day_plan_id: plan.id, p_titles: titles }),
      ]);
      if (saved.error) console.error("[best-day] bdo_save_form failed", saved.error);
      if (typed.error) console.error("[best-day] bdo_set_typed_items failed", typed.error);
      await reload();
      setStage("interview");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (gated) return <BestDayLocked />;

  if (loadError || !plan) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Best Day Organizer</h1>
        <p className="text-sm text-muted-foreground">
          Today's plan could not be loaded. Refresh the page to try again.
        </p>
      </div>
    );
  }

  const reshapesRemaining = Math.max(0, (plan.reshape_allowance ?? 0) - (plan.reshapes_used ?? 0));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {stage !== "plan" && (
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Best Day Organizer</h1>
          <p className="text-sm text-muted-foreground">
            A couple of minutes now, and the rest of the day has a shape.
          </p>
        </div>
      )}

      {notice && stage !== "plan" && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">{notice}</div>
      )}

      {stage === "form" && (
        <BestDayForm
          spec={spec}
          carryover={carryover}
          busyIds={busyIds}
          submitting={submitting}
          onTriageKeep={(id) => moveItem(id, localDate())}
          onTriageMove={(id, d) => moveItem(id, d)}
          onTriageDrop={(id) => setStatus(id, "dropped")}
          onContinue={onFormContinue}
        />
      )}

      {stage === "interview" && (
        <BestDayInterview
          dayPlanId={plan.id}
          generating={generating}
          onFinish={() => void generate("generate")}
        />
      )}

      {stage === "plan" && plan.plan && (
        <BestDayPlan
          body={plan.plan}
          items={items}
          busyIds={busyIds}
          reshaping={reshaping}
          reshapesRemaining={reshapesRemaining}
          reshapeNotice={notice}
          onToggleDone={(id, done) => setStatus(id, done ? "done" : "pending")}
          onMove={moveItem}
          onDrop={(id) => setStatus(id, "dropped")}
          onReshape={() => void generate("reshape")}
        />
      )}

      {stage === "plan" && !plan.plan && (
        <p className="text-sm text-muted-foreground">Building your day…</p>
      )}
    </div>
  );
}
