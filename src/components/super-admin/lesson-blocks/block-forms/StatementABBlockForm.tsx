import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RichTextEditor } from "../RichTextEditor";
import type { TipTapDocJSON } from "../blockTypeMeta";

type Variant = "contrast" | "neutral";

interface Props {
  value: {
    a_label: string;
    a_body: TipTapDocJSON;
    b_label: string;
    b_body: TipTapDocJSON;
    variant: Variant;
  };
  onConfigChange: (next: Props["value"]) => void;
}

export function StatementABBlockForm({ value, onConfigChange }: Props) {
  const variant: Variant = value.variant === "neutral" ? "neutral" : "contrast";
  const variantClass = variant === "neutral" ? "is-neutral" : "is-contrast";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Style</Label>
        <RadioGroup
          value={variant}
          onValueChange={(v) =>
            onConfigChange({ ...value, variant: v as Variant })
          }
          className="grid grid-cols-2 gap-2"
        >
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs">
            <RadioGroupItem value="contrast" />
            Contrast (A weak / B strong)
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs">
            <RadioGroupItem value="neutral" />
            Neutral (two perspectives)
          </Label>
        </RadioGroup>
      </div>

      <div className="bw-statement-ab">
        {/* A side */}
        <div className={`bw-statement-card bw-statement-card-a ${variantClass} space-y-2`}>
          <div className="bw-statement-card-label">Statement A</div>
          <Input
            value={value.a_label ?? ""}
            onChange={(e) => onConfigChange({ ...value, a_label: e.target.value })}
            placeholder="Label (e.g. Vague, Before, Weak)"
            maxLength={40}
          />
          <RichTextEditor
            value={value.a_body ?? null}
            onChange={(next) => onConfigChange({ ...value, a_body: next })}
            placeholder="The A statement…"
            compact
          />
        </div>

        {/* B side */}
        <div className={`bw-statement-card bw-statement-card-b ${variantClass} space-y-2`}>
          <div className="bw-statement-card-label">Statement B</div>
          <Input
            value={value.b_label ?? ""}
            onChange={(e) => onConfigChange({ ...value, b_label: e.target.value })}
            placeholder="Label (e.g. SBI-structured, After, Strong)"
            maxLength={40}
          />
          <RichTextEditor
            value={value.b_body ?? null}
            onChange={(next) => onConfigChange({ ...value, b_body: next })}
            placeholder="The B statement…"
            compact
          />
        </div>
      </div>
    </div>
  );
}
