import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook that wraps the `log_resource_access` RPC.
 *
 * Fire-and-forget: the RPC call returns a Promise but the caller doesn't need to
 * await it. Logging failure should NEVER block the user from accessing the resource.
 * If the RPC fails (network error, RLS denial, etc.), we silently swallow — the
 * access still happens, we just lose the log row.
 *
 * Usage:
 *   const logAccess = useResourceAccessLog();
 *   const handleResourceClick = (resourceId) => {
 *     logAccess(resourceId); // fire-and-forget
 *     navigate(`/resource/${resourceId}`);
 *   };
 */
export function useResourceAccessLog() {
  return useCallback(async (resourceId: string) => {
    try {
      await supabase.rpc("log_resource_access", { p_resource_id: resourceId });
    } catch (err) {
      // Silently swallow. Access logging is non-blocking.
      console.warn("[resource_access_log] failed to log access", err);
    }
  }, []);
}
