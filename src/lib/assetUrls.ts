import { supabase } from "@/integrations/supabase/client";

export type ThumbnailMeta = { url: string; dominantColor: string | null };

/**
 * Batch-resolves a list of thumbnail asset IDs to their public URL and
 * the precomputed dominant color stored on the parent content_assets row.
 *
 * Asset IDs without active, non-archived versions are omitted (callers
 * treat missing as "no thumbnail" and fall back to placeholder/gradient).
 *
 * NOTE: This goes through the standard content_assets / content_asset_versions
 * RLS chain, which requires the asset to be referenced from a content_item
 * accessible to the caller. For tier-level (cert_path / curriculum / module /
 * resource) thumbnails, use `resolveTierThumbnailUrls` /
 * `resolveTierThumbnailRows` instead — they route through a SECURITY DEFINER
 * RPC that bypasses the content_items-rooted RLS chain.
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

// ---------------------------------------------------------------------------
// Tier-thumbnail resolver (cert_path / curriculum / module / resource)
// ---------------------------------------------------------------------------

export type TierEntityType = "cert_path" | "curriculum" | "module" | "resource";

interface TierThumbnailRow {
  entity_id: string;
  asset_id: string;
  bucket: string;
  path: string;
  dominant_color: string | null;
}

/**
 * Returns Map<entity_id, ThumbnailMeta> for tier entities the caller can
 * access. Backed by the SECURITY DEFINER RPC
 * `get_thumbnail_urls_for_entities`, which performs its own access check so
 * trainees can read thumbnails on published cert paths / curricula / modules
 * without tripping the content_items-rooted RLS chain on `content_assets`.
 *
 * Entities without an accessible thumbnail are absent from the Map; callers
 * fall back to a placeholder/gradient.
 */
export async function resolveTierThumbnailRows(
  entityType: TierEntityType,
  entityIds: string[],
): Promise<Map<string, ThumbnailMeta>> {
  if (entityIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc(
    "get_thumbnail_urls_for_entities" as never,
    {
      p_entity_type: entityType,
      p_entity_ids: entityIds,
    } as never,
  );

  if (error) {
    console.error("resolveTierThumbnailRows failed", { entityType, error });
    return new Map();
  }

  const rows = (data ?? []) as TierThumbnailRow[];
  const result = new Map<string, ThumbnailMeta>();
  for (const row of rows) {
    if (!row?.bucket || !row?.path) continue;
    const { data: pub } = supabase.storage.from(row.bucket).getPublicUrl(row.path);
    if (!pub?.publicUrl) continue;
    result.set(row.entity_id, {
      url: pub.publicUrl,
      dominantColor: row.dominant_color ?? null,
    });
  }
  return result;
}

/**
 * URL-only convenience wrapper around `resolveTierThumbnailRows`. Most tile
 * grids don't need the dominant color.
 */
export async function resolveTierThumbnailUrls(
  entityType: TierEntityType,
  entityIds: string[],
): Promise<Map<string, string>> {
  const rows = await resolveTierThumbnailRows(entityType, entityIds);
  const out = new Map<string, string>();
  for (const [id, meta] of rows.entries()) out.set(id, meta.url);
  return out;
}
