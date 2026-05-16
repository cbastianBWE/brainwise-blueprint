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

const KNOWN_TIERS: ReadonlySet<string> = new Set([
  "content_item",
  "module",
  "curriculum",
  "certification",
]);

export function mapRpcCascade(raw: any): CascadeResult | null {
  if (!raw || typeof raw !== "object") return null;
  const tier = raw.tier;
  if (typeof tier !== "string" || !KNOWN_TIERS.has(tier)) return null;
  return {
    tier: tier as CascadeTier,
    entityName: (raw.entity_name as string | null) ?? "this",
  };
}

export function useCompletionReporter({ userId: _userId, contentItemId }: Options) {
  const queryClient = useQueryClient();
  const [isReporting, setIsReporting] = useState(false);

  const reportCompletion = useCallback(
    async (
      rpcName: string,
      rpcArgs: Record<string, unknown>,
    ): Promise<ReportResult> => {
      setIsReporting(true);
      try {
        const { data, error } = await supabase.rpc(rpcName as never, rpcArgs as never);
        if (error) {
          return { ok: false, cascade: null, error: error.message };
        }

        const cascade = mapRpcCascade((data as any)?.cascade);

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["content-item-viewer", contentItemId] }),
          queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] }),
          queryClient.invalidateQueries({ queryKey: ["get_module_detail"] }),
          queryClient.invalidateQueries({ queryKey: ["list_available_learning"] }),
        ]);

        return { ok: true, cascade, result: data };
      } catch (e: any) {
        return { ok: false, cascade: null, error: e?.message ?? String(e) };
      } finally {
        setIsReporting(false);
      }
    },
    [contentItemId, queryClient],
  );

  // Lightweight progress writer for incremental updates (per-block progress,
  // furthest-position tracking, etc.). Does NOT invalidate queries, does NOT
  // map cascade, does NOT flip isReporting — it fires many times per lesson.
  const reportProgress = useCallback(
    async (
      rpcName: string,
      rpcArgs: Record<string, unknown>,
    ): Promise<{ ok: boolean; error?: string; result?: unknown }> => {
      try {
        const { data, error } = await supabase.rpc(rpcName as never, rpcArgs as never);
        if (error) return { ok: false, error: error.message };
        return { ok: true, result: data };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? String(e) };
      }
    },
    [],
  );

  return { reportCompletion, reportProgress, isReporting };
}
