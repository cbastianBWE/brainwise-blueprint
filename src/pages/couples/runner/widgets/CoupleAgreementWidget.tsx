import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { useState } from "react";
import { MultimodalField, mmIsFilled, type MMValue } from "@/components/coaching/MultimodalField";
import { allowedModes, type CoupleContext, type CoupleStep, substituteNames } from "../coupleShared";

export interface CoupleAgreementValue {
  selected?: string[];
  custom?: MMValue[];
  escalationPlan?: MMValue;
  rainCheck?: MMValue;
  words?: MMValue;
  date?: string;
  outcome?: "yes" | "not_now" | "need_to_know_first";
  signedByMe?: boolean;
}

export function CoupleAgreementWidget({
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
  const v = (value || {}) as CoupleAgreementValue;
  const selected = v.selected || [];
  const custom = v.custom || [];
  const [draft, setDraft] = useState<MMValue>("");
  const modes = allowedModes(step);
  const stepKey = step.key || step.id || "agreement";

  const set = (patch: Partial<CoupleAgreementValue>) => onChange({ ...(value || {}), ...patch });

  const cap = step.selectCount;
  const atCap = typeof cap === "number" && selected.length >= cap;

  const toggle = (s: string) => {
    if (selected.includes(s)) {
      set({ selected: selected.filter((x) => x !== s) });
    } else if (!atCap) {
      set({ selected: [...selected, s] });
    }
  };

  const addCustom = () => {
    if (!mmIsFilled(draft)) return;
    set({ custom: [...custom, typeof draft === "string" ? draft.trim() : draft] });
    setDraft("");
  };

  const missing: string[] = [];
  if (step.requiresEscalationPlan && !mmIsFilled(v.escalationPlan)) missing.push("what happens if it's crossed");
  if (step.requiresRainCheck && !mmIsFilled(v.rainCheck)) missing.push("how you offer another time");
  if (step.requiresWords && !mmIsFilled(v.words)) missing.push("the words you'll use");
  if (step.requiresDate && !v.date) missing.push("a date");
  if (typeof cap === "number" && selected.length + custom.length === 0) missing.push("at least one commitment");
  const complete = missing.length === 0;

  return (
    <div className="space-y-6">
      {(step.title || step.label) && (
        <h3 className="text-lg font-semibold">{substituteNames(step.title || step.label || "", couple)}</h3>
      )}

      {!(step.starters && step.starters.length > 0) && (step.label || step.title) && (
        <p className="text-base">{substituteNames(step.label || step.title || "", couple)}</p>
      )}

      {step.starters && step.starters.length > 0 && (
        <div className="space-y-3">
          {typeof cap === "number" && (
            <p className="text-sm text-muted-foreground">
              {selected.length} of {cap} chosen
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {step.starters.map((s) => {
              const isSel = selected.includes(s);
              const disabled = !isSel && atCap;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(s)}
                  disabled={disabled}
                  aria-pressed={isSel}
                  className={`relative rounded-lg border p-3 text-left text-sm transition ${
                    isSel ? "ring-2 ring-primary" : "hover:bg-muted/40"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isSel && (
                    <span className="absolute right-2 top-2 rounded-full bg-primary p-0.5 text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  {substituteNames(s, couple)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(step.allowCustom || !(step.starters && step.starters.length > 0)) && (
        <div className="space-y-2">
          <Label>
            {step.starters && step.starters.length > 0 ? "Write your own" : "In your own words"}
          </Label>
          <div className="space-y-2">
            <MultimodalField
              value={draft}
              onChange={setDraft}
              sessionId={sessionId}
              activityCode={activityCode}
              questionKey={`${stepKey}.custom`}
              sessionKind="relationship"
              modes={modes}
              minRows={step.starters && step.starters.length > 0 ? 2 : 4}
              placeholder={
                step.starters && step.starters.length > 0
                  ? "In your own words"
                  : "Say it the way you'd actually say it."
              }
            />
            <Button variant="outline" onClick={addCustom} disabled={!mmIsFilled(draft)}>
              Add
            </Button>
          </div>
          {custom.length > 0 && (
            <ul className="space-y-1">
              {custom.map((c, i) => (
                <li key={i} className="rounded-md border bg-muted/30 p-2 text-sm">
                  {typeof c === "string" ? c : `Recorded ${c.mode === "video" ? "video" : "audio"} answer`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step.requiresEscalationPlan && (
        <div className="space-y-1.5">
          <Label>What happens if either of you thinks this has been crossed?</Label>
          <MultimodalField
            value={v.escalationPlan ?? ""}
            onChange={(next) => set({ escalationPlan: next })}
            sessionId={sessionId}
            activityCode={activityCode}
            questionKey={`${stepKey}.escalationPlan`}
            sessionKind="relationship"
            modes={modes}
            minRows={3}
          />
        </div>
      )}

      {step.requiresRainCheck && (
        <div className="space-y-1.5">
          <Label>How do you offer another time?</Label>
          <MultimodalField
            value={v.rainCheck ?? ""}
            onChange={(next) => set({ rainCheck: next })}
            sessionId={sessionId}
            activityCode={activityCode}
            questionKey={`${stepKey}.rainCheck`}
            sessionKind="relationship"
            modes={modes}
            minRows={3}
          />
        </div>
      )}

      {step.requiresWords && (
        <div className="space-y-1.5">
          <Label>The actual words you'll both use.</Label>
          <MultimodalField
            value={v.words ?? ""}
            onChange={(next) => set({ words: next })}
            sessionId={sessionId}
            activityCode={activityCode}
            questionKey={`${stepKey}.words`}
            sessionKind="relationship"
            modes={modes}
            minRows={3}
          />
        </div>
      )}

      {step.requiresDate && (
        <div className="space-y-1.5">
          <Label htmlFor="agreement-date">Date</Label>
          <Input
            id="agreement-date"
            type="date"
            className="max-w-xs"
            value={v.date || ""}
            onChange={(e) => set({ date: e.target.value })}
          />
        </div>
      )}

      {(step.allowNotNow || step.allowNeedToKnowFirst) && (
        <div className="space-y-2">
          <Label>Where you've landed</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              variant={v.outcome === "yes" ? "default" : "outline"}
              onClick={() => set({ outcome: "yes" })}
              className="h-auto whitespace-normal py-3"
            >
              Yes, we choose this
            </Button>
            {step.allowNotNow && (
              <Button
                variant={v.outcome === "not_now" ? "default" : "outline"}
                onClick={() => set({ outcome: "not_now" })}
                className="h-auto whitespace-normal py-3"
              >
                Not now
              </Button>
            )}
            {step.allowNeedToKnowFirst && (
              <Button
                variant={v.outcome === "need_to_know_first" ? "default" : "outline"}
                onClick={() => set({ outcome: "need_to_know_first" })}
                className="h-auto whitespace-normal py-3"
              >
                We need to know something first
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">All three are real answers. None of them is the wrong one.</p>
        </div>
      )}

      {step.requiredToComplete && !complete && (
        <p className="text-sm text-muted-foreground">Still to add: {missing.join(", ")}.</p>
      )}

      {step.bothMustAgree && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Signatures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">{couple.ownFirstName}</span>
              {v.signedByMe ? (
                <Badge variant="secondary">Signed</Badge>
              ) : (
                <Button size="sm" disabled={!complete} onClick={() => set({ signedByMe: true })}>
                  Sign
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">{couple.otherFirstName}</span>
              <Badge variant="secondary">{couple.partnerSubmitted ? "Signed" : "Not yet"}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {!step.bothMustAgree && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your commitment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This one is yours. It isn't something to negotiate or agree on — it's the change you're choosing to work
              on.
            </p>
            {v.signedByMe ? (
              <Badge variant="secondary">Committed</Badge>
            ) : (
              <Button size="sm" disabled={!complete} onClick={() => set({ signedByMe: true })}>
                I'm committing to this
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
