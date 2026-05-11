import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Image as ImageIcon, Video, Music, FileText, FileSpreadsheet, Presentation, Loader2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AssetKind = "image" | "video" | "audio" | "document";

interface AssetLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetKind: AssetKind;
  onPick: (assetId: string) => void;
}

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

export function AssetLibraryPicker({ open, onOpenChange, assetKind, onPick }: AssetLibraryPickerProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedTags([]);
      setSearchText("");
      setSelectedAssetId(null);
    }
  }, [open]);

  const { data: allTags } = useQuery({
    queryKey: ["library_tags", assetKind],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_assets")
        .select("library_tags")
        .eq("is_library_asset", true)
        .eq("status", "active")
        .eq("asset_kind", assetKind);
      if (error) throw error;
      const tagSet = new Set<string>();
      for (const row of (data ?? []) as Array<{ library_tags: string[] | null }>) {
        for (const t of row.library_tags ?? []) tagSet.add(t);
      }
      return Array.from(tagSet).sort();
    },
  });

  const { data: libraryAssets, isLoading } = useQuery({
    queryKey: ["library_assets", assetKind, selectedTags, searchText],
    enabled: open,
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
        .eq("status", "active")
        .eq("asset_kind", assetKind);
      if (searchText.trim()) q = q.ilike("library_name", `%${searchText.trim()}%`);
      if (selectedTags.length > 0) q = q.contains("library_tags", selectedTags);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  function toggleTag(t: string) {
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function clearFilters() {
    setSelectedTags([]);
    setSearchText("");
  }

  const hasFilters = selectedTags.length > 0 || searchText.trim().length > 0;

  function handleInsert() {
    if (!selectedAssetId) return;
    onPick(selectedAssetId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pick an asset from the library — {assetKind}s</DialogTitle>
          <DialogDescription>
            Reusable {assetKind}s previously promoted to the library. Selecting one creates a new reference at this location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 border-b pb-3">
          <Input
            placeholder="Search by library name…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
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
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (libraryAssets ?? []).length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">
                No matching library assets. Upload a new one or adjust filters.
              </p>
              <Button variant="link" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(libraryAssets ?? []).map((a) => {
                const ver = a.current_version;
                const filename = ver?.original_filename ?? "";
                const isSelected = selectedAssetId === a.id;
                let thumb;
                if (assetKind === "image" && ver) {
                  thumb = <ImageThumb bucket={ver.bucket} path={ver.path} />;
                } else if (assetKind === "video") {
                  thumb = (
                    <div className="aspect-video rounded-md bg-muted flex items-center justify-center">
                      <Video className="h-10 w-10 text-muted-foreground" />
                    </div>
                  );
                } else if (assetKind === "audio") {
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
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAssetId(a.id)}
                    className={cn(
                      "text-left rounded-md border p-2 cursor-pointer transition-all hover:ring-1 hover:ring-[#006D77]/40",
                      isSelected && "ring-2 ring-[#006D77]",
                    )}
                  >
                    {thumb}
                    <div className="mt-2 space-y-1">
                      <div className="text-sm font-medium truncate">{a.library_name ?? filename}</div>
                      {(a.library_tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(a.library_tags as string[]).slice(0, 4).map((t) => (
                            <span key={t} className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {ver?.size_bytes ? formatBytes(ver.size_bytes) : ""}
                        {ver?.mime_type ? ` · ${ver.mime_type.split("/")[1]?.toUpperCase()}` : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleInsert} disabled={!selectedAssetId}>Insert this asset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssetLibraryPicker;
