import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TeamNarrativeStatus = "pending" | "generating" | "complete" | "error";

export interface TeamFacetResult {
  itemNumber: number;
  facetName: string;
  domain: string;
  shape: string;
  label: string | null;
  labelClass?: string | null;
  driverScore?: number | null;
  magnitude?: number | null;
  shapeStrength?: number | null;
  breadth?: number | null;
  bucket?: string | null;
  stats?: { n: number; mean: number; min: number; max: number; range: number };
}

export interface TeamProfileRow {
  id: string;
  narrative_status: TeamNarrativeStatus;
  member_count: number;
  item_set: string | null;
  team_id: string | null;
  generated_by_role: string | null;
  report_label: string | null;
  structured: {
    dimensions?: Record<string, { mean: number; high: number; low: number; facetCount?: number }>;
    strengths?: TeamFacetResult[];
    focusAreas?: TeamFacetResult[];
    fullMap?: TeamFacetResult[];
    facets?: TeamFacetResult[];
  } | null;
}

export type TeamSectionsMap = Record<string, unknown>;

interface UseTeamProfileResult {
  loading: boolean;
  noAccess: boolean;
  profile: TeamProfileRow | null;
  sections: TeamSectionsMap;
  status: TeamNarrativeStatus | null;
  refetchSections: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

export function useTeamProfile(teamProfileId: string | undefined): UseTeamProfileResult {
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);
  const [profile, setProfile] = useState<TeamProfileRow | null>(null);
  const [sections, setSections] = useState<TeamSectionsMap>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const fetchSections = useCallback(async () => {
    if (!teamProfileId) return;
    const { data } = await supabase
      .from("team_profile_sections" as never)
      .select("section_type, content")
      .eq("team_profile_id", teamProfileId);
    if (cancelledRef.current) return;
    const map: TeamSectionsMap = {};
    for (const row of (data ?? []) as Array<{ section_type: string; content: string }>) {
      try {
        map[row.section_type] =
          typeof row.content === "string" ? JSON.parse(row.content) : row.content;
      } catch {
        // skip unparseable
      }
    }
    setSections(map);
  }, [teamProfileId]);

  const fetchProfile = useCallback(
    async (initial: boolean) => {
      if (!teamProfileId) return;
      const { data, error } = await supabase
        .from("team_profiles" as never)
        .select("id, structured, narrative_status, member_count, item_set, team_id, generated_by_role")
        .eq("id", teamProfileId)
        .maybeSingle();
      if (cancelledRef.current) return;
      if (error || !data) {
        if (initial) setNoAccess(true);
        setLoading(false);
        return;
      }
      const row = data as unknown as TeamProfileRow;
      setProfile(row);
      setNoAccess(false);
      if (initial) {
        await fetchSections();
      }
      setLoading(false);
    },
    [teamProfileId, fetchSections],
  );

  useEffect(() => {
    if (!teamProfileId) {
      setLoading(false);
      return;
    }
    cancelledRef.current = false;
    void fetchProfile(true);
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [teamProfileId, fetchProfile]);

  return {
    loading,
    noAccess,
    profile,
    sections,
    status: profile?.narrative_status ?? null,
    refetchSections: fetchSections,
    refetchProfile: () => fetchProfile(false),
  };
}
