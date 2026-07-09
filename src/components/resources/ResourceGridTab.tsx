import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Folder, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tile } from "@/components/tile/Tile";
import { useResourceAccessLog } from "@/hooks/useResourceAccessLog";
import { isSafeHttpUrl } from "@/lib/safeUrl";

import { resolveTierThumbnailUrls } from "@/lib/assetUrls";
import UpgradeNudgeModal from "./UpgradeNudgeModal";
import type { Resource, ResourceFolder, ResourceTab, UpgradeEntityType } from "./types";

interface ResourceGridTabProps {
  tab: ResourceTab;
  emptyStateText: string;
  showAllAtRoot?: boolean;
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

function groupByContentType(items: Resource[]): Map<Resource["content_type"], Resource[]> {
  const map = new Map<Resource["content_type"], Resource[]>();
  for (const r of items) {
    const arr = map.get(r.content_type) ?? [];
    arr.push(r);
    map.set(r.content_type, arr);
  }
  return map;
}

export default function ResourceGridTab({ tab, emptyStateText, showAllAtRoot = false }: ResourceGridTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const logAccess = useResourceAccessLog();
  const [search, setSearch] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [upgradeState, setUpgradeState] = useState<{
    open: boolean;
    entityType: UpgradeEntityType | null;
    entityName: string | null;
  }>({ open: false, entityType: null, entityName: null });

  const resources = tab.resources ?? [];
  const folders = tab.folders ?? [];

  useEffect(() => {
    setCurrentFolderId(null);
  }, [tab.tab_id]);

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

  // -------- Search path (flattened across the whole tab) --------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter((r) => {
      const hay = `${r.title} ${r.summary ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [resources, search]);

  const grouped = useMemo(() => groupByContentType(filtered), [filtered]);

  // -------- Folder path (only used when search is empty) --------
  const folderById = useMemo(
    () => new Map<string, ResourceFolder>(folders.map((f) => [f.folder_id, f])),
    [folders],
  );

  const effectiveFolderId = (r: Resource): string | null =>
    r.folder_id != null && folderById.has(r.folder_id) ? r.folder_id : null;

  const childrenOf = (parentId: string | null): ResourceFolder[] =>
    folders
      .filter((f) => f.parent_folder_id === parentId)
      .sort(
        (a, b) =>
          a.display_order - b.display_order || a.name.localeCompare(b.name),
      );

  const subtreeResourceCount = (folderId: string): number => {
    let count = 0;
    for (const r of resources) {
      if (effectiveFolderId(r) === folderId) count += 1;
    }
    for (const child of folders.filter((f) => f.parent_folder_id === folderId)) {
      count += subtreeResourceCount(child.folder_id);
    }
    return count;
  };

  const breadcrumbs = useMemo<ResourceFolder[]>(() => {
    if (!currentFolderId) return [];
    const chain: ResourceFolder[] = [];
    let cursor: string | null = currentFolderId;
    const guard = new Set<string>();
    while (cursor) {
      if (guard.has(cursor)) break;
      guard.add(cursor);
      const node = folderById.get(cursor);
      if (!node) break;
      chain.push(node);
      cursor = node.parent_folder_id;
    }
    return chain.reverse();
  }, [currentFolderId, folderById]);

  const levelResources = useMemo(
    () =>
      showAllAtRoot && currentFolderId === null
        ? resources
        : resources.filter((r) => effectiveFolderId(r) === currentFolderId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resources, currentFolderId, folderById, showAllAtRoot],
  );
  const levelGrouped = useMemo(() => groupByContentType(levelResources), [levelResources]);
  const levelSubfolders = childrenOf(currentFolderId);

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

  const isSearching = search.trim().length > 0;
  const anyMatches = filtered.length > 0;

  const renderResourceGrid = (items: Resource[]) => (
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
  );

  const renderGroupedSections = (map: Map<Resource["content_type"], Resource[]>) =>
    GROUP_ORDER.map((ct) => {
      const items = map.get(ct);
      if (!items || items.length === 0) return null;
      return (
        <section key={ct} className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            {CONTENT_TYPE_GROUP_LABELS[ct]}
          </h2>
          {renderResourceGrid(items)}
        </section>
      );
    });

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources…"
          aria-label="Search resources"
          className="pl-9"
        />
      </div>

      {isSearching ? (
        <>
          <p className="text-xs text-muted-foreground">
            Showing all matches in {tab.name}.
          </p>
          {!anyMatches ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No resources match your search.
            </div>
          ) : (
            renderGroupedSections(grouped)
          )}
        </>
      ) : (
        <>
          {breadcrumbs.length > 0 && (
            <nav
              aria-label="Folder breadcrumb"
              className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
            >
              <button
                type="button"
                onClick={() => setCurrentFolderId(null)}
                className="hover:text-foreground hover:underline"
              >
                All
              </button>
              {breadcrumbs.map((f, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <span key={f.folder_id} className="flex items-center gap-1">
                    <ChevronRight className="h-3.5 w-3.5" />
                    {isLast ? (
                      <span className="text-foreground font-medium">{f.name}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentFolderId(f.folder_id)}
                        className="hover:text-foreground hover:underline"
                      >
                        {f.name}
                      </button>
                    )}
                  </span>
                );
              })}
            </nav>
          )}

          {levelSubfolders.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {levelSubfolders.map((f) => {
                const count = subtreeResourceCount(f.folder_id);
                return (
                  <button
                    key={f.folder_id}
                    type="button"
                    onClick={() => setCurrentFolderId(f.folder_id)}
                    className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20"
                  >
                    <Folder className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {f.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {count} {count === 1 ? "item" : "items"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {levelResources.length > 0 ? (
            renderGroupedSections(levelGrouped)
          ) : currentFolderId !== null && levelSubfolders.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              This folder is empty.
            </div>
          ) : null}
        </>
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
