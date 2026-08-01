/**
 * Privacy affordances for the couples runner.
 *
 * Three facts come from the backend and are never inferred in the UI:
 *  - `partner_mode = 'single'`   -> one participant, private writes only.
 *  - `visibility_mode`           -> 'private' | 'summary_only' | 'staged' | 'shared'.
 *  - `definition.privacy`        -> may set `practitioner_visible: false` / `level: "maximum"`.
 */

export interface ActivityRow {
  code: string;
  partner_mode?: string | null;
  visibility_mode?: string | null;
  practitioner_visibility?: string | null;
  definition?: any;
}

export function isSinglePartner(a: ActivityRow | null | undefined): boolean {
  return (a?.partner_mode || "") === "single";
}

export function isSummaryOnly(a: ActivityRow | null | undefined): boolean {
  const v = (a?.visibility_mode || "").toLowerCase();
  return v === "summary_only" || v === "private";
}

/** True when raw content must never reach the practitioner in any form. */
export function practitionerBlind(a: ActivityRow | null | undefined): boolean {
  const p = a?.definition?.privacy || {};
  if (p.practitioner_visible === false) return true;
  if (String(p.level || "").toLowerCase() === "maximum") return true;
  return String(a?.practitioner_visibility || "").toLowerCase() === "none";
}

export interface PrivacyCopy {
  badge: string;
  detail?: string;
}

export function privacyCopy(a: ActivityRow | null | undefined): PrivacyCopy | null {
  if (!a) return null;
  if (isSinglePartner(a)) {
    return {
      badge: "Private — your partner never sees this.",
      detail: "This one is yours alone. Nothing here appears anywhere in their view.",
    };
  }
  if (!isSummaryOnly(a)) return null;
  return {
    badge: practitionerBlind(a)
      ? "Private — not shared raw; not practitioner-visible"
      : "Private — not shared raw; only a gentle summary passes",
    detail: practitionerBlind(a)
      ? "What you write stays yours. Only a gentle summary passes between the two of you, and your practitioner sees progress only — never this."
      : "What you write stays yours. Only a gentle summary passes between the two of you.",
  };
}
