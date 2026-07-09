import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CoachingRecordingPlayer } from "@/components/coaching/CoachingViews";
import { MultimodalField, isMMRec, mmIsFilled, type MMValue } from "@/components/coaching/MultimodalField";
import { type Step, type Negative } from "../shared";

export function RiskBlocksWidget({
  step,
  items,
  onChange,
  sessionId,
  activityCode,
}: {
  step: Step;
  items: Negative[];
  onChange: (next: Negative[]) => void;
  sessionId: string;
  activityCode: string;
}) {
  const subfields = step.subfields || [];
  const editingSub = subfields.length > 0;
  const [draft, setDraft] = useState<MMValue>("");
  const [nonce, setNonce] = useState(0);

  if (!editingSub) {
    const add = () => {
      if (!mmIsFilled(draft)) return;
      const val = typeof draft === "string" ? draft.trim() : draft;
      onChange([...(items || []), { text: val as any }]);
      setDraft("");
      setNonce((n) => n + 1);
    };
    return (
      <div className="space-y-3">
        {step.helper && <p className="text-sm text-muted-foreground">{step.helper}</p>}
        <div className="space-y-2">
          {(items || []).map((n, i) => (
            <div key={i} className="flex items-start gap-2">
              {isMMRec(n.text as any) ? (
                <div className="flex-1">
                  <CoachingRecordingPlayer mediaId={(n.text as any).media_id} />
                </div>
              ) : (
                <Input
                  value={(n.text as any) || ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...next[i], text: e.target.value as any };
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
          <p className="text-xs font-medium text-muted-foreground">{step.addLabel || "Add a risk"}</p>
          <MultimodalField
            key={nonce}
            value={draft}
            onChange={(v) => {
              setDraft(v);
              if (isMMRec(v)) {
                onChange([...(items || []), { text: v as any }]);
                setDraft("");
                setNonce((n) => n + 1);
              }
            }}
            sessionId={sessionId}
            activityCode={activityCode}
            questionKey={`${step.key || "negatives"}:${(items || []).length}:text:${nonce}`}
            placeholder={step.placeholder || "Add a risk or concern…"}
            minRows={2}
          />
          {typeof draft === "string" && (
            <Button type="button" size="sm" onClick={add} disabled={!mmIsFilled(draft)}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      </div>
    );
  }

  const defaultLabels: Record<string, string> = {
    a: "Prevent",
    b: "In the moment",
    c: "Recover",
  };
  const defaultHelpers: Record<string, string> = {
    a: "How you can reduce the chance this happens.",
    b: "What you'll do if it starts to happen.",
    c: "How you'll recover if it does happen.",
  };
  const label = (sf: string) => step.subfieldLabels?.[sf] ?? defaultLabels[sf] ?? sf;
  const helper = (sf: string) => step.subfieldHelpers?.[sf] ?? defaultHelpers[sf] ?? "";

  return (
    <div className="space-y-4">
      {step.helper && <p className="text-sm text-muted-foreground">{step.helper}</p>}
      {(items || []).map((n, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {typeof n.text === "string" ? (n.text || `Risk ${i + 1}`) : `Risk ${i + 1}`}
            </CardTitle>
            {isMMRec(n.text as any) && (
              <div className="pt-2"><CoachingRecordingPlayer mediaId={(n.text as any).media_id} /></div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {subfields.map((sf) => (
              <div key={sf} className="space-y-1">
                <Label>{label(sf)}</Label>
                <p className="text-xs text-muted-foreground">{helper(sf)}</p>
                <MultimodalField
                  value={(n as any)[sf]}
                  onChange={(v) => {
                    const next = [...items];
                    next[i] = { ...next[i], [sf]: v as any };
                    onChange(next);
                  }}
                  sessionId={sessionId}
                  activityCode={activityCode}
                  questionKey={`${step.key || "negatives"}:${i}:${sf}`}
                  minRows={2}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
