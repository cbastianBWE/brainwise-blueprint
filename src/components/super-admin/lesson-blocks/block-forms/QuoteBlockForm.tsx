import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "../RichTextEditor";
import type { TipTapDocJSON } from "../blockTypeMeta";

interface Props {
  value: { body: TipTapDocJSON; attribution: string | null };
  onConfigChange: (next: Props["value"]) => void;
}

export function QuoteBlockForm({ value, onConfigChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Quote body</Label>
        <RichTextEditor
          value={value.body ?? null}
          onChange={(next) => onConfigChange({ ...value, body: next })}
          placeholder="Enter the quote text"
        />
      </div>
      <div className="space-y-2">
        <Label>Attribution (optional)</Label>
        <Input
          value={value.attribution ?? ""}
          onChange={(e) =>
            onConfigChange({
              ...value,
              attribution: e.target.value || null,
            })
          }
          placeholder="— Author"
        />
      </div>
    </div>
  );
}
