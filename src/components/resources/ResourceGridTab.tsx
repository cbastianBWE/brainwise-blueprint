import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tile } from "@/components/tile/Tile";
import { useResourceAccessLog } from "@/hooks/useResourceAccessLog";
import { resolveTierThumbnailUrls } from "@/lib/assetUrls";
import UpgradeNudgeModal from "./UpgradeNudgeModal";
import type { Resource, ResourceTab, UpgradeEntityType } from "./types";

interface ResourceGridTabProps {
  tab: ResourceTab;
  emptyStateText: string;
}

const GROUP_ORDER: Resource["content_type"][] = [
  "video",
  "guide",
  "article",
  "worksheet",
  "template",
];

const CONTENT_TYPE_GROUP_LABELS: Record<Resource["content_type"], string> = {
  video: "Videos",
  guide: "Guides",
  article: "Articles",
  worksheet: "Worksheets",
  template: "Templates",
};

export default function ResourceGridTab({ tab, emptyStateText }: ResourceGridTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const logAccess = useResourceAccessLog();
  const [search, setSearch] = useState("");
  const [upgradeState, setUpgradeState] = useState<{
    open: boolean;
    entityType: UpgradeEntityType | null;
    entityName: string | null;
  }>({ open: false, entityType: null, entityName: null });

  const resources = tab.resources ?? [];

  // Resource thumbnails route through the SECURITY DEFINER tier RPC keyed
  // by resource_id, not asset_id, so trainees can read thumbnails on
  // resources gated by their own access rules.
  const resourceIds = useMemo(
    () =>
      Array.from(
        new Set(
          resources
            .filter((r) => r.thumbnail_asset_id)
            .map((r) => r.resource_id),
        ),
      ).sort(),
    [resources],
  );

  const { data: thumbnailMap } = useQuery({
    queryKey: ["tier-thumb", "resource", resourceIds],
    queryFn: () => resolveTierThumbnailUrls("resource", resourceIds),
    enabled: resourceIds.length > 0,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter((r) => {
      const hay = `${r.title} ${r.summary ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [resources, search]);

  const grouped = useMemo(() => {
    const map = new Map<Resource["content_type"], Resource[]>();
    for (const r of filtered) {
      const arr = map.get(r.content_type) ?? [];
      arr.push(r);
      map.set(r.content_type, arr);
    }
    return map;
  }, [filtered]);

  const handleFileDownload = async (resource: Resource) => {
    try {
      const { data, error } = await supabase.functions.invoke("get-resource-signed-url", {
        body: { p_resource_id: resource.resource_id, as_attachment: true },
      });
      if (error || !data?.signed_url) {
        toast({
          title: "Could not download",
          description: data?.error || error?.message || "Content not available.",
          variant: "destructive",
        });
        return;
      }
      window.open(data.signed_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({
        title: "Could not download",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // Resource click routing, ordered by precedence:
  //   1. Locked (!is_accessible)                                 → UpgradeNudgeModal (no navigation)
  //   2. Has content_asset_id + content_type === "video"         → reader page (signed-URL video player)
  //   3. Has content_asset_id (non-video)                        → file download (signed URL, new tab)
  //   4. url_kind === "external_link" + url_or_content present   → window.open (external URL, new tab)
  //   5. Inline content (article HTML, etc.)                     → reader page
  const handleResourceClick = (resource: Resource) => {
    if (!resource.is_accessible) {
      setUpgradeState({
        open: true,
        entityType: resource.content_type,
        entityName: resource.title,
      });
      return;
    }
    logAccess(resource.resource_id);
    if (resource.content_asset_id != null) {
      if (resource.content_type === "video") {
        navigate(`/resources/${resource.resource_id}`);
      } else {
        void handleFileDownload(resource);
      }
    } else if (resource.url_kind === "external_link" && resource.url_or_content) {
      window.open(resource.url_or_content, "_blank", "noopener,noreferrer");
    } else {
      navigate(`/resources/${resource.resource_id}`);
    }
  };

  if (resources.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyStateText}
      </div>
    );
  }

  const anyMatches = filtered.length > 0;

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources…"
          className="pl-9"
        />
      </div>

      {!anyMatches ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No resources match your search.
        </div>
      ) : (
        GROUP_ORDER.map((ct) => {
          const items = grouped.get(ct);
          if (!items || items.length === 0) return null;
          return (
            <section key={ct} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                {CONTENT_TYPE_GROUP_LABELS[ct]}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((r) => (
                  <Tile
                    key={r.resource_id}
                    variant="resource"
                    name={r.title}
                    summary={r.summary}
                    thumbnailUrl={thumbnailMap?.get(r.resource_id) ?? null}
                    contentType={r.content_type}
                    locked={!r.is_accessible}
                    externalLink={
                      r.url_kind === "external_link" &&
                      r.content_asset_id == null &&
                      !!r.url_or_content
                    }
                    onClick={() => handleResourceClick(r)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      <UpgradeNudgeModal
        open={upgradeState.open}
        onOpenChange={(open) =>
          setUpgradeState((s) => ({ ...s, open }))
        }
        entityType={upgradeState.entityType}
        entityName={upgradeState.entityName}
      />
    </div>
  );
}
