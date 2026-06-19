import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploadField } from "@/components/super-admin/FileUploadField";
import { supabase } from "@/integrations/supabase/client";

type SourceType =
  | "supabase_storage"
  | "mux"
  | "vimeo"
  | "youtube_unlisted"
  | "content_item";

interface Props {
  value: {
    asset_id: string | null;
    source_type: SourceType;
    source_id: string | null;
    title: string | null;
    background_color?: string | null;
    padding?: string | null;
  };
  onConfigChange: (next: Props["value"]) => void;
  contentItemId?: string;
}

const SOURCE_LABELS: Record<SourceType, string> = {
  supabase_storage: "Upload to storage",
  mux: "Mux",
  vimeo: "Vimeo (unlisted recommended)",
  youtube_unlisted: "YouTube (unlisted recommended)",
  content_item: "Generated / library video",
};

const ID_LABELS: Record<Exclude<SourceType, "supabase_storage" | "content_item">, string> = {
  mux: "Mux playback ID",
  vimeo: "Vimeo ID",
  youtube_unlisted: "YouTube ID",
};

export function VideoEmbedBlockForm({
  value,
  onConfigChange,
  contentItemId,
}: Props) {
  const isStorage = value.source_type === "supabase_storage";
  const isContentItem = value.source_type === "content_item";

  const moduleIdQuery = useQuery({
    queryKey: ["video-embed-module-id", contentItemId],
    enabled: isContentItem && !!contentItemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("module_id")
        .eq("id", contentItemId!)
        .single();
      if (error) throw error;
      return (data as any)?.module_id as string | null;
    },
  });

  const moduleId = moduleIdQuery.data ?? null;

  const videosQuery = useQuery({
    queryKey: ["video-embed-options", moduleId, contentItemId ?? null],
    enabled: isContentItem && (!contentItemId || moduleIdQuery.isSuccess),
    queryFn: async () => {
      let q = supabase
        .from("content_items")
        .select("id, title, mux_status")
        .eq("item_type", "video")
        .is("archived_at", null)
        .order("title", { ascending: true });
      if (moduleId) q = q.eq("module_id", moduleId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string | null; mux_status: string | null }>;
    },
  });

  const selectedVideo = isContentItem
    ? videosQuery.data?.find((v) => v.id === value.source_id) ?? null
    : null;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Source</Label>
        <Select
          value={value.source_type}
          onValueChange={(v) => {
            const next = v as SourceType;
            onConfigChange({
              ...value,
              source_type: next,
              asset_id: next === "supabase_storage" ? value.asset_id : null,
              source_id: next === "supabase_storage" ? null : value.source_id,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SOURCE_LABELS) as SourceType[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SOURCE_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isStorage ? (
        <div className="space-y-2">
          <Label>Video file *</Label>
          <FileUploadField
            assetKind="video"
            contentItemId={contentItemId ?? null}
            refField="video_asset"
            value={value.asset_id}
            onChange={(newAssetId) =>
              onConfigChange({ ...value, asset_id: newAssetId, source_id: null })
            }
          />
        </div>
      ) : isContentItem ? (
        <div className="space-y-2">
          <Label>Video content item</Label>
          <Select
            value={value.source_id ?? ""}
            onValueChange={(v) =>
              onConfigChange({ ...value, source_id: v || null, asset_id: null })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={videosQuery.isLoading ? "Loading…" : "Choose a video"} />
            </SelectTrigger>
            <SelectContent>
              {(videosQuery.data ?? []).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.title || "(untitled video)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedVideo && (
            <p className="text-xs text-muted-foreground">
              Status: {selectedVideo.mux_status === "ready" ? "ready" : "still processing"}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Only videos in this lesson's module are listed, so every enrolled learner can play
            them. Generate a video from a video content item first if the list is empty.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>{ID_LABELS[value.source_type as Exclude<SourceType, "supabase_storage" | "content_item">]}</Label>
          <Input
            value={value.source_id ?? ""}
            onChange={(e) =>
              onConfigChange({
                ...value,
                source_id: e.target.value || null,
                asset_id: null,
              })
            }
            placeholder="Paste the video ID"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Video title (optional)</Label>
        <Input
          value={value.title ?? ""}
          onChange={(e) =>
            onConfigChange({ ...value, title: e.target.value || null })
          }
        />
      </div>
    </div>
  );
}
