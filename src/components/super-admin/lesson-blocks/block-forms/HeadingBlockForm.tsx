import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  value: { text: string; level: 2 | 3 | 4 };
  onConfigChange: (next: { text: string; level: 2 | 3 | 4 }) => void;
}

export function HeadingBlockForm({ value, onConfigChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Heading text</Label>
        <Input
          value={value.text ?? ""}
          onChange={(e) => onConfigChange({ ...value, text: e.target.value })}
          placeholder="Section title"
        />
      </div>
      <div className="space-y-2">
        <Label>Level</Label>
        <Select
          value={String(value.level ?? 2)}
          onValueChange={(v) =>
            onConfigChange({ ...value, level: Number(v) as 2 | 3 | 4 })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">H2 (section)</SelectItem>
            <SelectItem value="3">H3 (subsection)</SelectItem>
            <SelectItem value="4">H4 (minor)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
