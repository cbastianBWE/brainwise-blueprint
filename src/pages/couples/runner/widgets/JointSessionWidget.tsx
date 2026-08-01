import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MultimodalField, type MMValue } from "@/components/coaching/MultimodalField";
import { allowedModes, type CoupleContext, type CoupleStep, substituteNames } from "../coupleShared";

type TurnState = { reflection?: MMValue; rebuttal?: MMValue; done: boolean };
type JointValue = { turns?: Record<string, TurnState>; notes?: string };

export function JointSessionWidget({
  step,
  couple,
  value,
  onChange,
  sessionId,
  activityCode,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  sessionId: string;
  activityCode: string;
}) {
  const v = (value || {}) as JointValue;
  const turns = step.turns || [];
  const [index, setIndex] = useState(0);
  const turn = turns[index];
  const modes = allowedModes(step);
  const stepKey = step.key || step.id || "joint";

  const setTurn = (key: string, patch: Partial<TurnState>) => {
    const prev = v.turns || {};
    onChange({
      ...(value || {}),
      turns: { ...prev, [key]: { done: false, ...(prev[key] || {}), ...patch } },
    });
  };

  const speakerName = (s: "a" | "b" | "both") =>
    s === "a" ? couple.ownFirstName : s === "b" ? couple.otherFirstName : "Both of you";

  const introText = typeof step.intro === "string" ? step.intro.trim() : "";
  const Intro = () =>
    introText ? (
      <div className="space-y-2">
        {substituteNames(introText, couple)
          .split(/\n\s*\n/)
          .map((p, i) => (
            <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
      </div>
    ) : null;

  const Rules = () => (
    <div className="space-y-2">
      {step.listenerRule && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">The rule for this conversation</p>
          <p className="mt-1 text-sm">{substituteNames(step.listenerRule, couple)}</p>
        </div>
      )}
      {step.noInterruption && (
        <p className="text-sm text-muted-foreground">
          The listener does not interrupt until the speaker is finished.
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {(step.title || step.label) && (
        <h3 className="text-lg font-semibold">{substituteNames(step.title || step.label || "", couple)}</h3>
      )}

      <Rules />

      <Intro />

      {/* a. Turn list */}
      {turns.length > 0 && turn && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{speakerName(turn.speaker)}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {index + 1} of {turns.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{substituteNames(turn.prompt, couple)}</p>

            {step.optIn && (
              <div className="flex items-center gap-3">
                <Badge variant="secondary">Only if you want to</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTurn(turn.key, { done: true });
                    setIndex((i) => Math.min(i + 1, turns.length - 1));
                  }}
                >
                  Skip this one
                </Button>
              </div>
            )}

            {turn.listenerReflects && (
              <div className="space-y-1.5">
                <Label>Say back what you heard, in your own words</Label>
                <MultimodalField
                  value={v.turns?.[turn.key]?.reflection ?? ""}
                  onChange={(next) => setTurn(turn.key, { reflection: next })}
                  sessionId={sessionId}
                  activityCode={activityCode}
                  questionKey={`${stepKey}.${turn.key}.reflection`}
                  sessionKind="relationship"
                  modes={modes}
                  minRows={3}
                />
              </div>
            )}

            {step.rebuttalBox && (
              <div className="space-y-1.5">
                <Label>Anything you want to put back</Label>
                <MultimodalField
                  value={v.turns?.[turn.key]?.rebuttal ?? ""}
                  onChange={(next) => setTurn(turn.key, { rebuttal: next })}
                  sessionId={sessionId}
                  activityCode={activityCode}
                  questionKey={`${stepKey}.${turn.key}.rebuttal`}
                  sessionKind="relationship"
                  modes={modes}
                  minRows={3}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => Math.max(i - 1, 0))}>
                Back
              </Button>
              <Button
                onClick={() => {
                  setTurn(turn.key, { done: true });
                  setIndex((i) => Math.min(i + 1, turns.length - 1));
                }}
                disabled={index === turns.length - 1 && !!v.turns?.[turn.key]?.done}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* b. Scaffold list */}
      {turns.length === 0 && (step.sessionScaffold?.length ?? 0) > 0 && (
        <ol className="list-decimal space-y-2 rounded-lg border p-4 pl-8">
          {(step.sessionScaffold || []).map((s, i) => (
            <li key={i} className="text-sm">
              {substituteNames(s, couple)}
            </li>
          ))}
        </ol>
      )}

      {/* c. Bare */}
      {turns.length === 0 && !(step.sessionScaffold?.length ?? 0) && (
        <div className="space-y-4">
          {/* TODO: driven by relationship-activity-chat session_prompt, wired with the runner */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Your coach will guide this conversation one step at a time. This is where that appears.
            </p>
          </div>
          <Button onClick={() => onChange({ ...(value || {}), turns: { session: { done: true } } })}>Done</Button>
        </div>
      )}
    </div>
  );
}
