import { supabase } from "@/integrations/supabase/client";

export type ThumbnailMeta = { url: string; dominantColor: string | null };

/**
 * Batch-resolves a list of thumbnail asset IDs to their public URL and
 * the precomputed dominant color stored on the parent content_assets row.
 *
 * Asset IDs without active, non-archived versions are omitted (callers
 * treat missing as "no thumbnail" and fall back to placeholder/gradient).
 *
 * Uses the public `lesson-thumbnails` bucket (and any other public bucket
 * referenced by the asset version row).
 */
export async function resolveThumbnailUrls(
  assetIds: string[],
): Promise<Map<string, ThumbnailMeta>> {
  if (assetIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("content_asset_versions")
    .select(
      "asset_id, bucket, path, content_assets!content_asset_versions_asset_id_fkey!inner(status, archived_at, dominant_color)",
    )
    .in("asset_id", assetIds)
    .is("archived_at", null)
    .eq("content_assets.status", "active");

  if (error || !data) return new Map();

  const result = new Map<string, ThumbnailMeta>();
  for (const row of data as Array<{
    asset_id: string;
    bucket: string;
    path: string;
    content_assets:
      | { dominant_color: string | null }
      | Array<{ dominant_color: string | null }>
      | null;
  }>) {
    const { data: pub } = supabase.storage.from(row.bucket).getPublicUrl(row.path);
    if (!pub?.publicUrl) continue;
    // PostgREST may return the embed as either an object or a single-element
    // array depending on the relationship form. Defensively unwrap both.
    const ca = Array.isArray(row.content_assets)
      ? row.content_assets[0]
      : row.content_assets;
    result.set(row.asset_id, {
      url: pub.publicUrl,
      dominantColor: ca?.dominant_color ?? null,
    });
  }
  return result;
}
