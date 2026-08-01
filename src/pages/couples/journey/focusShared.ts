import { supabase } from "@/integrations/supabase/client";

/**
 * Focus areas are catalog-driven. Selectability comes only from
 * `self_selectable` / `practitioner_gated`, never from a hardcoded list, and an
 * area is only ever drawn when `content_ready` is true — we don't show a door
 * the couple cannot walk through.
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
}

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

export async function fetchFocusAreas(relationshipId: string): Promise<FocusAreaRow[]> {
  const { data, error } = await supabase.rpc("relationship_focus_areas_state", {
    p_relationship: relationshipId,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as unknown as FocusAreaRow[])
    .filter((r) => r.content_ready)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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
