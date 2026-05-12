import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "../RichTextEditor";
import type { TipTapDocJSON } from "../blockTypeMeta";

interface Props {
  value: {
    stat: string;
    label: string;
    body: TipTapDocJSON;
  };
  onConfigChange: (next: Props["value"]) => void;
}

export function StatCalloutBlockForm({ value, onConfigChange }: Props) {
  const stat = value.stat ?? "";
  const label = value.label ?? "";

  return (
    <div className="space-y-4">
      {/* Live preview */}
      <div className="bw-stat-callout rounded-md border bg-muted/20">
        <div className="bw-stat-callout-number">{stat || "47%"}</div>
        <div className="bw-stat-callout-label">
          {label || "Add a supporting label below"}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Statistic</Label>
        <Input
          value={stat}
          onChange={(e) => onConfigChange({ ...value, stat: e.target.value })}
          placeholder="47% or 1 in 3 or $2.4M"
          maxLength={24}
        />
        <p className="text-[11px] text-muted-foreground">
          Short text — works for percentages, ratios, dollar amounts, multipliers.
        </p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Label</Label>
        <Input
          value={label}
          onChange={(e) => onConfigChange({ ...value, label: e.target.value })}
          placeholder="of feedback conversations stall on framing"
          maxLength={120}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Supporting detail (optional)</Label>
        <RichTextEditor
          value={value.body ?? null}
          onChange={(next) => onConfigChange({ ...value, body: next })}
          placeholder="One or two sentences of context"
          compact
        />
      </div>
    </div>
  );
}
