// Mirrors the backend contract exactly. Do not change these shapes.

export type Disclosure = "full" | "summary";

export interface CoupleContext {
  ownFirstName: string;        // "Sam"
  otherFirstName: string;      // "Josh"
  partnerSubmitted: boolean;   // has the partner finished their side
  barrierCleared: boolean;     // may the reveal be shown
  /** Null until the barrier clears. Never fabricate this client-side. */
  partnerView: { disclosure: Disclosure; responses: Record<string, unknown> } | null;
}

export interface CoupleStep {
  widget: string;
  id?: string;
  key?: string;
  label?: string;
  title?: string;
  barrier?: "both_partners_complete" | "both_partners_locked" | "both_partners_signed";
  conditionOn?: string;
  onComplete?: { writes?: string; touchpoint?: string };
  // paired_qa
  questions?: Array<{ key: string; self: string; read: string; type?: "image_select" }>;
  selfIntro?: string;
  partnerReadIntro?: string;
  subfields?: string[];
  subfieldLabels?: Record<string, string>;
  innerWidget?: string;
  prefilledFrom?: Record<string, string>;
  modes?: string[];
  dualRater?: boolean;
  reveal?: { mode?: string; order?: string; toneRule?: string; generateReads?: boolean; drawCycle?: boolean };
  comparesKey?: string;     // the earlier capture key this step reveals
  guessOf?: string;         // if present, this step captures a PREDICTION of the partner's answer to that key
  capturesHere?: boolean;   // true when this step collects input
  revealsNothing?: boolean; // true when nothing of the partner's is ever shown
  exposesLedger?: boolean;
  // couple_agreement
  starters?: string[];
  selectCount?: number;
  allowCustom?: boolean;
  bothMustAgree?: boolean;
  requiresEscalationPlan?: boolean;
  requiresRainCheck?: boolean;
  requiresWords?: boolean;
  requiresDate?: boolean;
  allowNotNow?: boolean;
  allowNeedToKnowFirst?: boolean;
  requiredToComplete?: boolean;
  // joint_session
  turns?: Array<{ key: string; prompt: string; speaker: "a" | "b" | "both"; listenerReflects?: boolean }>;
  sessionScaffold?: string[];
  structure?: string;
  listenerRule?: string;
  pacing?: string;
  mode?: string;
  drawsFrom?: string[];
  aiRole?: string;
  aiRestraint?: string;
  coachInterjection?: boolean;
  presentOnly?: boolean;
  reflectionStep?: boolean;
  rebuttalBox?: boolean;
  noInterruption?: boolean;
  optIn?: boolean;
  firstSpeaker?: string;
  lessFairSpeaksFirst?: boolean;
  rawPicksAccess?: boolean;
}

/** Replace {other_first_name} (and {own_first_name}) tokens in a prompt string. */
export function substituteNames(text: string, couple: CoupleContext): string {
  return (text || "")
    .replace(/\{other_first_name\}/g, couple.otherFirstName)
    .replace(/\{own_first_name\}/g, couple.ownFirstName);
}
