import { supabase } from "@/integrations/supabase/client";

/**
 * Focus areas are catalog-driven. Selectability comes only from
 * `self_selectable` / `practitioner_gated`, never from a hardcoded list, and an
 * area is only ever *enterable* when `content_ready` is true — the catalog may
 * still show it as "Coming soon", but nothing behind it can be started.
 *
 * The state RPC does not return the presentational catalog fields (tags,
 * learning outcomes, active), so those are read straight from
 * `relationship_focus_areas` (authenticated read is limited to `active` rows)
 * and merged on `area_code`.
 */
export interface FocusAreaRow {
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
  /** From the catalog table, not the state RPC. */
  tags: string[] | null;
  learning_outcomes: string[] | null;
}

/** Small badge copy for the review/practitioner gate on an area. */
export const GATE_LABEL: Record<string, string> = {
  phil: "Reviewed",
  clinical: "Clinically reviewed",
  practitioner: "Practitioner-led",
  practitioner_partial: "Partly practitioner-led",
  specialist: "Specialist support",
};

export interface FocusActivityRow {
  activity_id: string;
  code: string;
  title: string;
  module_number: number;
  sequence: number;
  est_minutes_low: number | null;
  est_minutes_high: number | null;
  allowed: boolean;
  reason: string | null;
  reason_code: string | null;
  reason_detail: string[] | null;
  own_status: string | null;
  partner_status: string | null;
  reveal_pending: boolean | null;
  reveal_step_id: string | null;
}

interface CatalogRow {
  area_code: string;
  tags: string[] | null;
  learning_outcomes: string[] | null;
  description: string | null;
  hero_image_url: string | null;
  cluster: string | null;
  sort_order: number | null;
  gate: string | null;
  planned_activity_count: number | null;
}

/**
 * Every active area, whether or not its content is ready. Callers that lead a
 * couple *into* an area must gate on `content_ready` themselves.
 */
export async function fetchFocusAreas(relationshipId: string): Promise<FocusAreaRow[]> {
  const [stateRes, catalogRes] = await Promise.all([
    supabase.rpc("relationship_focus_areas_state", { p_relationship: relationshipId }),
    supabase
      .from("relationship_focus_areas")
      .select(
        "area_code, tags, learning_outcomes, description, hero_image_url, cluster, sort_order, gate, planned_activity_count",
      )
      .eq("active", true),
  ]);

  if (stateRes.error || !Array.isArray(stateRes.data)) return [];
  const catalog = new Map<string, CatalogRow>(
    ((catalogRes.data as CatalogRow[] | null) || []).map((r) => [r.area_code, r]),
  );

  return (stateRes.data as unknown as FocusAreaRow[])
    // Anything not in the active catalog is not shown at all.
    .filter((r) => catalog.has(r.area_code))
    .map((r) => {
      const c = catalog.get(r.area_code)!;
      return {
        ...r,
        tags: c.tags ?? null,
        learning_outcomes: c.learning_outcomes ?? null,
        description: r.description ?? c.description ?? null,
        hero_image_url: r.hero_image_url ?? c.hero_image_url ?? null,
        cluster: r.cluster ?? c.cluster ?? null,
        gate: r.gate ?? c.gate ?? null,
        sort_order: r.sort_order ?? c.sort_order ?? null,
        planned_activity_count: r.planned_activity_count ?? c.planned_activity_count ?? null,
      };
    })
    .sort(
      (a, b) =>
        (a.sort_order ?? a.c_number ?? 0) - (b.sort_order ?? b.c_number ?? 0) ||
        (a.c_number ?? 0) - (b.c_number ?? 0),
    );
}


export async function fetchFocusActivities(
  relationshipId: string,
  areaCode: string,
): Promise<FocusActivityRow[]> {
  const { data, error } = await supabase.rpc("relationship_focus_state", {
    p_relationship: relationshipId,
    p_area_code: areaCode,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as unknown as FocusActivityRow[])
    .slice()
    .sort((a, b) => a.module_number - b.module_number || a.sequence - b.sequence);
}
