import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Image as ImageIcon, Video, Music, FileText, FileSpreadsheet, Presentation, Loader2, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type AssetKind = "image" | "video" | "audio" | "document";
type Filter = "all" | AssetKind;

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function documentExtIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "xlsx") return FileSpreadsheet;
  if (ext === "pptx") return Presentation;
  return FileText;
}

function ImageThumb({ bucket, path }: { bucket: string; path: string }) {
  const { data: url } = useQuery({
    queryKey: ["asset_preview", bucket, path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 9 * 60 * 1000,
  });
  return (
    <div className="aspect-video rounded-md overflow-hidden bg-muted">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export default function AssetLibrary() {
  const [assetKindFilter, setAssetKindFilter] = useState<Filter>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");

  const { data: allTags } = useQuery({
    queryKey: ["all_library_tags", assetKindFilter],
    queryFn: async () => {
      let q = supabase
        .from("content_assets")
        .select("library_tags")
        .eq("is_library_asset", true)
        .eq("status", "active");
      if (assetKindFilter !== "all") q = q.eq("asset_kind", assetKindFilter);
      const { data, error } = await q;
      if (error) throw error;
      const tagSet = new Set<string>();
      for (const row of (data ?? []) as Array<{ library_tags: string[] | null }>) {
        for (const t of row.library_tags ?? []) tagSet.add(t);
      }
      return Array.from(tagSet).sort();
    },
  });

  const { data: libraryAssets, isLoading } = useQuery({
    queryKey: ["all_library_assets", assetKindFilter, selectedTags, searchText],
    queryFn: async () => {
      let q = supabase
        .from("content_assets")
        .select(`
          id, asset_kind, library_name, library_tags, created_at,
          current_version:content_asset_versions!current_version_id(
            id, bucket, path, mime_type, size_bytes, original_filename
          )
        `)
        .eq("is_library_asset", true)
        .eq("status", "active");
      if (assetKindFilter !== "all") q = q.eq("asset_kind", assetKindFilter);
      if (searchText.trim()) q = q.ilike("library_name", `%${searchText.trim()}%`);
      if (selectedTags.length > 0) q = q.contains("library_tags", selectedTags);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const assetIds = useMemo(() => (libraryAssets ?? []).map((a) => a.id), [libraryAssets]);

  // Separate query for active ref counts (client-side aggregation)
  const { data: refCounts } = useQuery({
    queryKey: ["library_asset_ref_counts", assetIds],
    enabled: assetIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_asset_refs")
        .select("asset_id")
        .in("asset_id", assetIds)
        .is("archived_at", null);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ asset_id: string }>) {
        map.set(row.asset_id, (map.get(row.asset_id) ?? 0) + 1);
      }
      return map;
    },
  });

  function toggleTag(t: string) {
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  const hasFilters = selectedTags.length > 0 || searchText.trim().length > 0;

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-7xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" style={{ color: "#021F36" }}>Asset Library</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Library assets are reusable across content items and lesson blocks. Updates to a library asset
          (new versions) propagate to every place it's used.
        </p>
      </div>

      <div className="space-y-4">
        <Tabs value={assetKindFilter} onValueChange={(v) => { setAssetKindFilter(v as Filter); setSelectedTags([]); }}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="image"><ImageIcon className="h-4 w-4" /> Images</TabsTrigger>
            <TabsTrigger value="video"><Video className="h-4 w-4" /> Videos</TabsTrigger>
            <TabsTrigger value="audio"><Music className="h-4 w-4" /> Audio</TabsTrigger>
            <TabsTrigger value="document"><FileText className="h-4 w-4" /> Documents</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by library name…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>

        {(allTags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(allTags ?? []).map((t) => {
              const selected = selectedTags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={cn(
                    "text-xs rounded-full px-3 py-1 transition-colors",
                    selected ? "bg-[#006D77] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {t}
                </button>
              );
            })}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSelectedTags([]); setSearchText(""); }} className="h-7 text-xs">
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (libraryAssets ?? []).length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No library assets match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(libraryAssets ?? []).map((a) => {
            const ver = a.current_version;
            const filename = ver?.original_filename ?? "";
            const count = refCounts?.get(a.id) ?? 0;
            let thumb;
            if (a.asset_kind === "image" && ver) {
              thumb = <ImageThumb bucket={ver.bucket} path={ver.path} />;
            } else if (a.asset_kind === "video") {
              thumb = (
                <div className="aspect-video rounded-md bg-muted flex items-center justify-center">
                  <Video className="h-10 w-10 text-muted-foreground" />
                </div>
              );
            } else if (a.asset_kind === "audio") {
              thumb = (
                <div className="aspect-video rounded-md bg-[#F9F7F1] flex items-center justify-center">
                  <Music className="h-10 w-10 text-[#006D77]" />
                </div>
              );
            } else {
              const DocIcon = documentExtIcon(filename);
              thumb = (
                <div className="aspect-video rounded-md bg-[#F9F7F1] flex items-center justify-center">
                  <DocIcon className="h-10 w-10 text-[#006D77]" />
                </div>
              );
            }
            return (
              <div key={a.id} className="rounded-md border p-3 space-y-2">
                {thumb}
                <div className="space-y-1">
                  <div className="text-sm font-medium truncate">{a.library_name ?? filename}</div>
                  <Badge variant="secondary" className="text-xs">
                    {count > 0 ? `Used in ${count} place${count === 1 ? "" : "s"}` : "Unused"}
                  </Badge>
                  {(a.library_tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(a.library_tags as string[]).slice(0, 5).map((t) => (
                        <span key={t} className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-1">
                    {ver?.size_bytes ? formatBytes(ver.size_bytes) : ""}
                    {ver?.mime_type ? ` · ${ver.mime_type.split("/")[1]?.toUpperCase()}` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
