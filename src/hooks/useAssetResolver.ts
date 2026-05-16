import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { resolveThumbnailUrls } from "@/lib/assetUrls";

/**
 * Resolves a list of content asset IDs to public URLs.
 * Thin wrapper around `resolveThumbnailUrls` so callers get a consistent
 * React Query-backed map + loading state.
 */
export function useAssetResolver(assetIds: (string | null | undefined)[]) {
  const ids = useMemo(
    () =>
      Array.from(
        new Set(assetIds.filter((x): x is string => typeof x === "string" && x.length > 0)),
      ).sort(),
    [assetIds],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["asset-urls", ids],
    queryFn: () => resolveThumbnailUrls(ids),
    enabled: ids.length > 0,
  });

  const urls = useMemo(() => {
    const out: Record<string, string> = {};
    if (data) for (const [k, v] of data.entries()) out[k] = v;
    return out;
  }, [data]);

  return { urls, isLoading };
}
