import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccountRole } from "@/lib/accountRoles";

export const DASHBOARD_INSTRUMENT_UUIDS = {
  NAI: "77d1290f-1daf-44e0-931f-b9b8ad185520",
  PTP: "02618e9a-d411-44cf-b316-fe368edeac03",
  AIRSA: "abb62120-8cc8-435f-babc-dd6a27fbc235",
} as const;

interface UseOrgInstrumentAccessResult {
  loading: boolean;
  isSuperAdmin: boolean;
  orgInstrumentIncluded: (uuid: string) => boolean;
}

/**
 * Reads the caller's org contract from organization_features_view (RLS-scoped,
 * single row) and exposes a predicate for whether an instrument UUID is
 * included in `instruments_included`. Super admins bypass the query and are
 * always allowed.
 */
export function useOrgInstrumentAccess(): UseOrgInstrumentAccessResult {
  const { isSuperAdmin, loading: roleLoading } = useAccountRole();
  const [loading, setLoading] = useState(true);
  const [includedSet, setIncludedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (roleLoading) return;

    let cancelled = false;

    if (isSuperAdmin) {
      setIncludedSet(new Set());
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("organization_features_view")
        .select("instruments_included")
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setIncludedSet(new Set());
      } else {
        const raw = (data as { instruments_included: unknown }).instruments_included;
        const arr = Array.isArray(raw) ? (raw as unknown[]).filter((v): v is string => typeof v === "string") : [];
        setIncludedSet(new Set(arr));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, roleLoading]);

  return {
    loading: roleLoading || loading,
    isSuperAdmin,
    orgInstrumentIncluded: (uuid: string) => isSuperAdmin || includedSet.has(uuid),
  };
}
