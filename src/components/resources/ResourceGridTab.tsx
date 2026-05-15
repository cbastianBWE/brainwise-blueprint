import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tile } from "@/components/tile/Tile";
import { useResourceAccessLog } from "@/hooks/useResourceAccessLog";
import { resolveThumbnailUrls } from "@/lib/assetUrls";
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

  const assetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of resources) {
      if (r.thumbnail_asset_id) ids.add(r.thumbnail_asset_id);
    }
    return Array.from(ids).sort();
  }, [resources]);

  const { data: thumbnailMap } = useQuery({
    queryKey: ["thumbnail-urls", assetIds],
    queryFn: () => resolveThumbnailUrls(assetIds),
    enabled: assetIds.length > 0,
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
    const { data, error } = await supabase.functions.invoke("get-resource-signed-url", {
      body: { p_resource_id: resource.resource_id },
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
  };

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
      void handleFileDownload(resource);
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
                    thumbnailUrl={
                      r.thumbnail_asset_id
                        ? thumbnailMap?.get(r.thumbnail_asset_id) ?? null
                        : null
                    }
                    contentType={r.content_type}
                    locked={!r.is_accessible}
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
