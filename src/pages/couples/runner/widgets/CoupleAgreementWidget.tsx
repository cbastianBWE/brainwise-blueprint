import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";
import { useState } from "react";
import { type CoupleContext, type CoupleStep, substituteNames } from "../coupleShared";

export interface CoupleAgreementValue {
  selected?: string[];
  custom?: string[];
  escalationPlan?: string;
  rainCheck?: string;
  words?: string;
  date?: string;
  outcome?: "yes" | "not_now" | "need_to_know_first";
  signedByMe?: boolean;
}

export function CoupleAgreementWidget({
  step,
  couple,
  value,
  onChange,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const v = (value || {}) as CoupleAgreementValue;
  const selected = v.selected || [];
  const custom = v.custom || [];
  const [draft, setDraft] = useState("");

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
    const t = draft.trim();
    if (!t) return;
    set({ custom: [...custom, t] });
    setDraft("");
  };

  const missing: string[] = [];
  if (step.requiresEscalationPlan && !v.escalationPlan?.trim()) missing.push("what happens if it's crossed");
  if (step.requiresRainCheck && !v.rainCheck?.trim()) missing.push("how you offer another time");
  if (step.requiresWords && !v.words?.trim()) missing.push("the words you'll use");
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
          <Label htmlFor="agreement-custom">
            {step.starters && step.starters.length > 0 ? "Write your own" : "In your own words"}
          </Label>
          <div className={step.starters && step.starters.length > 0 ? "flex gap-2" : "space-y-2"}>
            {step.starters && step.starters.length > 0 ? (
              <Input
                id="agreement-custom"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="In your own words"
              />
            ) : (
              <Textarea
                id="agreement-custom"
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Say it the way you'd actually say it."
              />
            )}
            <Button variant="outline" onClick={addCustom} disabled={!draft.trim()}>
              Add
            </Button>
          </div>
          {custom.length > 0 && (
            <ul className="space-y-1">
              {custom.map((c, i) => (
                <li key={`${c}-${i}`} className="rounded-md border bg-muted/30 p-2 text-sm">
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step.requiresEscalationPlan && (
        <div className="space-y-1.5">
          <Label htmlFor="escalation">What happens if either of you thinks this has been crossed?</Label>
          <Textarea
            id="escalation"
            rows={3}
            value={v.escalationPlan || ""}
            onChange={(e) => set({ escalationPlan: e.target.value })}
          />
        </div>
      )}

      {step.requiresRainCheck && (
        <div className="space-y-1.5">
          <Label htmlFor="raincheck">How do you offer another time?</Label>
          <Textarea
            id="raincheck"
            rows={3}
            value={v.rainCheck || ""}
            onChange={(e) => set({ rainCheck: e.target.value })}
          />
        </div>
      )}

      {step.requiresWords && (
        <div className="space-y-1.5">
          <Label htmlFor="words">The actual words you'll both use.</Label>
          <Textarea id="words" rows={3} value={v.words || ""} onChange={(e) => set({ words: e.target.value })} />
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
    </div>
  );
}
