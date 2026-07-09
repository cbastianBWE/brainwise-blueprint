import { Card } from "@/components/ui/card";
import { MultimodalField, mmIsFilled, type MMValue } from "@/components/coaching/MultimodalField";
import { type Step, type SelectedImage, imgUrl } from "../shared";

export function ImageDescribeWidget({
  step,
  value,
  onChange,
  sessionId,
  activityCode,
}: {
  step: Step;
  value: SelectedImage[];
  onChange: (next: SelectedImage[]) => void;
  sessionId: string;
  activityCode: string;
}) {
  const describedCount = value.filter((it) => mmIsFilled(it.description)).length;

  const updateDescription = (idx: number, description: MMValue) => {
    const next = value.map((it, i) => (i === idx ? { ...it, description } : it));
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}
      {step.questions && step.questions.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {step.questions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      )}
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">Select some pictures first.</p>
      ) : (
        <>
          <div className="space-y-3">
            {value.map((item, idx) => {
              const labelId = `img-desc-${idx}`;
              return (
                <Card key={`${item.library_id}-${idx}`} className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={imgUrl(item.storage_path, 200, 200)}
                      alt={item.tag || `Picture ${idx + 1}`}
                      className="h-24 w-24 flex-shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div id={labelId} className="text-sm font-semibold">
                        {item.tag || `Picture ${idx + 1}`}
                      </div>
                      <MultimodalField
                        value={item.description}
                        onChange={(v) => updateDescription(idx, v)}
                        sessionId={sessionId}
                        activityCode={activityCode}
                        questionKey={`${step.fromKey || "images"}:${item.library_id}:desc`}
                        placeholder={step.descriptionPrompt}
                        minRows={3}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            {describedCount} of {value.length} described
          </p>
        </>
      )}
    </div>
  );
}
