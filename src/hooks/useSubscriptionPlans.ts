import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanInterval = "monthly" | "annual";

interface PlanRow {
  tier: string;
  billing_period: string;
  price_usd: number;
  stripe_price_id: string | null;
}

interface TierRow {
  tier: string;
  display_name: string;
  features: string[];
  ai_coaching_limit: number;
  one_time_credit_grant: number;
}

export function useSubscriptionPlans() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [tierRows, setTierRows] = useState<TierRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("tier, billing_period, price_usd, stripe_price_id")
        .eq("is_active", true);
      if (cancelled) return;
      if (!error && data) {
        setRows(
          data.map((r) => ({
            tier: r.tier as string,
            billing_period: r.billing_period as string,
            price_usd: Number(r.price_usd),
            stripe_price_id: (r.stripe_price_id as string | null) ?? null,
          })),
        );
      }

      const { data: tData, error: tErr } = await supabase
        .from("plan_tiers")
        .select("tier, display_name, features, ai_coaching_limit, one_time_credit_grant")
        .eq("is_active", true);
      if (!cancelled && !tErr && tData) {
        setTierRows(
          tData.map((r) => ({
            tier: r.tier as string,
            display_name: r.display_name as string,
            features: (r.features as string[]) ?? [],
            ai_coaching_limit: Number(r.ai_coaching_limit ?? 0),
            one_time_credit_grant: Number(r.one_time_credit_grant ?? 0),
          })),
        );
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const priceFor = useCallback(
    (tier: string, interval: PlanInterval): number | null => {
      const row = rows.find((r) => r.tier === tier && r.billing_period === interval);
      return row ? row.price_usd : null;
    },
    [rows],
  );

  const oneTimePrice = useCallback(
    (tier = "individual"): number | null => {
      const row = rows.find((r) => r.tier === tier && r.billing_period === "one_time");
      return row ? row.price_usd : null;
    },
    [rows],
  );

  const featuresFor = useCallback(
    (tier: string): string[] | null => {
      const row = tierRows.find((r) => r.tier === tier);
      return row ? row.features : null;
    },
    [tierRows],
  );

  const limitsFor = useCallback(
    (tier: string): { aiCoachingLimit: number; oneTimeCreditGrant: number } | null => {
      const row = tierRows.find((r) => r.tier === tier);
      return row ? { aiCoachingLimit: row.ai_coaching_limit, oneTimeCreditGrant: row.one_time_credit_grant } : null;
    },
    [tierRows],
  );

  return { priceFor, oneTimePrice, featuresFor, limitsFor, loading };
}
