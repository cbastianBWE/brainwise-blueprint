import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanInterval = "monthly" | "annual";

interface PlanRow {
  tier: string;
  billing_period: string;
  price_usd: number;
  stripe_price_id: string | null;
  audience: string;
}

interface TierRow {
  tier: string;
  display_name: string;
  features: string[];
  ai_coaching_limit: number;
  one_time_credit_grant: number;
  sort_order: number;
  audience: string;
}

export interface CatalogueTier {
  tier: string;
  displayName: string;
  features: string[];
  aiCoachingLimit: number;
  oneTimeCreditGrant: number;
  sortOrder: number;
  audience: string;
  monthly: { price: number; priceId: string } | null;
  annual: { price: number; priceId: string } | null;
}

function parseFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
  return [];
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
        .select("tier, billing_period, price_usd, stripe_price_id, audience")
        .eq("is_active", true);
      if (cancelled) return;
      if (!error && data) {
        setRows(
          data.map((r) => ({
            tier: r.tier as string,
            billing_period: r.billing_period as string,
            price_usd: Number(r.price_usd),
            stripe_price_id: (r.stripe_price_id as string | null) ?? null,
            audience: ((r as { audience?: string }).audience as string) ?? "individual",
          })),
        );
      }

      const { data: tData, error: tErr } = await supabase
        .from("plan_tiers")
        .select("tier, display_name, features, ai_coaching_limit, one_time_credit_grant, sort_order, audience")
        .eq("is_active", true);
      if (!cancelled && !tErr && tData) {
        setTierRows(
          tData.map((r) => ({
            tier: r.tier as string,
            display_name: r.display_name as string,
            features: parseFeatures((r as { features?: unknown }).features),
            ai_coaching_limit: Number(r.ai_coaching_limit ?? 0),
            one_time_credit_grant: Number(r.one_time_credit_grant ?? 0),
            sort_order: Number((r as { sort_order?: number }).sort_order ?? 0),
            audience: ((r as { audience?: string }).audience as string) ?? "individual",
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

  const oneTimePriceId = useCallback(
    (tier = "individual"): string | null => {
      const row = rows.find((r) => r.tier === tier && r.billing_period === "one_time");
      return row?.stripe_price_id ?? null;
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

  const catalogueFor = useCallback(
    (audience: string): CatalogueTier[] => {
      if (audience === "product") return [];
      const tiers = tierRows.filter((t) => t.audience === audience && t.audience !== "product");
      return tiers
        .map((t) => {
          const monthlyRow = rows.find(
            (r) => r.tier === t.tier && r.billing_period === "monthly" && r.audience === audience,
          );
          const annualRow = rows.find(
            (r) => r.tier === t.tier && r.billing_period === "annual" && r.audience === audience,
          );
          return {
            tier: t.tier,
            displayName: t.display_name,
            features: t.features,
            aiCoachingLimit: t.ai_coaching_limit,
            oneTimeCreditGrant: t.one_time_credit_grant,
            sortOrder: t.sort_order,
            audience: t.audience,
            monthly:
              monthlyRow && monthlyRow.stripe_price_id
                ? { price: monthlyRow.price_usd, priceId: monthlyRow.stripe_price_id }
                : null,
            annual:
              annualRow && annualRow.stripe_price_id
                ? { price: annualRow.price_usd, priceId: annualRow.stripe_price_id }
                : null,
          } as CatalogueTier;
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    [rows, tierRows],
  );

  return { priceFor, oneTimePrice, oneTimePriceId, featuresFor, limitsFor, catalogueFor, loading };
}
