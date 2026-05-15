import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the full public URL for a thumbnail in any storage bucket.
 *
 * For the lesson-thumbnails bucket (the standard target for all thumbnail uploads
 * starting Session 72), this URL is publicly fetchable with no auth — the bucket
 * has public SELECT RLS. Trainees, coaches, and even anonymous users can fetch it.
 *
 * For legacy thumbnails still living in lesson-assets (super-admin-only bucket),
 * this URL will 403 for non-super-admin users. Those legacy thumbnails need to
 * be re-uploaded by super admin through the existing authoring UI to land in the
 * new public bucket. The frontend treats 403 the same as "no thumbnail" and falls
 * back to the placeholder.
 *
 * @param bucket - the storage bucket name from content_asset_versions.bucket
 * @param path - the storage object path from content_asset_versions.path
 * @returns the absolute public URL, or null if either input is empty
 */
export function buildThumbnailUrl(
  bucket: string | null | undefined,
  path: string | null | undefined,
): string | null {
  if (!bucket || !path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
}
