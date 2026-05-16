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

  const visit = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    // Heuristic: walk arbitrary object shape, identifying completed/certified entries.
    const status = node.status ?? node.completion_status;
    const name = node.name ?? node.title ?? "";

    if (node.content_item_id && status === "completed") {
      content_items.add(String(node.content_item_id));
    }
    if (node.module_id && status === "completed") {
      modules.set(String(node.module_id), name || "this module");
    }
    if (node.curriculum_id && status === "completed") {
      curricula.set(String(node.curriculum_id), name || "this curriculum");
    }
    if (
      node.certification_path_id &&
      (status === "certified" || status === "completed")
    ) {
      certifications.set(
        String(node.certification_path_id),
        name || "this certification",
      );
    }

    for (const k of Object.keys(node)) visit(node[k]);
  };

  visit(snapshot);
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
