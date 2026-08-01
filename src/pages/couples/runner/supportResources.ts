/**
 * Tier 3 support-resource routing.
 *
 * The UI NEVER decides that a couple needs human support. The signals are
 * computed server-side: an activity *arms* a signal in `definition.safety`
 * (e.g. `distress_signal: "deterministic_server_side_routes_to_support"`) and
 * the server *fires* it by writing it into the session responses under
 * `signals`. This module only reads those two facts and picks the curated
 * resource list. Nothing here is model-generated.
 */

export type SupportSignal =
  | "crisis_signal"
  | "safety_signal"
  | "distress_signal"
  | "loss_of_control_signal";

export type ResourceKind =
  | "crisis"
  | "bereavement"
  | "lgbtq_safety"
  | "family_support"
  | "trauma"
  | "clinician";

export interface SupportResource {
  name: string;
  detail: string;
  contact?: string;
  href?: string;
}

/** Curated data. Phil-gated: edit here, never generate. */
export const RESOURCE_LISTS: Record<ResourceKind, { heading: string; blurb: string; items: SupportResource[] }> = {
  crisis: {
    heading: "Please talk to someone now",
    blurb: "If either of you is in danger or thinking about ending your life, this comes before anything on this screen.",
    items: [
      { name: "Samaritans", detail: "Free, 24 hours a day, every day.", contact: "116 123", href: "https://www.samaritans.org" },
      { name: "Emergency services", detail: "If there is immediate danger to anyone.", contact: "999" },
      { name: "Shout", detail: "Text support, 24/7.", contact: "Text SHOUT to 85258", href: "https://giveusashout.org" },
    ],
  },
  bereavement: {
    heading: "Support for grief",
    blurb: "People who do only this, and who will not be frightened by anything you say.",
    items: [
      { name: "Cruse Bereavement Support", detail: "Helpline and one-to-one support.", contact: "0808 808 1677", href: "https://www.cruse.org.uk" },
      { name: "The Compassionate Friends", detail: "For parents after the death of a child.", contact: "0345 123 2304", href: "https://www.tcf.org.uk" },
      { name: "Survivors of Bereavement by Suicide", detail: "For people bereaved by suicide.", contact: "0300 111 5065", href: "https://uksobs.com" },
      { name: "Sands", detail: "Pregnancy and baby loss.", contact: "0808 164 3332", href: "https://www.sands.org.uk" },
    ],
  },
  lgbtq_safety: {
    heading: "Support that will understand this",
    blurb: "Safety first, always, and people who work with this every day.",
    items: [
      { name: "Switchboard LGBT+ Helpline", detail: "Listening, information, no assumptions.", contact: "0800 0119 100", href: "https://switchboard.lgbt" },
      { name: "Galop", detail: "For LGBT+ people experiencing abuse or hostility.", contact: "0800 999 5428", href: "https://galop.org.uk" },
      { name: "Emergency services", detail: "If anyone is at risk right now.", contact: "999" },
    ],
  },
  family_support: {
    heading: "Support for families",
    blurb: "For the family outside, which is its own load and deserves its own help.",
    items: [
      { name: "Prison Advice and Care Trust (Pact)", detail: "Support for prisoners' families.", contact: "0808 808 2003", href: "https://www.prisonadvice.org.uk" },
      { name: "Family Lives", detail: "Confidential support for any family situation.", contact: "0808 800 2222", href: "https://www.familylives.org.uk" },
    ],
  },
  trauma: {
    heading: "Trauma-informed support",
    blurb: "This is worth taking to someone trained in it, at your own pace.",
    items: [
      { name: "Rape Crisis", detail: "For anyone affected by sexual violence, at any time in their life.", contact: "0808 500 2222", href: "https://rapecrisis.org.uk" },
      { name: "Victim Support", detail: "Free and confidential, whether or not anything was reported.", contact: "0808 168 9111", href: "https://www.victimsupport.org.uk" },
      { name: "Your GP", detail: "A route into trauma-informed therapy on the NHS." },
    ],
  },
  clinician: {
    heading: "This is worth a clinician",
    blurb: "Not a verdict, and not a diagnosis from us. A person who can actually assess it.",
    items: [
      { name: "Your GP", detail: "The usual first step, and a referral route." },
      { name: "COSRT", detail: "Accredited psychosexual and relationship therapists.", href: "https://www.cosrt.org.uk" },
      { name: "NHS talking therapies", detail: "Self-referral in most of England.", href: "https://www.nhs.uk/service-search/mental-health/find-an-nhs-talking-therapies-service" },
    ],
  },
};

