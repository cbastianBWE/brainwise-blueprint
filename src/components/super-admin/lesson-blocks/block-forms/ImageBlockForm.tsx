import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileUploadField } from "@/components/super-admin/FileUploadField";

interface Props {
  value: { asset_id: string | null; alt: string; caption: string | null };
  onConfigChange: (next: {
    asset_id: string | null;
    alt: string;
    caption: string | null;
  }) => void;
  contentItemId?: string;
}

export function ImageBlockForm({ value, onConfigChange, contentItemId }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Image *</Label>
        <FileUploadField
          assetKind="image"
          contentItemId={contentItemId ?? null}
          refField="image_asset"
          value={value.asset_id}
          onChange={(newAssetId) =>
            onConfigChange({ ...value, asset_id: newAssetId })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Alt text *</Label>
        <Input
          value={value.alt ?? ""}
          onChange={(e) => onConfigChange({ ...value, alt: e.target.value })}
          placeholder="Describe the image for screen readers"
        />
        <p className="text-xs text-muted-foreground">
          Required for accessibility.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Caption (optional)</Label>
        <Input
          value={value.caption ?? ""}
          onChange={(e) =>
            onConfigChange({ ...value, caption: e.target.value || null })
          }
          placeholder="Caption shown below the image"
        />
      </div>
    </div>
  );
}
