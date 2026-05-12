import { Label } from "@/components/ui/label";
import { RichTextEditor } from "../RichTextEditor";
import type { TipTapDocJSON } from "../blockTypeMeta";

interface Props {
  value: { body: TipTapDocJSON };
  onConfigChange: (next: { body: TipTapDocJSON }) => void;
}

export function TextBlockForm({ value, onConfigChange }: Props) {
  return (
    <div className="space-y-2">
      <Label>Body</Label>
      <RichTextEditor
        value={value.body ?? null}
        onChange={(next) => onConfigChange({ ...value, body: next })}
        placeholder="Write your text here…"
      />
    </div>
  );
}
