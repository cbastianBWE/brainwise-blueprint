/**
 * Shared paired-report narrative section types.
 *
 * generate-paired-narrative v19 returns structured bullets
 * ({ point, body, facets }) where earlier versions returned plain strings.
 * Reports generated before v19 are NOT regenerated, so every renderer must
 * accept both shapes. These types are the single source of truth for the
 * page renderer (src/pages/PairedReport.tsx) and the PDF renderer.
 */

export interface BulletObject {
  point: string;
  body: string;
  facets?: string[];
}

export type Bullet = string | BulletObject;

/** A step in an ordered sequence (repair.steps, communication.avoid_conflict). */
export type StepItem = string | { point: string; body: string; facets?: string[] };

export interface PairInThreeItem {
  headline: string;
  detail: string;
  action?: string;
  facets?: string[];
}

export interface DrivingItem {
  item: number;
  why: string;
  actions?: string[];
  action?: string;
}

export interface DrivingFacetsSection {
  opening?: string;
  strengths?: DrivingItem[];
  focus?: DrivingItem[];
  protective?: DrivingItem[];
}

export interface WithinPersonSection {
  a: Bullet[] | string;
  b: Bullet[] | string;
}

export interface NeedsSection {
  a_needs_from_b: Bullet[] | string;
  b_needs_from_a: Bullet[] | string;
}

export interface CommunicationSection {
  general: Bullet[] | string;
  under_pressure: Bullet[] | string;
  avoid_conflict: StepItem[];
}

export interface ConflictPerson {
  read: string;
  counter_move: string;
  facets?: string[];
}

export interface ConflictSection {
  summary: string;
  mitigate: Bullet[] | string;
  promote_healthy: Bullet[] | string;
  per_person?: { a: ConflictPerson; b: ConflictPerson };
  safety?: string;
}

export interface RepairSection {
  overview: string;
  a: Bullet[] | string;
  b: Bullet[] | string;
  steps: StepItem[];
  safety?: string;
  disclaimer: string;
}

export interface IntimacySection {
  overview: string;
  a: Bullet[] | string;
  b: Bullet[] | string;
  disclaimer: string;
}

export interface CoachSection {
  why: { item: number; rationale: string }[];
  debrief_prompts: string[];
}

export interface LeaderActionItem {
  headline: string;
  detail: string;
  action?: string;
}

/* ---------- shape helpers (safe on both old and new data) ---------- */

export function isBulletObject(v: unknown): v is BulletObject {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    (typeof (v as BulletObject).point === "string" ||
      typeof (v as BulletObject).body === "string")
  );
}

/** Flatten a bullet (either shape) to a single display string. */
export function bulletToText(b: Bullet | StepItem): string {
  if (typeof b === "string") return b;
  if (!isBulletObject(b)) return "";
  const point = (b.point ?? "").trim();
  const body = (b.body ?? "").trim();
  if (point && body) return /[.!?]$/.test(point) ? `${point} ${body}` : `${point}. ${body}`;
  return point || body;
}

export function bulletFacets(b: Bullet | StepItem): string[] {
  if (typeof b === "string" || !isBulletObject(b)) return [];
  return Array.isArray(b.facets) ? b.facets.filter((f) => typeof f === "string" && f.trim()) : [];
}

export const MOVE_PREFIX = "The move:";

export function isMoveBullet(b: Bullet): boolean {
  if (typeof b === "string" || !isBulletObject(b)) return false;
  return (b.point ?? "").trim().toLowerCase().startsWith(MOVE_PREFIX.toLowerCase());
}

export function stripMovePrefix(point: string): string {
  const t = (point ?? "").trim();
  return t.toLowerCase().startsWith(MOVE_PREFIX.toLowerCase())
    ? t.slice(MOVE_PREFIX.length).trim()
    : t;
}

/** Normalize the facet name for name-keyed lookups.
 *  Strips the instrument's trailing context suffix so names frozen into older
 *  reports ("Action orientation (professional)") match names from newer ones
 *  ("Action orientation"). Verified collision-free for every item set the paired
 *  and team reports use. */
export function normFacetName(name: string): string {
  return (name ?? "")
    .replace(/\s*\((personal|professional)\)\s*$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Facets whose instrument wording is workplace-specific and needs a relational
 *  label outside work context. Keyed on the normalized facet name. Both spellings
 *  are listed because reports generated before the catalog fix froze the British
 *  form into their structured snapshot. */
const NON_WORK_FACET_LABEL: Record<string, string> = {
  [normFacetName("Values alignment (organisational)")]: "Values alignment (community)",
  [normFacetName("Values alignment (organizational)")]: "Values alignment (community)",
};

/** The label to DISPLAY for a facet. Never use this for lookups. */
export function facetDisplayLabel(
  facetName: string,
  mode?: string | null,
): string {
  // Always drop the instrument's context suffix. It is noise on every report:
  // the document already establishes the context.
  const base = (facetName ?? "").replace(/\s*\((personal|professional)\)\s*$/i, "").trim();
  if (mode === "work") return base;
  return NON_WORK_FACET_LABEL[normFacetName(base)] ?? base;
}


/* ---------- v20: the printable one-pager ---------- */

export interface OnePagerVoiceLine {
  text: string;
  facets?: string[];
}

export interface OnePagerShared {
  strong: OnePagerVoiceLine;
  talk: OnePagerVoiceLine;
  fight: OnePagerVoiceLine;
  repair: OnePagerVoiceLine;
}

/** First-person voice column. "I" is the speaker, "you" is the partner. */
export interface OnePagerVoice {
  bring: OnePagerVoiceLine;
  need: OnePagerVoiceLine;
  talk: OnePagerVoiceLine;
  clash: OnePagerVoiceLine;
  repair: OnePagerVoiceLine;
  /** romantic mode only */
  close?: OnePagerVoiceLine;
}

export interface OnePagerWatchItem {
  point: string;
  body: string;
  facets?: string[];
}

export interface OnePagerPreviewItem {
  section: string;
  heading: string;
  text: string;
  facets?: string[];
}

export interface OnePagerSection {
  title: string;
  opening: string;
  shared: OnePagerShared;
  a_to_b: OnePagerVoice;
  b_to_a: OnePagerVoice;
  watch: OnePagerWatchItem[];
  talk_about: string[];
  report_preview?: OnePagerPreviewItem[];
  disclaimer: string;
}
