import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Props {
  value: {
    prompt: string;
    guidance: string | null;
    placeholder: string | null;
    min_length: number;
    gating_required: boolean;
    [key: string]: unknown;
  };
  onConfigChange: (next: Props["value"]) => void;
}

export function OpenResponseBlockForm({ value, onConfigChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="open-response-prompt">Prompt for the learner</Label>
        <Textarea
          id="open-response-prompt"
          rows={3}
          value={value.prompt ?? ""}
          onChange={(e) => onConfigChange({ ...value, prompt: e.target.value })}
          placeholder="What question or instruction should the learner respond to?"
        />
        <p className="text-xs text-muted-foreground">
          The question or instruction the learner responds to.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="open-response-guidance">AI guidance (optional)</Label>
        <Textarea
          id="open-response-guidance"
          rows={3}
          value={value.guidance ?? ""}
          onChange={(e) => {
            const next = e.target.value;
            onConfigChange({ ...value, guidance: next.trim() === "" ? null : next });
          }}
          placeholder="Private steering note for the AI coach"
        />
        <p className="text-xs text-muted-foreground">
          Private steering note for the AI coach. Never shown to the learner.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="open-response-placeholder">Placeholder (optional)</Label>
        <Input
          id="open-response-placeholder"
          value={value.placeholder ?? ""}
          onChange={(e) => {
            const next = e.target.value;
            onConfigChange({ ...value, placeholder: next.trim() === "" ? null : next });
          }}
          placeholder="Type your response here"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="open-response-min">Minimum characters (optional)</Label>
        <Input
          id="open-response-min"
          type="number"
          min={0}
          value={Number.isFinite(value.min_length) ? value.min_length : 0}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            onConfigChange({ ...value, min_length: Number.isNaN(parsed) ? 0 : Math.max(0, parsed) });
          }}
        />
      </div>

      <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-3">
        <Switch
          id="open-response-gating"
          checked={value.gating_required === true}
          onCheckedChange={(checked) => onConfigChange({ ...value, gating_required: checked === true })}
        />
        <div className="space-y-1">
          <Label htmlFor="open-response-gating" className="cursor-pointer text-sm font-medium">
            Require completion before continuing
          </Label>
          <p className="text-xs text-muted-foreground">
            When on, trainees must submit a response before the next Continue button is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
