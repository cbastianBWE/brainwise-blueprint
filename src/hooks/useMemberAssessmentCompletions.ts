import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MemberRow } from "@/components/members/types";

export interface MemberCompletion {
  instrument_id: string;
  last_completed_at: string;
}
export type CompletionsByUser = Record<string, MemberCompletion[]>;

export function useMemberAssessmentCompletions(rows: MemberRow[] | undefined) {
  const orgIds = Array.from(
    new Set((rows ?? []).map((r) => r.organization_id).filter(Boolean) as string[]),
  ).sort();
  return useQuery({
    queryKey: ["org-member-assessment-completions", orgIds],
    enabled: orgIds.length > 0,
    queryFn: async () => {
      const map: CompletionsByUser = {};
      const batches = await Promise.all(
        orgIds.map(async (orgId) => {
          const { data, error } = await supabase.rpc(
            "org_member_assessment_completions" as any,
            { p_org: orgId } as any,
          );
          if (error) throw error;
          return (data ?? []) as {
            user_id: string;
            instrument_id: string;
            last_completed_at: string;
          }[];
        }),
      );
      for (const arr of batches)
        for (const r of arr)
          (map[r.user_id] ??= []).push({
            instrument_id: r.instrument_id,
            last_completed_at: r.last_completed_at,
          });
      for (const uid of Object.keys(map))
        map[uid].sort((a, b) => (a.last_completed_at < b.last_completed_at ? 1 : -1));
      return map;
    },
  });
}
