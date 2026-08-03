import { supabase } from "@/integrations/supabase/client";

/**
 * Focus Stops — the off-road half of the journey.
 *
 * Milestones sit on the road; Focus Stops sit beside it. The vocabulary is
 * "Focus Stop" everywhere in the UI: never "focus area", "detour" or "pit stop".
 *
 * Two rules govern everything here:
 *  1. Content always renders. `relationship_focus_area_activities` returns full
 *     content for every activity whether or not the couple has chosen the stop —
 *     browsing before choosing is the point. `allowed` / `reason_code` choose the
 *     lock treatment, never whether a row is shown.
 *  2. Gating is per activity, not per area. The padlock comes from the row's own
 *     `practitioner_gated` column, which stays true even while `reason_code`
 *     reports something earlier in the chain (e.g. focus_area_not_selected).
 */

export interface FocusStopArea {
  area_code: string;
  c_number: number;
  title: string;
  cluster: string | null;
  description: string | null;
  planned_activity_count: number | null;
  gate: string | null;
  practitioner_gated: boolean;
  self_selectable: boolean;
  content_ready: boolean;
  hero_image_url: string | null;
  sort_order: number | null;
  core_prereq_label: string | null;
  selected: boolean;
  total_activities: number | null;
  done_activities: number | null;
  available_activities: number | null;
}

export interface FocusStopActivity {
  activity_id: string;
  code: string;
  title: string;
  seq: number;
  hero_image_url: string | null;
  tags: string[] | null;
  est_minutes_low: number | null;
  est_minutes_high: number | null;
  time_estimate: string | null;
  briefing_description: string | null;
  briefing_prerequisites: string | null;
  learning_outcomes: string[] | null;
  /** Raw codes. Never rendered. */
  prerequisite_codes: string[] | null;
  /** Readable titles in journey order — the only prerequisite list we show. */
  prerequisite_titles: string[] | null;
  practitioner_gated: boolean;
  visibility_mode: string | null;
  barrier_blocks: string | null;
  partner_mode: string | null;
  romantic_disclaimer: boolean | null;
  repeatable: boolean | null;
  allowed: boolean;
  /** Machine key plus colon-delimited payload. Never rendered. */
  reason: string | null;
  reason_code: string | null;
  reason_detail: string[] | null;
  own_status: string | null;
  own_step: number | null;
  partner_status: string | null;
}

export interface FocusCluster {
  cluster: string;
  sortOrder: number;
  areas: FocusStopArea[];
}

export async function fetchFocusStopAreas(relationshipId: string): Promise<FocusStopArea[]> {
  const { data, error } = await supabase.rpc("relationship_focus_areas_state", {
    p_relationship: relationshipId,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as unknown as FocusStopArea[])
    .slice()
    .sort(
      (a, b) =>
        (a.sort_order ?? a.c_number ?? 0) - (b.sort_order ?? b.c_number ?? 0) ||
        (a.c_number ?? 0) - (b.c_number ?? 0),
    );
}

export async function fetchFocusStopActivities(
  relationshipId: string,
  areaCode: string,
): Promise<FocusStopActivity[]> {
  const { data, error } = await supabase.rpc("relationship_focus_area_activities", {
    p_relationship: relationshipId,
    p_area_code: areaCode,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as unknown as FocusStopActivity[]).slice().sort((a, b) => a.seq - b.seq);
}

/**
 * Groups areas into clusters. Counts are always derived from the rows so a new
 * area shows up without anyone editing a hardcoded number.
 */
export function groupByCluster(areas: FocusStopArea[]): FocusCluster[] {
  const m = new Map<string, FocusCluster>();
  for (const a of areas) {
    const key = a.cluster || "Other";
    if (!m.has(key)) {
      m.set(key, { cluster: key, sortOrder: a.sort_order ?? a.c_number ?? 0, areas: [] });
    }
    const c = m.get(key)!;
    c.sortOrder = Math.min(c.sortOrder, a.sort_order ?? a.c_number ?? 0);
    c.areas.push(a);
  }
  return Array.from(m.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  completed: "Completed",
  done: "Done",
};

export interface FocusLock {
  /** True when this is a real lock rather than "not chosen yet". */
  locked: boolean;
  /** "not_chosen" prompts the couple to add the stop instead of blocking them. */
  kind: "open" | "not_chosen" | "practitioner" | "blocked" | "quiet";
  sentence: string;
  /** Real activity titles, already resolved by the RPC. */
  titles: string[];
}

/**
 * Lock copy by `reason_code`. `reason` itself is never rendered — it carries a
 * colon-delimited payload — and an unknown code fails quietly rather than
 * printing a machine key at a participant.
 */
export function focusLock(
  a: Pick<FocusStopActivity, "allowed" | "reason_code" | "reason_detail">,
  otherName: string,
): FocusLock {
  if (a.allowed) return { locked: false, kind: "open", sentence: "", titles: [] };
  const detail = (a.reason_detail || []).filter(Boolean);
  switch ((a.reason_code || "").trim()) {
    case "ok":
      return { locked: false, kind: "open", sentence: "", titles: [] };
    case "focus_area_not_selected":
      return {
        locked: false,
        kind: "not_chosen",
        sentence: "You have not added this Focus Stop yet.",
        titles: [],
      };
    case "practitioner_opens_this":
      return {
        locked: true,
        kind: "practitioner",
        sentence: "Your practitioner opens this one.",
        titles: [],
      };
    case "prerequisite_incomplete":
      return {
        locked: true,
        kind: "blocked",
        sentence: detail.length
          ? "Opens once you have finished"
          : "Opens once you have finished the earlier activities.",
        titles: detail,
      };
    case "awaiting_partner":
      return {
        locked: true,
        kind: "blocked",
        sentence: detail.length
          ? `Opens once ${otherName} has finished`
          : `Opens once ${otherName} has finished the earlier activities.`,
        titles: detail,
      };
    case "catch_up_required":
      return {
        locked: true,
        kind: "blocked",
        sentence: "There's something waiting for you to read. Open that first.",
        titles: [],
      };
    case "paced_by_practitioner":
      return {
        locked: true,
        kind: "blocked",
        sentence: "Your practitioner has set the pace for now.",
        titles: [],
      };
    default:
      // Includes `unavailable` (not published) — fail quietly.
      return { locked: true, kind: "quiet", sentence: "Not open yet.", titles: [] };
  }
}
