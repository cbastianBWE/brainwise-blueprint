// Mirrors the backend contract exactly. Do not change these shapes.

export type Disclosure = "full" | "summary";

export interface CoupleContext {
  ownFirstName: string;        // "Sam"
  otherFirstName: string;      // "Josh"
  partnerSubmitted: boolean;   // has the partner finished their side
  barrierCleared: boolean;     // may the reveal be shown
  /** Partner's auth user id, when the backend exposes it. */
  partnerUserId?: string | null;
  /** Null until the barrier clears. Never fabricate this client-side. */
  partnerView: { disclosure: Disclosure; responses: Record<string, unknown> } | null;
}

export interface CoupleStep {
  widget: string;
  id?: string;
  key?: string;
  label?: string;
  title?: string;
  intro?: string;
  body?: string;
  buttonLabel?: string;
  waitingCopy?: string;
  revealIntro?: string;
  // journey_map
  selectionKey?: string;
  practitionerGatedAreas?: string[];
  // visibility_explainer
  visibilityModes?: Array<{ key: string; label: string; example: string }>;
  // guess_lock / profile_reveal
  dimensions?: string[];
  instrument?: string;
  subject?: string;
  showOwnScoresAsReference?: boolean;
  confidenceTap?: string[];
  guessSource?: string;
  truthSource?: string;
  revealMode?: string;
  order?: string;
  generateReads?: boolean;
  // safety_screen
  itemsSource?: string;
  private?: boolean;
  concernRouting?: string;
  practitionerFlag?: string;
  branches?: Record<string, string>;
  evaluator?: string;
  deterministic?: boolean;
  resourcesFrom?: string;
  routesTo?: string;

  // couple_timeline
  eventFields?: string[];
  eventFieldLabels?: Record<string, string>;
  valenceOptions?: string[];
  valenceLabels?: Record<string, string>;
  minEvents?: number;
  softTarget?: number;
  forwardLooking?: boolean;

  // synthesis
  displayOnly?: boolean;
  columns?: Array<{ key: string; label: string; from: string }>;
  rule?: string;

  // overlap_reveal
  computedBy?: string;

  // own_readback
  readback?: { from: string; key: string; emptyCopy?: string };
  ownOnly?: boolean;

  // reused_steps
  reuse_from?: string;
  reworked_from?: string;
  gentle?: boolean;
  namesOnly?: boolean;

  // desire_grid
  gridMode?: "affection" | "desire";
  itemsFrom?: { table?: string; bank?: string; groupBy?: string; groupLabel?: string };
  buckets?: Array<{ key: string; label: string }>;
  storeTo?: string;
  neverJoined?: boolean;
  runNumber?: number;
  items?: Array<string | { key?: string; label?: string; imageUrl?: string }>;

  // couple_molecule
  centre?: string;
  bondEffects?: string[];

  // ikigai / misc passthrough
  dualLayer?: boolean;


  // statement_select
  options?: string[];
  selectMin?: number;
  selectMax?: number;
  barrier?: "both_partners_complete" | "both_partners_locked" | "both_partners_signed";

  conditionOn?: { step: string; flag: string; equals?: boolean };
  onComplete?: { writes?: string; touchpoint?: string };
  // paired_qa
  questions?: Array<{
    key: string;
    self: string;
    read: string;
    type?: "image_select";
    source?: { library?: string };
    pageSize?: number;
    selectMin?: number;
  }>;
  selfIntro?: string;
  partnerReadIntro?: string;
  subfields?: string[];
  subfieldLabels?: Record<string, string>;
  innerWidget?: string;
  /** targetSubfield -> { from: <activityCode>, key: <responseKey> } (legacy: a plain string, ignored) */
  prefilledFrom?: Record<string, string | { from: string; key: string }>;
  modes?: string[];
  dualRater?: boolean;
  reveal?: { mode?: string; order?: string; toneRule?: string; generateReads?: boolean; drawCycle?: boolean; highlight?: string[] };
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
  /**
   * Practitioner expectation for a keystone session. `required_if` names a
   * server-side condition (e.g. "c19_4_in_path") — the client NEVER evaluates
   * it, it only reads the `practitioner_required` signal the server fires.
   */
  practitionerRule?: { recommended?: boolean; required_if?: string };

  pacing?: string;
  mode?: string;
  drawsFrom?: string[] | string;
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

/** Replace {other_first_name} (and {own_first_name} / {first_name}) tokens in a prompt string. */
export function substituteNames(text: string, couple: CoupleContext): string {
  return (text || "")
    .replace(/\{other_first_name\}/g, couple.otherFirstName)
    .replace(/\{own_first_name\}/g, couple.ownFirstName)
    .replace(/\{first_name\}/g, couple.ownFirstName);
}

/** Recursively substitute {other_first_name} and {first_name} in every string. */
export function substituteStep<T>(node: T, couple: CoupleContext): T {
  if (typeof node === "string") return substituteNames(node, couple) as unknown as T;
  if (Array.isArray(node)) return node.map((n) => substituteStep(n, couple)) as unknown as T;
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = substituteStep(v, couple);
    }
    return out as T;
  }
  return node;
}

/** The four answer modes a couple field may offer, filtered by what the step declares. */
export type CoupleMode = "text" | "dictate" | "audio" | "video";
const ALL_MODES: CoupleMode[] = ["text", "dictate", "audio", "video"];
export function allowedModes(step: CoupleStep): CoupleMode[] {
  if (!step.modes || step.modes.length === 0) return ALL_MODES;
  const picked = ALL_MODES.filter((m) => step.modes!.includes(m));
  return picked.length > 0 ? picked : ["text"];
}

/**
 * A step's condition may only be satisfied by the exact step it names.
 * No global scan of the response bag.
 */
export function conditionMet(step: CoupleStep, responses: Record<string, unknown> | null | undefined): boolean {
  const c = step.conditionOn;
  if (!c) return true;
  const want = c.equals ?? true;
  const produced = responses?.[c.step];
  const actual = !!(produced && typeof produced === "object" && (produced as any)[c.flag] === true);
  return actual === want;
}