/** Signal -> curated list. `distress_signal` narrows on the armed value's wording. */
export function resourceKindFor(signal: SupportSignal, armedValue?: string): ResourceKind {
  const v = (armedValue || "").toLowerCase();
  switch (signal) {
    case "crisis_signal":
      return "crisis";
    case "safety_signal":
      return "lgbtq_safety";
    case "loss_of_control_signal":
      return "clinician";
    case "distress_signal":
    default:
      if (v.includes("bereave") || v.includes("grief") || v.includes("loss")) return "bereavement";
      if (v.includes("family")) return "family_support";
      if (v.includes("trauma")) return "trauma";
      return "bereavement";
  }
}

const SIGNAL_KEYS: SupportSignal[] = [
  "crisis_signal",
  "safety_signal",
  "distress_signal",
  "loss_of_control_signal",
];

/** Signals this activity is allowed to fire, from `definition.safety`. */
export function armedSignals(definition: any): Partial<Record<SupportSignal, string>> {
  const safety = (definition?.safety || {}) as Record<string, unknown>;
  const out: Partial<Record<SupportSignal, string>> = {};
  for (const k of SIGNAL_KEYS) {
    const v = safety[k];
    if (typeof v === "string" && v.length > 0) out[k] = v;
    else if (v === true) out[k] = "";
  }
  // C17 arms its Tier 3 safety signal under a descriptive flag.
  if (safety.tier3_safety_signal_armed === true || safety.tier3_safety_signal_governs === true) {
    out.safety_signal = out.safety_signal ?? "";
  }
  return out;
}

/**
 * Signals the SERVER says actually fired for this session. Anything not armed
 * on the activity is ignored, and the client never infers a signal itself.
 */
export function firedSignals(
  definition: any,
  responses: Record<string, unknown> | null | undefined,
): Array<{ signal: SupportSignal; kind: ResourceKind }> {
  const armed = armedSignals(definition);
  const raw = (responses as any)?.signals;
  const list: string[] = Array.isArray(raw)
    ? raw.filter((s) => typeof s === "string")
    : raw && typeof raw === "object"
      ? Object.keys(raw).filter((k) => (raw as any)[k] === true)
      : [];
  const seen = new Set<string>();
  const out: Array<{ signal: SupportSignal; kind: ResourceKind }> = [];
  for (const s of list) {
    if (!SIGNAL_KEYS.includes(s as SupportSignal)) continue;
    const sig = s as SupportSignal;
    if (!(sig in armed)) continue;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({ signal: sig, kind: resourceKindFor(sig, armed[sig]) });
  }
  // Crisis always leads.
  return out.sort((a, b) => (a.signal === "crisis_signal" ? -1 : b.signal === "crisis_signal" ? 1 : 0));
}

/** Activities that carry the standing sensitive-topic footer. */
const STANDING_FOOTER_CODES = new Set([
  "mr-c19-4-after-a-suicide",
  "mr-c19-7-living-with-it",
  "mr-c20-7-past-in-the-bed",
]);

export function hasStandingFooter(activityCode: string | null | undefined): boolean {
  return !!activityCode && STANDING_FOOTER_CODES.has(activityCode);
}

export const STANDING_FOOTER_COPY =
  "If you or your partner are struggling to cope, please reach out to the support services listed here, and to your practitioner.";

/**
 * True when the SERVER wrote a named non-resource signal (e.g.
 * `practitioner_required`) into the session responses. Same shape rules as
 * `firedSignals`; the client never infers these.
 */
export function serverSignal(
  responses: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  const raw = (responses as any)?.signals;
  if (Array.isArray(raw)) return raw.includes(key);
  if (raw && typeof raw === "object") return (raw as any)[key] === true;
  return false;
}
