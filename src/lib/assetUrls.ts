import { supabase } from "@/integrations/supabase/client";

/**
 * Batch-resolves a list of thumbnail asset IDs to their public URLs.
 * Returns a Map of asset_id -> public URL. Asset IDs without active versions
 * are omitted (caller treats missing as no-thumbnail).
 *
 * Uses the public `lesson-thumbnails` bucket (and any other public bucket
 * referenced by the asset version row).
 */
export async function resolveThumbnailUrls(
  assetIds: string[],
): Promise<Map<string, string>> {
  if (assetIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("content_asset_versions")
    .select("asset_id, bucket, path, content_assets!content_asset_versions_asset_id_fkey!inner(status, archived_at)")
    .in("asset_id", assetIds)
    .is("archived_at", null)
    .eq("content_assets.status", "active");

  if (error || !data) return new Map();

  const result = new Map<string, string>();
  for (const row of data as Array<{ asset_id: string; bucket: string; path: string }>) {
    const { data: pub } = supabase.storage.from(row.bucket).getPublicUrl(row.path);
    if (pub?.publicUrl) result.set(row.asset_id, pub.publicUrl);
  }
  return result;
}
