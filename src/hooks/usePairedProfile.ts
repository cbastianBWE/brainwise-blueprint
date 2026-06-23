import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PairedNarrativeStatus = "pending" | "generating" | "complete" | "error";
export type PairedRelationshipMode = "work" | "personal" | "romantic";

export interface PairedFacetResult {
  itemNumber: number;
  facetName: string;
  domain: string;
  shape: string;
  label: string | null;
  labelClass?: string | null;
  driverScore?: number | null;
  fragile?: boolean | null;
  stats?: { a: number; b: number; diff?: number; mean?: number };
}

export interface PairedProfileRow {
  id: string;
  relationship_mode: PairedRelationshipMode;
  narrative_status: PairedNarrativeStatus;
  item_set: string | null;
  structured: {
    dimensions?: Record<string, { a: number; b: number; facetCount?: number }>;
    strengths?: PairedFacetResult[];
    focusAreas?: PairedFacetResult[];
    fullMap?: PairedFacetResult[];
    facets?: PairedFacetResult[];
  } | null;
}

export interface PairedSubject {
  pair_role: "A" | "B";
  user_id: string;
}

export type PairedSectionsMap = Record<string, unknown>;

interface UsePairedProfileResult {
  loading: boolean;
  noAccess: boolean;
  profile: PairedProfileRow | null;
  mode: PairedRelationshipMode | null;
  sections: PairedSectionsMap;
  subjects: PairedSubject[];
  status: PairedNarrativeStatus | null;
}

export function usePairedProfile(pairedProfileId: string | undefined): UsePairedProfileResult {
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);
  const [profile, setProfile] = useState<PairedProfileRow | null>(null);
  const [sections, setSections] = useState<PairedSectionsMap>({});
  const [subjects, setSubjects] = useState<PairedSubject[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pairedProfileId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const fetchSections = async () => {
      const { data } = await supabase
        .from("paired_profile_sections" as never)
        .select("section_type, content")
        .eq("paired_profile_id", pairedProfileId);
      if (cancelled) return;
      const map: PairedSectionsMap = {};
      for (const row of (data ?? []) as Array<{ section_type: string; content: string }>) {
        try {
          map[row.section_type] = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
        } catch {
          // skip unparseable
        }
      }
      setSections(map);
    };

    const fetchSubjects = async () => {
      const { data } = await supabase
        .from("paired_profile_subjects" as never)
        .select("pair_role, user_id")
        .eq("paired_profile_id", pairedProfileId);
      if (cancelled) return;
      setSubjects(((data ?? []) as PairedSubject[]));
    };

    const fetchProfile = async (initial: boolean) => {
      const { data, error } = await supabase
        .from("paired_profiles" as never)
        .select("id, structured, relationship_mode, narrative_status, item_set")
        .eq("id", pairedProfileId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        if (initial) setNoAccess(true);
        setLoading(false);
        return;
      }
      const row = data as unknown as PairedProfileRow;
      setProfile(row);
      setNoAccess(false);
      if (initial) {
        await fetchSubjects();
      }
      if (initial || row.narrative_status === "complete") {
        await fetchSections();
      }
      setLoading(false);
      if (row.narrative_status === "generating" || row.narrative_status === "pending") {
        timerRef.current = setTimeout(() => fetchProfile(false), 4000);
      }
    };

    fetchProfile(true);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pairedProfileId]);

  return {
    loading,
    noAccess,
    profile,
    mode: profile?.relationship_mode ?? null,
    sections,
    subjects,
    status: profile?.narrative_status ?? null,
  };
}
