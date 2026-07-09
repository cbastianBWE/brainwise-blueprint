import { supabase } from "@/integrations/supabase/client";

export interface PairedFacetForPdf {
  itemNumber: number;
  facetName: string;
  shape: string;
  driverScore?: number | null;
  stats?: { a: number; b: number } | null;
}

export type PairedRelationshipMode = "work" | "personal" | "romantic";

export interface PairedPdfSectionData {
  pair_in_three?: Array<{ headline: string; detail: string; action?: string }>;
  driving_facets?: {
    opening?: string;
    strengths?: Array<{ item: number; why: string; actions?: string[]; action?: string }>;
    focus?: Array<{ item: number; why: string; actions?: string[]; action?: string }>;
  };
  within_person?: { a: string | string[]; b: string | string[] };
  needs?: { a_needs_from_b: string | string[]; b_needs_from_a: string | string[] };
  communication?: {
    general: string | string[];
    under_pressure: string | string[];
    avoid_conflict: string[];
  };
  conflict?: {
    summary: string;
    mitigate: string | string[];
    promote_healthy: string | string[];
    per_person?: {
      a: { read: string; counter_move: string };
      b: { read: string; counter_move: string };
    };
  };
  repair?: {
    overview: string;
    a: string | string[];
    b: string | string[];
    steps: string[];
    disclaimer: string;
  };
  intimacy?: { overview: string; a: string[]; b: string[]; disclaimer: string };
  coach?: { why: Array<{ item: number; rationale: string }>; debrief_prompts: string[] };
}

export interface PairedPdfData {
  mode: PairedRelationshipMode;
  nameA: string;
  nameB: string;
  firstA: string;
  firstB: string;
  nm: (s: string) => string;
  dimensions: Record<string, { a: number; b: number }>;
  strengths: PairedFacetForPdf[];
  focusAreas: PairedFacetForPdf[];
  fullMap: PairedFacetForPdf[];
  itemText: Map<number, string>;
  sections: PairedPdfSectionData;
}

export async function assemblePairedPdfData(params: {
  pairedProfileId: string;
  canSeePrivileged: boolean;
}): Promise<PairedPdfData | null> {
  const { pairedProfileId, canSeePrivileged } = params;

  const { data: profile } = await supabase
    .from("paired_profiles" as never)
    .select("id, structured, relationship_mode, narrative_status")
    .eq("id", pairedProfileId)
    .maybeSingle();

  if (!profile) return null;
  const p = profile as unknown as {
    id: string;
    structured: PairedPdfData["dimensions"] extends unknown ? {
      dimensions?: Record<string, { a: number; b: number }>;
      strengths?: PairedFacetForPdf[];
      focusAreas?: PairedFacetForPdf[];
      fullMap?: PairedFacetForPdf[];
      facets?: PairedFacetForPdf[];
    } : never;
    relationship_mode: PairedRelationshipMode;
    narrative_status: string;
  };
  if (p.narrative_status !== "complete") return null;

  const { data: sectionRows } = await supabase
    .from("paired_profile_sections" as never)
    .select("section_type, content")
    .eq("paired_profile_id", pairedProfileId);

  const sections: Record<string, unknown> = {};
  for (const row of (sectionRows ?? []) as Array<{ section_type: string; content: string }>) {
    try {
      sections[row.section_type] =
        typeof row.content === "string" ? JSON.parse(row.content) : row.content;
    } catch {
      // skip
    }
  }
  if (!canSeePrivileged) delete sections.coach;

  let nameA = "Person A";
  let nameB = "Person B";
  try {
    const { data: subj } = await supabase.rpc(
      "bw_paired_profile_subjects" as never,
      { p_profile: pairedProfileId } as never,
    );
    const rows = (subj ?? []) as Array<{ pair_role: "A" | "B"; full_name: string }>;
    const a = rows.find((r) => r.pair_role === "A")?.full_name;
    const b = rows.find((r) => r.pair_role === "B")?.full_name;
    if (a) nameA = a;
    if (b) nameB = b;
  } catch {
    // keep defaults
  }
  const firstA = nameA.split(" ")[0] || "Person A";
  const firstB = nameB.split(" ")[0] || "Person B";
  const nm = (s: string) => (s ?? "").split("Person A").join(firstA).split("Person B").join(firstB);

  const { data: items } = await supabase
    .from("items_presentation" as any)
    .select("item_number,item_text")
    .eq("instrument_id", "INST-001");
  const itemText = new Map<number, string>();
  for (const it of (items ?? []) as Array<{ item_number: number | null; item_text: string }>) {
    if (it.item_number != null) itemText.set(it.item_number, it.item_text);
  }

  return {
    mode: p.relationship_mode,
    nameA,
    nameB,
    firstA,
    firstB,
    nm,
    dimensions: p.structured?.dimensions ?? {},
    strengths: p.structured?.strengths ?? [],
    focusAreas: p.structured?.focusAreas ?? [],
    fullMap: p.structured?.fullMap ?? p.structured?.facets ?? [],
    itemText,
    sections: sections as PairedPdfSectionData,
  };
}
