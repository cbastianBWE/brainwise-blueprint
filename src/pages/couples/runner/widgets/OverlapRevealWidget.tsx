import { AiAnalysisPanel } from "@/components/coaching/CoachingViews";
import type { CoupleContext, CoupleStep } from "../coupleShared";

/**
 * Barrier-gated reveal over material that must never cross raw.
 * The client never reads relationship_desire_picks; the overlap arrives
 * pre-computed on the partner view / analysis.
 */
export function OverlapRevealWidget({
  step,
  couple,
  analysisHtml,
  analyzing,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  analysisHtml?: string;
  analyzing?: boolean;
}) {
  if (!couple.barrierCleared) {
    return step.waitingCopy ? (
      <div className="rounded-md border bg-muted/30 p-4 text-sm">{step.waitingCopy}</div>
    ) : null;
  }

  const computed = (couple.partnerView?.responses as any) || {};
  const overlap: unknown =
    computed[step.computedBy as string] ?? computed.overlap ?? computed[step.key as string];

  const items = Array.isArray(overlap) ? overlap.filter((x) => typeof x === "string") : [];

  return (
    <div className="space-y-4">
      {step.revealIntro && <p className="text-sm text-muted-foreground">{step.revealIntro}</p>}
      {step.intro && !step.revealIntro && <p className="text-sm text-muted-foreground">{step.intro}</p>}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="rounded-md border bg-primary/5 p-3 text-sm">
              {it as string}
            </li>
          ))}
        </ul>
      )}

      {analysisHtml ? (
        <AiAnalysisPanel html={analysisHtml} />
      ) : analyzing ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : null}
    </div>
  );
}
