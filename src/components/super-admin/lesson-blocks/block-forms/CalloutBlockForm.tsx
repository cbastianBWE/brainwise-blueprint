import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import { CALLOUT_COLORS, type TipTapDocJSON } from "../blockTypeMeta";

type Variant = "info" | "warning" | "success" | "important";

interface Props {
  value: { variant: Variant; body: TipTapDocJSON };
  onConfigChange: (next: Props["value"]) => void;
}

const VARIANTS: { value: Variant; label: string }[] = [
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "success", label: "Success" },
  { value: "important", label: "Important" },
];

export function CalloutBlockForm({ value, onConfigChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Variant</Label>
        <Select
          value={value.variant}
          onValueChange={(v) => onConfigChange({ ...value, variant: v as Variant })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VARIANTS.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded"
                    style={{ background: CALLOUT_COLORS[v.value] }}
                  />
                  {v.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Callout body</Label>
        <RichTextEditor
          value={value.body ?? null}
          onChange={(next) => onConfigChange({ ...value, body: next })}
          placeholder="Write your callout content"
        />
      </div>
    </div>
  );
}
