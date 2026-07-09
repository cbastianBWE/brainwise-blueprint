import { Label } from "@/components/ui/label";
import { ResourceVideo } from "@/components/coaching/CoachingViews";
import { MultimodalField, type MMValue } from "@/components/coaching/MultimodalField";
import { type Step } from "../shared";

export function ContentWidget({
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
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}
      {step.body && <p className="whitespace-pre-wrap text-sm leading-relaxed">{step.body}</p>}
      {step.media?.type === "image" && step.media.src && (
        <figure className="space-y-1">
          <img
            src={step.media.src}
            alt={step.media.alt || ""}
            loading="lazy"
            className="w-full rounded-md object-cover"
          />
          {step.media.caption && (
            <figcaption className="text-xs text-muted-foreground">{step.media.caption}</figcaption>
          )}
        </figure>
      )}
      {step.statements && step.statements.length > 0 && (
        <ul className="space-y-2">
          {step.statements.map((s, i) => (
            <li key={i} className="rounded-md border bg-muted/30 p-3 text-sm">
              {s}
            </li>
          ))}
        </ul>
      )}
      {step.resources && step.resources.length > 0 && (
        <div className="space-y-4">
          {step.resources.map((r) => (
            <ResourceVideo key={r.id} resourceId={r.id} title={r.title} />
          ))}
        </div>
      )}
      {step.reflection && step.key && (
        <div className="space-y-2">
          {step.reflection.prompt && <Label>{step.reflection.prompt}</Label>}
          <MultimodalField
            value={value}
            onChange={onChange}
            sessionId={sessionId}
            activityCode={activityCode}
            questionKey={step.key}
            placeholder={step.reflection.placeholder}
            minRows={step.reflection.minRows ?? 4}
          />
        </div>
      )}
    </div>
  );
}
