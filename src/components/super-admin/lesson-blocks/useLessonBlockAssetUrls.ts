import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLessonBlockAssetUrls(contentItemId: string | undefined): {
  urlMap: Map<string, string>;
  isLoading: boolean;
  registerNewAssetId: (assetId: string) => void;
} {
  const [extraIds, setExtraIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["lesson-block-asset-urls", contentItemId, extraIds.join(",")],
    enabled: !!contentItemId,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc(
        "get_lesson_block_assets" as any,
        {
          p_content_item_id: contentItemId,
          p_extra_asset_ids: extraIds.length ? extraIds : null,
        },
      );
      if (error) throw error;
      const list = (rows as any[]) ?? [];
      const map = new Map<string, string>();
      await Promise.all(
        list.map(async (r) => {
          try {
            const { data: signed } = await supabase.storage
              .from(r.out_bucket)
              .createSignedUrl(r.out_path, 3600);
            if (signed?.signedUrl) map.set(r.out_asset_id, signed.signedUrl);
          } catch {
            // skip
          }
        }),
      );
      return map;
    },
  });

  const registerNewAssetId = useCallback((assetId: string) => {
    if (!assetId) return;
    setExtraIds((prev) => (prev.includes(assetId) ? prev : [...prev, assetId]));
  }, []);

  return {
    urlMap: (data as Map<string, string> | undefined) ?? new Map(),
    isLoading: !!contentItemId && isLoading,
    registerNewAssetId,
  };
}
