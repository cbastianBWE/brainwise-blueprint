import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared cached query for the onboarding gate.
 * Once `has_required_demographics` returns true (or `onboarding_completed_at`
 * is set on the backend), it stays true forever — so we cache aggressively
 * and never refetch on focus/mount.
 */
export const useOnboardingStatus = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["onboarding-status", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_required_demographics", {
        p_user_id: userId!,
      });
      return data === true;
    },
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useAccountType = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["account-type", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("account_type")
        .eq("id", userId!)
        .single();
      return data?.account_type ?? null;
    },
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
