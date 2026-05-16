import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CascadeTier = "content_item" | "module" | "curriculum" | "certification";

export interface CascadeResult {
  tier: CascadeTier;
  entityName: string;
}

interface Options {
  userId: string;
  contentItemId: string;
}

interface ReportResult {
  ok: boolean;
  cascade: CascadeResult | null;
  error?: string;
  result?: unknown;
}

/**
 * Walks a learning-state snapshot and returns a set of stable keys per tier
 * that represent "completed" entities. We then diff before vs after to detect
 * the highest tier that transitioned.
 */
function collectCompleted(snapshot: any): {
  content_items: Set<string>;
  modules: Map<string, string>; // id -> name
  curricula: Map<string, string>;
  certifications: Map<string, string>;
} {
  const content_items = new Set<string>();
  const modules = new Map<string, string>();
  const curricula = new Map<string, string>();
  const certifications = new Map<string, string>();

  if (!snapshot || typeof snapshot !== "object") {
    return { content_items, modules, curricula, certifications };
  }

  const collectModule = (mod: any) => {
    if (!mod || typeof mod !== "object") return;
    if (mod.module_completion?.status === "completed" && mod.module_id) {
      modules.set(String(mod.module_id), mod.name ?? "this module");
    }
    for (const item of mod.items ?? []) {
      if (
        item?.completion?.status === "completed" &&
        item.content_item_id
      ) {
        content_items.add(String(item.content_item_id));
      }
    }
  };

  for (const a of snapshot.assignments ?? []) {
    if (!a || typeof a !== "object") continue;
    const curriculumDone =
      a.assignment_status === "completed" ||
      (!a.assignment_status && a.status_group === "completed");
    if (curriculumDone && a.curriculum_id) {
      curricula.set(
        String(a.curriculum_id),
        a.curriculum?.name ?? "this curriculum",
      );
    }
    for (const m of a.modules ?? []) collectModule(m);
  }

  for (const ma of snapshot.module_assignments ?? []) {
    collectModule(ma);
  }

  for (const c of snapshot.certifications ?? []) {
    if (!c || typeof c !== "object") continue;
    if (
      (c.status === "certified" || c.status === "completed") &&
      c.certification_id
    ) {
      certifications.set(
        String(c.certification_id),
        c.certification_type ?? "your certification",
      );
    }
  }

  return { content_items, modules, curricula, certifications };
}

async function fetchLearningState(userId: string): Promise<any> {
  try {
    const { data } = await supabase.rpc("get_user_learning_state" as never, {
      p_user_id: userId,
    } as never);
    return data ?? null;
  } catch {
    return null;
  }
}

export function useCompletionReporter({ userId, contentItemId }: Options) {
  const queryClient = useQueryClient();
  const [isReporting, setIsReporting] = useState(false);

  const reportCompletion = useCallback(
    async (
      rpcName: string,
      rpcArgs: Record<string, unknown>,
    ): Promise<ReportResult> => {
      setIsReporting(true);
      try {
        const before = await fetchLearningState(userId);

        const { data: rpcData, error } = await supabase.rpc(rpcName as never, rpcArgs as never);
        if (error) {
          return { ok: false, cascade: null, error: error.message };
        }

        const after = await fetchLearningState(userId);

        // Diff
        let cascade: CascadeResult | null = null;
        if (before && after) {
          const b = collectCompleted(before);
          const a = collectCompleted(after);

          const newCerts = [...a.certifications].filter(([k]) => !b.certifications.has(k));
          const newCurricula = [...a.curricula].filter(([k]) => !b.curricula.has(k));
          const newModules = [...a.modules].filter(([k]) => !b.modules.has(k));
          const newItems = [...a.content_items].filter((k) => !b.content_items.has(k));

          if (newCerts.length > 0) {
            cascade = { tier: "certification", entityName: newCerts[0][1] };
          } else if (newCurricula.length > 0) {
            cascade = { tier: "curriculum", entityName: newCurricula[0][1] };
          } else if (newModules.length > 0) {
            cascade = { tier: "module", entityName: newModules[0][1] };
          } else if (newItems.length > 0) {
            cascade = { tier: "content_item", entityName: "Item" };
          }
        }

        // Invalidate
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["content-item-viewer", contentItemId] }),
          queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] }),
          queryClient.invalidateQueries({ queryKey: ["get_module_detail"] }),
          queryClient.invalidateQueries({ queryKey: ["list_available_learning"] }),
        ]);

        return { ok: true, cascade, result: rpcData };
      } catch (e: any) {
        return { ok: false, cascade: null, error: e?.message ?? String(e) };
      } finally {
        setIsReporting(false);
      }
    },
    [userId, contentItemId, queryClient],
  );

  return { reportCompletion, isReporting };
}
