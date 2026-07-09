import { supabase } from "@/integrations/supabase/client";

export interface TeamFacetForPdf {
  itemNumber: number;
  facetName: string;
  shape: string;
  driverScore?: number | null;
  stats?: { n: number; mean: number; min: number; max: number; range: number } | null;
}

export interface TeamPdfSectionData {
  team_in_three?: Array<{ headline: string; detail: string; action?: string }>;
  driving_facets?: {
    opening?: string;
    strengths?: Array<{ item: number; why: string; actions?: string[]; action?: string }>;
    focus?: Array<{ item: number; why: string; actions?: string[]; action?: string }>;
  };
  communication?: {
    general: string | string[];
    under_pressure: string | string[];
    avoid_conflict: string[];
  };
  conflict?: { summary: string; mitigate: string | string[]; promote_healthy: string | string[] };
  leader_brief?: {
    rows: Array<{ item: number; risk_to_work: string; the_move: string; potential_owner: string }>;
    lean_on: string;
  };
  coach?: { why: Array<{ item: number; rationale: string }>; debrief_prompts: string[] };
}

export interface TeamPdfData {
  teamName: string;
  memberCount: number;
  domains: Record<string, { mean: number; high: number; low: number }>;
  strengths: TeamFacetForPdf[];
  focusAreas: TeamFacetForPdf[];
  fullMap: TeamFacetForPdf[];
  scoresByItem: Map<number, number[]>;
  itemText: Map<number, string>;
  sections: TeamPdfSectionData;
}

export async function assembleTeamPdfData(params: {
  teamProfileId: string;
  canSeePrivileged: boolean;
}): Promise<TeamPdfData | null> {
  const { teamProfileId, canSeePrivileged } = params;

  const { data: profile } = await supabase
    .from("team_profiles" as never)
    .select("id, structured, narrative_status, member_count, report_label")
    .eq("id", teamProfileId)
    .maybeSingle();

  if (!profile) return null;
  const p = profile as unknown as {
    id: string;
    structured: {
      dimensions?: Record<string, { mean: number; high: number; low: number }>;
      strengths?: TeamFacetForPdf[];
      focusAreas?: TeamFacetForPdf[];
      fullMap?: TeamFacetForPdf[];
      facets?: TeamFacetForPdf[];
    };
    narrative_status: string;
    member_count: number;
    report_label: string | null;
  };
  if (p.narrative_status !== "complete") return null;

  const { data: sectionRows } = await supabase
    .from("team_profile_sections" as never)
    .select("section_type, content")
    .eq("team_profile_id", teamProfileId);

  const sections: Record<string, unknown> = {};
  for (const row of (sectionRows ?? []) as Array<{ section_type: string; content: string }>) {
    try {
      sections[row.section_type] =
        typeof row.content === "string" ? JSON.parse(row.content) : row.content;
    } catch {
      // skip
    }
  }
  if (!canSeePrivileged) {
    delete sections.leader_brief;
    delete sections.coach;
  }

  const { data: items } = await supabase
    .from("items_presentation" as any)
    .select("item_number,item_text")
    .eq("instrument_id", "INST-001");
  const itemText = new Map<number, string>();
  for (const it of (items ?? []) as Array<{ item_number: number | null; item_text: string }>) {
    if (it.item_number != null) itemText.set(it.item_number, it.item_text);
  }

  const scoresByItem = new Map<number, number[]>();
  try {
    const { data: dist } = await supabase.rpc(
      "bw_team_profile_distribution" as never,
      { p_profile: teamProfileId } as never,
    );
    const rows = (dist ?? []) as Array<{ item_number: number; scores: number[] }>;
    for (const r of rows) {
      scoresByItem.set(r.item_number, (r.scores ?? []).slice().sort((a, b) => a - b));
    }
  } catch {
    // leave empty; generator will fall back to plain rows
  }

  return {
    teamName: p.report_label ?? "Team",
    memberCount: p.member_count,
    domains: p.structured?.dimensions ?? {},
    strengths: p.structured?.strengths ?? [],
    focusAreas: p.structured?.focusAreas ?? [],
    fullMap: p.structured?.fullMap ?? p.structured?.facets ?? [],
    scoresByItem,
    itemText,
    sections: sections as TeamPdfSectionData,
  };
}
