import { AiAnalysisPanel } from "@/components/coaching/CoachingViews";
import { isMMRec, type MMValue } from "@/components/coaching/MultimodalField";
import type { CoupleContext, CoupleStep } from "../coupleShared";

const asText = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (isMMRec(v as MMValue)) return ((v as any).transcript || "").trim();
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join("\n");
  if (typeof v === "object") {
    return Object.values(v as Record<string, unknown>).map(asText).filter(Boolean).join("\n");
  }
  return String(v);
};

/** Resolve a column `from` path against own responses or the partner view. Never fetches. */
function resolveFrom(
  from: string,
  responses: Record<string, unknown>,
  couple: CoupleContext,
): { lines: string[]; gated: boolean } {
  const parts = (from || "").split(".");
  const partnerSide = parts[0] === "partner";
  const path = partnerSide ? parts.slice(1) : parts;

  if (partnerSide && !couple.partnerView) return { lines: [], gated: true };

  let node: unknown = partnerSide ? couple.partnerView?.responses : responses;
  for (const p of path) {
    if (node && typeof node === "object") node = (node as Record<string, unknown>)[p];
    else return { lines: [], gated: false };
  }
  if (node == null) return { lines: [], gated: false };
  const lines = Array.isArray(node)
    ? node.map(asText).filter(Boolean)
    : asText(node).split("\n").filter(Boolean);
  return { lines, gated: false };
}

export function SynthesisWidget({
  step,
  couple,
  responses,
  analysisHtml,
}: {
  step: CoupleStep;
  couple: CoupleContext;
  responses: Record<string, unknown>;
  analysisHtml?: string;
}) {
  const columns = step.columns || [];

  if (columns.length > 0) {
    return (
      <div className="space-y-4">
        {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((c) => {
            const { lines, gated } = resolveFrom(c.from, responses, couple);
            return (
              <div key={c.key} className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-semibold">{c.label}</p>
                {gated ? (
                  step.waitingCopy ? (
                    <p className="text-sm text-muted-foreground">{step.waitingCopy}</p>
                  ) : null
                ) : lines.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {lines.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}
      {analysisHtml && <AiAnalysisPanel html={analysisHtml} />}
    </div>
  );
}
