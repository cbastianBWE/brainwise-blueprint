import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Trainee-facing quiz asset resolver.
 *
 * SCORM/API export seam: viewers must never call supabase.storage or
 * createSignedUrl directly. They go through this hook, which calls the
 * `get-quiz-asset-urls` Edge Function and returns a map of
 * asset_id → signed URL.
 */
export function useQuizAssets(contentItemId: string | undefined): {
  urlMap: Map<string, string>;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["quiz-assets", contentItemId],
    enabled: !!contentItemId,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-quiz-asset-urls",
        { body: { p_content_item_id: contentItemId } },
      );
      if (error) throw error;
      const assets = (data?.assets as Array<{
        asset_id: string;
        signed_url: string | null;
      }>) ?? [];
      const map = new Map<string, string>();
      for (const a of assets) {
        if (a?.asset_id && a.signed_url) map.set(a.asset_id, a.signed_url);
      }
      return map;
    },
  });

  return {
    urlMap: (data as Map<string, string> | undefined) ?? new Map(),
    isLoading: !!contentItemId && isLoading,
  };
}
