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

type SourceType = "supabase_storage" | "mux" | "vimeo" | "youtube_unlisted";

interface Props {
  value: {
    asset_id: string | null;
    source_type: SourceType;
    source_id: string | null;
    title: string | null;
  };
  onConfigChange: (next: Props["value"]) => void;
  contentItemId?: string;
}

const SOURCE_LABELS: Record<SourceType, string> = {
  supabase_storage: "Upload to storage",
  mux: "Mux",
  vimeo: "Vimeo (unlisted recommended)",
  youtube_unlisted: "YouTube (unlisted recommended)",
};

const ID_LABELS: Record<Exclude<SourceType, "supabase_storage">, string> = {
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
      ) : (
        <div className="space-y-2">
          <Label>{ID_LABELS[value.source_type as Exclude<SourceType, "supabase_storage">]}</Label>
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
