import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Kind = "team" | "paired" | "ptp";

interface PlanResponse {
  narrative_status: string;
  sections_expected: string[];
  sections_done: string[];
  relationship_mode?: string;
}

interface Options {
  kind: Kind;
  id: string | undefined;
  // Current narrative_status from the profile row. Generator only runs when defined and !== "complete".
  status: string | null | undefined;
  // Called after each successfully generated section so the caller can refetch sections.
  onSectionDone: () => void | Promise<void>;
  // Only privileged viewers should drive generation; pass false to disable.
  enabled?: boolean;
  // PTP only: the narrative_context (professional | personal | combined). Included in every call.
  context?: string;
  // PTP only: whether to include coach_questions in the plan (coach viewers).
  includeCoach?: boolean;
}

export interface NarrativeGeneratorState {
  running: boolean;
  expected: string[];
  done: string[];
  failed: string[];
  current: string | null;
  retry: () => void;
}

const FN_NAME: Record<Kind, string> = {
  team: "generate-team-narrative",
  paired: "generate-paired-narrative",
  ptp: "generate-ptp-narrative",
};

const ID_KEY: Record<Kind, string> = {
  team: "team_profile_id",
  paired: "paired_profile_id",
  ptp: "assessment_result_id",
};

export function useNarrativeGenerator({
  kind,
  id,
  status,
  onSectionDone,
  enabled = true,
  context,
  includeCoach,
}: Options): NarrativeGeneratorState {
  const [running, setRunning] = useState(false);
  const [expected, setExpected] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const startedRef = useRef<string | null>(null);
  const onSectionDoneRef = useRef(onSectionDone);

  useEffect(() => {
    onSectionDoneRef.current = onSectionDone;
  }, [onSectionDone]);

  const runLoop = useCallback(
    async (only?: string[]) => {
      if (!id) return;
      setRunning(true);
      setFailed([]);
      try {
        const idBody: Record<string, unknown> = { [ID_KEY[kind]]: id };
        if (context) idBody.narrative_context = context;
        if (kind === "ptp") idBody.include_coach = !!includeCoach;
        let plan: PlanResponse | null = null;

        if (only && only.length > 0) {
          plan = {
            narrative_status: "generating",
            sections_expected: only,
            sections_done: [],
          };
        } else {
          const { data, error } = await supabase.functions.invoke(FN_NAME[kind], { body: idBody });
          if (error || !data) {
            setRunning(false);
            return;
          }
          plan = data as PlanResponse;
        }

        setExpected(plan.sections_expected ?? []);
        setDone(plan.sections_done ?? []);

        const todo = (plan.sections_expected ?? []).filter(
          (s) => !(plan!.sections_done ?? []).includes(s),
        );
        const localFailed: string[] = [];

        for (const section of todo) {
          setCurrent(section);
          const delays = [0, 5000, 10000, 20000];
          let success = false;
          for (let attempt = 0; attempt < 4; attempt++) {
            if (delays[attempt] > 0) {
              await new Promise((r) => setTimeout(r, delays[attempt]));
            }
            try {
              const { data, error } = await supabase.functions.invoke(FN_NAME[kind], {
                body: { ...idBody, section_type: section },
              });
              if (error || !data) continue;
              const res = data as PlanResponse;
              setExpected(res.sections_expected ?? []);
              setDone(res.sections_done ?? []);
              await onSectionDoneRef.current?.();
              success = true;
              break;
            } catch {
              // retry
            }
          }
          if (!success) localFailed.push(section);
        }

        setCurrent(null);
        setFailed(localFailed);
      } finally {
        setRunning(false);
      }
    },
    [id, kind, context, includeCoach],
  );

  // Auto-run once per (id, context) when not complete. PTP re-runs on context change and
  // relies on the plan (todo) rather than a report-level status gate.
  useEffect(() => {
    if (!enabled || !id) return;
    if (kind !== "ptp") {
      if (!status || status === "complete") return;
    } else if (!context) {
      return;
    }
    const key = `${id}:${context ?? ""}`;
    if (startedRef.current === key) return;
    startedRef.current = key;
    void runLoop();
  }, [enabled, id, status, context, kind, runLoop]);

  const retry = useCallback(() => {
    if (failed.length === 0) return;
    void runLoop(failed);
  }, [failed, runLoop]);

  return { running, expected, done, failed, current, retry };
}
