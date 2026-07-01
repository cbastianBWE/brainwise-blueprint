import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MentorAssessmentCompletion {
  instrument_id: string;
  last_completed_at: string;
}
export interface MentorClientTracking {
  coach_client_id: string;
  client_user_id: string | null;
  client_name: string | null;
  client_email: string | null;
  is_actor: boolean;
  actor_instrument_id: string | null;
  invitation_status: string;
  invited_at: string;
  assessment_completed: boolean;
  completed_at: string | null;
  debrief_completed: boolean;
}
export type CompletionsByTrainee = Record<string, MentorAssessmentCompletion[]>;
export type ClientTrackingByTrainee = Record<string, MentorClientTracking[]>;

export function useMentorTraineeCompletions() {
  return useQuery({
    queryKey: ["mentor-trainee-completions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "list_mentor_trainee_completions" as any,
      );
      if (error) throw error;
      const rows = (data ?? []) as {
        trainee_user_id: string;
        instrument_id: string;
        last_completed_at: string;
      }[];
      const map: CompletionsByTrainee = {};
      for (const r of rows) {
        (map[r.trainee_user_id] ??= []).push({
          instrument_id: r.instrument_id,
          last_completed_at: r.last_completed_at,
        });
      }
      for (const uid of Object.keys(map)) {
        map[uid].sort((a, b) =>
          a.last_completed_at < b.last_completed_at ? 1 : -1,
        );
      }
      return map;
    },
  });
}

export function useMentorTraineeClientTracking() {
  return useQuery({
    queryKey: ["mentor-trainee-client-tracking"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "list_mentor_trainee_client_tracking" as any,
      );
      if (error) throw error;
      const rows = (data ?? []) as (MentorClientTracking & {
        trainee_user_id: string;
      })[];
      const map: ClientTrackingByTrainee = {};
      for (const r of rows) {
        const { trainee_user_id, ...rest } = r;
        (map[trainee_user_id] ??= []).push(rest);
      }
      for (const uid of Object.keys(map)) {
        map[uid].sort((a, b) => {
          if (a.is_actor !== b.is_actor) return a.is_actor ? -1 : 1;
          return a.invited_at < b.invited_at ? 1 : -1;
        });
      }
      return map;
    },
  });
}
