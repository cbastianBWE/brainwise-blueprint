import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadField } from "@/components/super-admin/FileUploadField";

interface Props {
  value: { asset_id: string | null; transcript: string | null };
  onConfigChange: (next: Props["value"]) => void;
  contentItemId?: string;
}

export function EmbedAudioBlockForm({
  value,
  onConfigChange,
  contentItemId,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Audio file *</Label>
        <FileUploadField
          assetKind="audio"
          contentItemId={contentItemId ?? null}
          refField="audio_asset"
          value={value.asset_id}
          onChange={(newAssetId) =>
            onConfigChange({ ...value, asset_id: newAssetId })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Transcript (optional but recommended for accessibility)</Label>
        <Textarea
          value={value.transcript ?? ""}
          rows={4}
          onChange={(e) =>
            onConfigChange({
              ...value,
              transcript: e.target.value || null,
            })
          }
          placeholder="Paste a full text transcript of the audio"
        />
      </div>
    </div>
  );
}
