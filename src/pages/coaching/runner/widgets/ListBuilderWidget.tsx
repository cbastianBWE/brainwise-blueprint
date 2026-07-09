import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CoachingRecordingPlayer } from "@/components/coaching/CoachingViews";
import { MultimodalField, isMMRec, mmIsFilled, type MMValue } from "@/components/coaching/MultimodalField";
import { type Step } from "../shared";

export function ListBuilderWidget({
  step,
  items,
  onChange,
  reference,
  sessionId,
  activityCode,
}: {
  step: Step;
  items: MMValue[];
  onChange: (next: MMValue[]) => void;
  reference?: { title: string; items: string[] };
  sessionId: string;
  activityCode: string;
}) {
  const min = step.min ?? 0;
  const [draft, setDraft] = useState<MMValue>("");
  const [nonce, setNonce] = useState(0);
  const add = () => {
    if (!mmIsFilled(draft)) return;
    const next = typeof draft === "string" ? draft.trim() : draft;
    onChange([...(items || []), next as MMValue]);
    setDraft("");
    setNonce((n) => n + 1);
  };
  return (
    <div className="space-y-3">
      {reference && reference.items.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground">{reference.title}</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {reference.items.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {step.helper && <p className="text-sm text-muted-foreground">{step.helper}</p>}
      <div className="space-y-2">
        {(items || []).map((v, i) => (
          <div key={i} className="flex items-start gap-2">
            {isMMRec(v) ? (
              <div className="flex-1">
                <CoachingRecordingPlayer mediaId={v.media_id} />
              </div>
            ) : (
              <Input
                value={v as string}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange(next);
                }}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="rounded-md border p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Add an item</p>
        <MultimodalField
          key={nonce}
          value={draft}
          onChange={(v) => {
            setDraft(v);
            if (isMMRec(v)) {
              onChange([...(items || []), v]);
              setDraft("");
              setNonce((n) => n + 1);
            }
          }}
          sessionId={sessionId}
          activityCode={activityCode}
          questionKey={`${step.key || "items"}:${(items || []).length}:${nonce}`}
          placeholder="Add an item…"
          minRows={2}
        />
        {typeof draft === "string" && (
          <Button type="button" size="sm" onClick={add} disabled={!mmIsFilled(draft)}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        )}
      </div>
      {min > 0 && (
        <p className="text-xs text-muted-foreground">
          {(items || []).length} of at least {min}
        </p>
      )}
    </div>
  );
}
