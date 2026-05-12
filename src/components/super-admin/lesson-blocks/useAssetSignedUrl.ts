import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAssetSignedUrl(
  assetId: string | null,
  enabled: boolean,
): { signedUrl: string | null; isLoading: boolean } {
  const active = !!enabled && !!assetId;

  const { data, isLoading } = useQuery({
    queryKey: ["lesson-block-asset-url", assetId],
    enabled: active,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (!assetId) return null;
      const { data: asset, error } = await supabase
        .from("content_assets")
        .select("current_version_id, content_asset_versions!current_version_id ( bucket, path )")
        .eq("id", assetId)
        .maybeSingle();
      if (error) throw error;
      const ver: any = (asset as any)?.content_asset_versions;
      if (!ver?.bucket || !ver?.path) return null;
      const { data: signed, error: sErr } = await supabase.storage
        .from(ver.bucket)
        .createSignedUrl(ver.path, 3600);
      if (sErr) throw sErr;
      return signed?.signedUrl ?? null;
    },
  });

  return { signedUrl: (data as string | null) ?? null, isLoading: active && isLoading };
}
