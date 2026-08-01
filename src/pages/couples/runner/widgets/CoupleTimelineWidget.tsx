import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultimodalField, isMMRec, type MMValue } from "@/components/coaching/MultimodalField";
import type { CoupleContext, CoupleStep } from "../coupleShared";
import { allowedModes } from "../coupleShared";

export interface TimelineEvent {
  when?: string;
  what?: MMValue;
  valence?: string;
  meaning?: MMValue;
  [k: string]: unknown;
}

const mmText = (v: MMValue | undefined): string =>
  isMMRec(v) ? String((v as any).transcript || "").trim() : typeof v === "string" ? v.trim() : "";


const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function EventRow({
  step,
  ev,
  idx,
  onPatch,
  onRemove,
  sessionId,
  activityCode,
}: {
  step: CoupleStep;
  ev: TimelineEvent;
  idx: number;
  onPatch: (patch: Partial<TimelineEvent>) => void;
  onRemove: () => void;
  sessionId: string;
  activityCode: string;
}) {
  const fields = step.eventFields && step.eventFields.length > 0
    ? step.eventFields
    : ["when", "what", "valence", "meaning"];
  const labels = step.eventFieldLabels || {};
  const valences = step.valenceOptions || [];
  const valenceLabels = step.valenceLabels || {};
  const modes = allowedModes(step);
  const baseKey = `${step.key || step.id || "timeline"}__${idx}`;

  return (
    <li className="space-y-3 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
        <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {fields.map((f) => {
        if (f === "when") {
          return (
            <div key={f} className="space-y-1">
              {labels[f] && <p className="text-sm font-medium">{labels[f]}</p>}
              <Input
                value={typeof ev.when === "string" ? ev.when : ""}
                onChange={(e) => onPatch({ when: e.target.value })}
              />
            </div>
          );
        }
        if (f === "valence") {
          return (
            <div key={f} className="space-y-1">
              {labels[f] && <p className="text-sm font-medium">{labels[f]}</p>}
              <div className="flex flex-wrap gap-2">
                {valences.map((v) => (
                  <Button
                    key={v}
                    type="button"
                    size="sm"
                    variant={ev.valence === v ? "default" : "outline"}
                    onClick={() => onPatch({ valence: ev.valence === v ? undefined : v })}
                  >
                    {valenceLabels[v] || v}
                  </Button>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div key={f} className="space-y-1">
            {labels[f] && <p className="text-sm font-medium">{labels[f]}</p>}
            <MultimodalField
              value={(ev as any)[f] as MMValue | undefined}
              onChange={(v) => onPatch({ [f]: v } as Partial<TimelineEvent>)}
              sessionId={sessionId}
              activityCode={activityCode}
              questionKey={`${baseKey}__${f}`}
              sessionKind="relationship"
              modes={modes}
              minRows={2}
            />
          </div>
        );
      })}
    </li>
  );
}

function Overlay({ step, couple, mine }: { step: CoupleStep; couple: CoupleContext; mine: TimelineEvent[] }) {
  const key = step.comparesKey || step.key || step.id || "";
  const theirsRaw = (couple.partnerView?.responses as any)?.[key];
  const theirs: TimelineEvent[] = Array.isArray(theirsRaw) ? theirsRaw : [];

  const highlights = step.reveal?.highlight || [];
  const wantBoth = highlights.includes("both_marked");
  const wantOne = highlights.includes("one_marked");
  const wantDivergent = highlights.includes("divergent_valence");

  const byText = new Map<string, { label: string; mine?: TimelineEvent; theirs?: TimelineEvent }>();
  for (const e of mine) {
    const t = mmText(e.what);
    if (!t) continue;
    byText.set(norm(t), { label: t, mine: e });
  }
  for (const e of theirs) {
    const t = mmText(e.what);
    if (!t) continue;
    const k = norm(t);
    const cur = byText.get(k) || { label: t };
    byText.set(k, { ...cur, theirs: e });
  }

  const rows = [...byText.values()];
  const divergent = rows.filter(
    (r) => r.mine && r.theirs && r.mine.valence && r.theirs.valence && r.mine.valence !== r.theirs.valence,
  );
  const both = rows.filter((r) => r.mine && r.theirs && !divergent.includes(r));
  const one = rows.filter((r) => !r.mine || !r.theirs);

  const valLabel = (v?: string) => (v ? step.valenceLabels?.[v] || v : "");

  return (
    <div className="space-y-5">
      {wantDivergent && divergent.length > 0 && (
        <div className="space-y-2 rounded-lg border-2 border-primary bg-primary/5 p-4">
          {divergent.map((r) => (
            <div key={r.label} className="space-y-1">
              <p className="text-base font-semibold">{r.label}</p>
              <div className="flex flex-wrap gap-x-6 text-sm">
                <span>
                  {couple.ownFirstName}: {valLabel(r.mine?.valence)}
                </span>
                <span>
                  {couple.otherFirstName}: {valLabel(r.theirs?.valence)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {wantBoth && both.length > 0 && (
        <ul className="space-y-2">
          {both.map((r) => (
            <li key={r.label} className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{r.label}</p>
              <p className="text-muted-foreground">
                {couple.ownFirstName}: {valLabel(r.mine?.valence)} · {couple.otherFirstName}:{" "}
                {valLabel(r.theirs?.valence)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {wantOne && one.length > 0 && (
        <ul className="space-y-2">
          {one.map((r) => (
            <li key={r.label} className="rounded-md border border-dashed p-3 text-sm">
              <p>{r.label}</p>
              <p className="text-xs text-muted-foreground">
                {r.mine ? couple.ownFirstName : couple.otherFirstName}
              </p>
            </li>
          ))}
        </ul>
      )}

      {rows.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
    </div>
  );
}

/**
 * Double-consent gate (C19.1).
 *
 * Stricter than the ordinary both-complete barrier: after both partners finish,
 * each is asked separately whether they want the two timelines laid over each
 * other. The overlay renders only if BOTH say yes. Declining is one tap, with
 * no follow-up and no second ask, and nothing is shown to either partner.
 */
function DoubleConsentGate({
  couple,
  ownChoice,
  partnerChoice,
  onChoose,
  readOnly,
  children,
}: {
  couple: CoupleContext;
  ownChoice: boolean | null;
  partnerChoice: boolean | null;
  onChoose: (yes: boolean) => void;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  if (ownChoice === false || partnerChoice === false) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        These stay private. Nothing has been shared, and that's a complete answer.
      </div>
    );
  }

  if (ownChoice === null) {
    return (
      <div className="space-y-3 rounded-md border p-4">
        <p className="text-sm">Do you want to see each other's, side by side?</p>
        <p className="text-xs text-muted-foreground">
          Only if you both choose to. Either of you can keep yours private, and that's the end of it.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={readOnly} onClick={() => onChoose(true)}>
            Yes, reveal
          </Button>
          <Button size="sm" variant="outline" disabled={readOnly} onClick={() => onChoose(false)}>
            Keep mine private
          </Button>
        </div>
      </div>
    );
  }

  if (partnerChoice !== true) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        You've said yes. Nothing appears unless {couple.otherFirstName} says yes too.
      </div>
    );
  }

  return <>{children}</>;
}

export function CoupleTimelineWidget({
  step,
  couple,
  value,
  onChange,
  sessionId,
  activityCode,
  readOnly,
  responses,
  setResponse,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  value: TimelineEvent[];
  onChange: (next: TimelineEvent[]) => void;
  sessionId: string;
  activityCode: string;
  readOnly?: boolean;
  responses?: Record<string, unknown>;
  setResponse?: (key: string, value: unknown) => void;
}) {
  const events = Array.isArray(value) ? value : [];
  const trajectory = step.mode === "trajectory";
  const isReveal = step.reveal?.mode === "overlay";
  const target = typeof step.softTarget === "number" ? step.softTarget : undefined;
  const min = typeof step.minEvents === "number" ? step.minEvents : 0;

  const patch = (i: number, p: Partial<TimelineEvent>) =>
    onChange(events.map((e, idx) => (idx === i ? { ...e, ...p } : e)));

  if (trajectory || isReveal) {
    const gated = !couple.barrierCleared;
    const doubleConsent = (step as any).revealRequiresDoubleConsent === true;
    const consentKey = `${step.key || step.id || "timeline"}__reveal_consent`;
    const asChoice = (v: unknown): boolean | null =>
      v === true || v === false ? (v as boolean) : null;
    const ownChoice = asChoice((responses as any)?.[consentKey]);
    const partnerChoice = asChoice((couple.partnerView?.responses as any)?.[consentKey]);

    const overlay = (
      <>
        {step.revealIntro && <p className="text-sm text-muted-foreground">{step.revealIntro}</p>}
        <Overlay step={step} couple={couple} mine={events} />
      </>
    );

    return (
      <div className="space-y-4">
        {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}
        {gated ? (
          step.waitingCopy ? (
            <div className="rounded-md border bg-muted/30 p-4 text-sm">{step.waitingCopy}</div>
          ) : null
        ) : doubleConsent ? (
          <DoubleConsentGate
            couple={couple}
            ownChoice={ownChoice}
            partnerChoice={partnerChoice}
            readOnly={readOnly}
            onChoose={(yes) => setResponse?.(consentKey, yes)}
          >
            {overlay}
          </DoubleConsentGate>
        ) : (
          overlay
        )}
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}

      <ul className="space-y-3">
        {events.map((ev, i) => (
          <EventRow
            key={i}
            step={step}
            ev={ev}
            idx={i}
            onPatch={(p) => patch(i, p)}
            onRemove={() => onChange(events.filter((_, idx) => idx !== i))}
            sessionId={sessionId}
            activityCode={activityCode}
          />
        ))}
      </ul>

      {!readOnly && (
        <Button variant="outline" size="sm" onClick={() => onChange([...events, {}])}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        {events.length} added{min ? ` · ${min} needed` : ""}
        {target !== undefined && events.length >= target ? " · a good place to stop" : ""}
      </p>
    </div>
  );
}
