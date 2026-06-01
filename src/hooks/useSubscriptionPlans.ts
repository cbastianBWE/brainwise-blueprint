import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanInterval = "monthly" | "annual";

interface PlanRow {
  tier: string;
  billing_period: string;
  price_usd: number;
  stripe_price_id: string | null;
}

export function useSubscriptionPlans() {
  const [rows, setRows] = useState<PlanRow[]>([]);
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

  return { priceFor, oneTimePrice, loading };
}
