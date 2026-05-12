import { Label } from "@/components/ui/label";
import { BrandColorSwatch } from "../BrandColorSwatch";

interface Props {
  value: { color?: string | null };
  onConfigChange: (next: { color?: string | null }) => void;
}

export function DividerBlockForm({ value, onConfigChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Divider color</Label>
        <BrandColorSwatch
          value={value?.color ?? "#021F36"}
          onChange={(hex) => onConfigChange({ ...value, color: hex })}
        />
        <p className="text-xs text-muted-foreground">
          Choose a brand color for this divider. Defaults to Navy.
        </p>
      </div>
    </div>
  );
}
