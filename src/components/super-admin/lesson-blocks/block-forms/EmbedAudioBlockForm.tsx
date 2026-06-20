import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadField } from "@/components/super-admin/FileUploadField";
import { Button } from "@/components/ui/button";

interface Props {
  value: { asset_id: string | null; transcript: string | null; script?: string | null; voiceover_kind?: string | null };
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
      {typeof value.script === "string" && value.script.trim().length > 0 && (
        <div className="space-y-2">
          <Label>Narration script (AI voiceover)</Label>
          <Textarea
            value={value.script ?? ""}
            rows={5}
            onChange={(e) =>
              onConfigChange({ ...value, script: e.target.value || null })
            }
            placeholder="The narration the AI voice will speak"
          />
          {value.asset_id ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-dashed p-2">
              <span className="text-xs text-muted-foreground">
                Audio already generated. Edit the script, then clear the audio to re-generate it
                from the AI voiceover panel.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onConfigChange({
                    ...value,
                    asset_id: null,
                    transcript: value.script ?? value.transcript,
                  })
                }
              >
                Clear audio
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No audio yet. Generate it from the AI voiceover panel.
            </p>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label>Audio file *</Label>
        <FileUploadField
          assetKind="audio"
          contentItemId={contentItemId ?? null}
          refField="embed_audio_asset"
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
