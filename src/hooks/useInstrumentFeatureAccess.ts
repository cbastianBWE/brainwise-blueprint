import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Instrument UUIDs (mirror of public.instruments rows).
 * Feature keys for platform_features follow the convention "instrument:<uuid>".
 */
export const INSTRUMENT_UUIDS = {
  PTP: "02618e9a-d411-44cf-b316-fe368edeac03",
  NAI: "77d1290f-1daf-44e0-931f-b9b8ad185520",
  EPN: "e5b3e839-d861-45ff-9f79-42887f5ae2de",
  AIRSA: "abb62120-8cc8-435f-babc-dd6a27fbc235",
  HSS: "90216d9d-153c-4b7b-abe0-1d7845c9e6e0",
} as const;

const ALL_UUIDS = Object.values(INSTRUMENT_UUIDS);

export function isPTP(uuid: string): boolean {
  return uuid === INSTRUMENT_UUIDS.PTP;
}

/**
 * Resolves per-instrument feature-flag visibility for the current user via
 * the user_has_features_bulk RPC. For an individual with no overrides this
 * returns PTP=true and NAI/EPN/AIRSA/HSS=false.
 *
 * Callers should OR the result with explicit entitlement signals (paid
 * purchase, coach invite, EPN assignment, manager-rater, cert pool, etc.)
 * — feature-flag false does not by itself mean "hide".
 *
 * While loading or on error, featureAllowed returns false for every uuid.
 * PTP is always allowed via the isPTP() helper; consumers should not rely
 * on this hook for the PTP-always-visible rule.
 */
export function useInstrumentFeatureAccess() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAllowed(new Map());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const features = ALL_UUIDS.map((u) => `instrument:${u}`);
      const { data, error } = await (supabase.rpc as any)("user_has_features_bulk", {
        p_user: user.id,
        p_features: features,
      });
      if (cancelled) return;
      if (error) {
        console.error("[useInstrumentFeatureAccess] user_has_features_bulk error", error);
        setAllowed(new Map());
        setLoading(false);
        return;
      }
      const map = new Map<string, boolean>();
      for (const row of (data ?? []) as Array<{ feature: string; enabled: boolean }>) {
        const uuid = row.feature?.startsWith("instrument:") ? row.feature.slice("instrument:".length) : row.feature;
        map.set(uuid, !!row.enabled);
      }
      setAllowed(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    loading,
    featureAllowed: (uuid: string) => allowed.get(uuid) === true,
  };
}
