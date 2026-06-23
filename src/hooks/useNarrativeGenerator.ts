import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Kind = "team" | "paired";

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
};

const ID_KEY: Record<Kind, string> = {
  team: "team_profile_id",
  paired: "paired_profile_id",
};

export function useNarrativeGenerator({
  kind,
  id,
  status,
  onSectionDone,
  enabled = true,
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
        const idBody = { [ID_KEY[kind]]: id };
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
          try {
            const { data, error } = await supabase.functions.invoke(FN_NAME[kind], {
              body: { ...idBody, section_type: section },
            });
            if (error || !data) {
              localFailed.push(section);
              continue;
            }
            const res = data as PlanResponse;
            setExpected(res.sections_expected ?? []);
            setDone(res.sections_done ?? []);
            await onSectionDoneRef.current?.();
          } catch {
            localFailed.push(section);
          }
        }

        setCurrent(null);
        setFailed(localFailed);
      } finally {
        setRunning(false);
      }
    },
    [id, kind],
  );

  // Auto-run once per id when not complete.
  useEffect(() => {
    if (!enabled || !id || !status) return;
    if (status === "complete") return;
    if (startedRef.current === id) return;
    startedRef.current = id;
    void runLoop();
  }, [enabled, id, status, runLoop]);

  const retry = useCallback(() => {
    if (failed.length === 0) return;
    void runLoop(failed);
  }, [failed, runLoop]);

  return { running, expected, done, failed, current, retry };
}
