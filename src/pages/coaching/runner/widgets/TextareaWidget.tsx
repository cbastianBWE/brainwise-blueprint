import { Label } from "@/components/ui/label";
import { MultimodalField, type MMValue } from "@/components/coaching/MultimodalField";
import { type Step } from "../shared";

export function TextareaWidget({
  step,
  value,
  onChange,
  sessionId,
  activityCode,
}: {
  step: Step;
  value: MMValue | undefined;
  onChange: (v: MMValue) => void;
  sessionId: string;
  activityCode: string;
}) {
  return (
    <div className="space-y-2">
      {step.label && <Label>{step.label}</Label>}
      {step.helper && <p className="text-sm text-muted-foreground">{step.helper}</p>}
      <MultimodalField
        value={value}
        onChange={onChange}
        sessionId={sessionId}
        activityCode={activityCode}
        questionKey={step.key || "text"}
        placeholder={step.placeholder}
        minRows={6}
      />
    </div>
  );
}
