/**
 * Curated evidence / health-fact panels.
 *
 * These strings live in the backend `definition` as ordinary step `body` text,
 * but they are NOT ordinary coach copy: they are clinically checked statements
 * that must render verbatim and must never be paraphrased or embellished. This
 * map marks which (activity, step) pairs are evidence, and what label the panel
 * carries. Adding a step here changes presentation only — the string still comes
 * from the backend, unaltered.
 */
export interface EvidenceGate {
  label: string;
  /** Optional trailing line rendered under the curated string, also fixed copy. */
  footnote?: string;
}

const GATES: Record<string, EvidenceGate> = {
  // C19.2 — the child-loss divorce-rate correction.
  "mr-c19-2-afterwards:frame": { label: "The evidence" },
  "mr-c19-2-afterwards:honest_picture": { label: "The evidence" },
  // C20.2 — the cardiovascular / erectile-difficulty health point.
  "mr-c20-2-erections:health_point": {
    label: "A health point that matters",
    footnote: "This is information and a referral, nothing more. Book an appointment; don't worry alone.",
  },
  // C20.6 — the ICD-11 / DSM diagnostic position.
  "mr-c20-6-not-a-choice:frame": { label: "Where the science actually stands" },
  "mr-c20-6-not-a-choice:handback": { label: "Where the science actually stands" },
};

export function evidenceGateFor(
  activityCode: string | null | undefined,
  step: { key?: string; id?: string; evidence?: unknown; evidenceLabel?: unknown },
): EvidenceGate | null {
  // A backend-set flag always wins, so this can move server-side with no UI change.
  if (step?.evidence) {
    return { label: typeof step.evidenceLabel === "string" ? step.evidenceLabel : "The evidence" };
  }
  const key = step?.key || step?.id;
  if (!activityCode || !key) return null;
  return GATES[`${activityCode}:${key}`] || null;
}

/**
 * Generic curated-evidence block carried on the step itself:
 *   step.curated_evidence = { label, text, phil_gated: true }
 * Read verbatim from the RAW step (never the name-substituted copy) so the
 * clinically-approved string renders exactly as stored.
 */
export function curatedEvidenceFor(step: any): { label: string; text: string } | null {
  const ce = step?.curated_evidence;
  if (!ce || typeof ce !== "object") return null;
  const text = typeof ce.text === "string" ? ce.text : "";
  if (!text.trim()) return null;
  return { label: typeof ce.label === "string" && ce.label ? ce.label : "The evidence", text };
}

