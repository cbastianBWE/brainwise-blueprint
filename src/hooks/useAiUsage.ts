import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UsageData {
  allowed: boolean;
  current_count: number;
  limit: number;
  remaining: number;
  tier?: string;
  message?: string;
  counts_by_type?: Record<string, number>;
}

export function useAiUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsage = useCallback(async (subscriptionTier = "base") => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("check-ai-usage", {
      body: { subscription_tier: subscriptionTier, check_only: true },
    });
    if (!error && data) setUsage(data as UsageData);
    setLoading(false);
    return data as UsageData | null;
  }, []);

  const consumeMessage = useCallback(async (subscriptionTier = "base", usageType = "chat_message") => {
    const { data, error } = await supabase.functions.invoke("check-ai-usage", {
      body: { subscription_tier: subscriptionTier, usage_type: usageType },
    });
    if (!error && data) setUsage(data as UsageData);
    return data as UsageData | null;
  }, []);

  return { usage, loading, fetchUsage, consumeMessage };
}
