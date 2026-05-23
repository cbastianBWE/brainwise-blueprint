/**
 * Resolve a newsletter image asset_id to a public URL.
 *
 * Joins content_assets → content_asset_versions (current version) to get
 * the storage path, then calls supabase.storage.from(bucket).getPublicUrl().
 * Cached in a module-level Map to avoid refetching across NodeView remounts
 * (e.g. when the same image appears multiple times or after a doc save).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const urlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

async function resolve(assetId: string): Promise<string | null> {
  if (urlCache.has(assetId)) return urlCache.get(assetId) ?? null;
  const existing = inflight.get(assetId);
  if (existing) return existing;

  const p = (async () => {
    const { data, error } = await supabase
      .from("content_assets")
      .select(
        `id, current_version:content_asset_versions!current_version_id(bucket, path)`,
      )
      .eq("id", assetId)
      .maybeSingle();
    if (error || !data?.current_version) return null;
    const { bucket, path } = data.current_version as {
      bucket: string;
      path: string;
    };
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const url = pub?.publicUrl ?? null;
    if (url) urlCache.set(assetId, url);
    return url;
  })();

  inflight.set(assetId, p);
  try {
    return await p;
  } finally {
    inflight.delete(assetId);
  }
}

export function useNewsletterImageUrl(assetId: string | null | undefined): {
  url: string | null;
  loading: boolean;
} {
  const [url, setUrl] = useState<string | null>(() =>
    assetId ? urlCache.get(assetId) ?? null : null,
  );
  const [loading, setLoading] = useState<boolean>(
    !!assetId && !urlCache.has(assetId),
  );

  useEffect(() => {
    if (!assetId) {
      setUrl(null);
      setLoading(false);
      return;
    }
    const cached = urlCache.get(assetId);
    if (cached) {
      setUrl(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    resolve(assetId).then((u) => {
      if (cancelled) return;
      setUrl(u);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return { url, loading };
}

export function invalidateNewsletterImageUrl(assetId: string): void {
  urlCache.delete(assetId);
}
