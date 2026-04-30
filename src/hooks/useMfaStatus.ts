import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the user's organization requires MFA.
 */
export const useMfaRequired = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["mfa-required", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("current_user_mfa_required");
      return data === true;
    },
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Returns whether the user's session currently satisfies MFA (e.g. AAL2).
 */
export const useMfaSatisfied = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["mfa-satisfied", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("current_user_mfa_satisfied");
      return data === true;
    },
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
