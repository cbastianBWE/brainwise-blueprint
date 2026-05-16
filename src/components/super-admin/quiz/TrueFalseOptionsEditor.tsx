import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { DraftOption } from "./MultipleChoiceOptionsEditor";

interface Props {
  options: DraftOption[];
  onChange: (next: DraftOption[]) => void;
}

export function TrueFalseOptionsEditor({ options, onChange }: Props) {
  const correctId = options.find((o) => o.is_correct)?.client_id ?? "";

  const handleChange = (newId: string) => {
    onChange(options.map((o) => ({ ...o, is_correct: o.client_id === newId })));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Correct answer</Label>
      <RadioGroup value={correctId} onValueChange={handleChange}>
        {options.map((o) => (
          <label key={o.client_id} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={o.client_id} />
            {o.option_text}
          </label>
        ))}
      </RadioGroup>
      {!correctId && (
        <p className="text-xs text-muted-foreground">Pick True or False as the correct answer.</p>
      )}
    </div>
  );
}
