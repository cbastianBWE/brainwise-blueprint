import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/** Shared signed-in org branding fetch. Runs only once a token is present. */
export function useOrgBranding() {
  const { session, loading } = useAuth();
  const q = useQuery({
    queryKey: ["org-branding", session?.user?.id ?? "anon"],
    enabled: !loading && !!session?.access_token,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const call = () => (supabase.rpc as any)("get_org_branding_for_current_user");
      let { data, error } = await call();
      if (error?.code === "42501") {
        await supabase.auth.getSession();
        ({ data, error } = await call());
      }
      if (error) throw error;
      return data as any;
    },
  });
  return { data: q.data, error: q.error, isLoading: q.isLoading, isSuccess: q.isSuccess };
}
