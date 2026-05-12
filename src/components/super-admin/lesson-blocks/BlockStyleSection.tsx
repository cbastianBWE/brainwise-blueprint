import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandColorSwatch } from "./BrandColorSwatch";

export type BlockPadding = "none" | "small" | "medium" | "large";

interface Props {
  value: Record<string, unknown>;
  onConfigChange: (next: Record<string, unknown>) => void;
}

const PADDING_OPTIONS: { value: BlockPadding; label: string }[] = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

export function BlockStyleSection({ value, onConfigChange }: Props) {
  const bg = (value.background_color as string | null | undefined) ?? null;
  const padding = (value.padding as BlockPadding | undefined) ?? "none";

  return (
    <div className="space-y-4 border-t pt-4">
      <div
        className="font-display text-sm font-semibold tracking-tight"
        style={{ color: "#021F36" }}
      >
        Style
      </div>

      <div className="space-y-2">
        <Label>Background color</Label>
        <BrandColorSwatch
          value={bg}
          palette="tints"
          allowDefault
          onChange={(hex) =>
            onConfigChange({ ...value, background_color: hex })
          }
          onDefaultSelected={() =>
            onConfigChange({ ...value, background_color: null })
          }
        />
        <p className="text-xs text-muted-foreground">
          Apply a tinted brand color to differentiate this block. Default leaves the block transparent.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Padding</Label>
        <Select
          value={padding}
          onValueChange={(v) =>
            onConfigChange({ ...value, padding: v as BlockPadding })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PADDING_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Vertical breathing room above and below the block.
        </p>
      </div>
    </div>
  );
}
