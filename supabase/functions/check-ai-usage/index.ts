import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Hardcoded monthly limits per tier (shared across all usage types)
const LIMITS: Record<string, number> = {
  base: 30,
  premium: 150,
};

const VALID_USAGE_TYPES = ["chat_message", "report_generation"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse input
    let subscriptionTier = "base";
    let checkOnly = false;
    let usageType = "chat_message";
    try {
      const body = await req.json();
      subscriptionTier = body.subscription_tier || "base";
      checkOnly = body.check_only === true;
      if (body.usage_type && VALID_USAGE_TYPES.includes(body.usage_type)) {
        usageType = body.usage_type;
      }
    } catch {
      // defaults
    }

    const tier = subscriptionTier in LIMITS ? subscriptionTier : "base";
    const limit = LIMITS[tier];
    const userId = user.id;

    // Current month in YYYY-MM format
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Sum usage across ALL usage types for this user+month (shared limit)
    const { data: usageRows, error: selectError } = await serviceClient
      .from("ai_usage")
      .select("usage_type, message_count")
      .eq("user_id", userId)
      .eq("month_year", monthYear)
      .in("usage_type", VALID_USAGE_TYPES);

    if (selectError) {
      return new Response(
        JSON.stringify({ error: "Failed to check usage: " + selectError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate combined total and per-type counts
    let totalCount = 0;
    const countByType: Record<string, number> = {};
    for (const row of usageRows ?? []) {
      const count = row.message_count ?? 0;
      totalCount += count;
      countByType[row.usage_type ?? "chat_message"] = count;
    }

    // If at or over limit, deny
    if (totalCount >= limit) {
      const upgradeMsg =
        tier === "base"
          ? `You have reached your monthly AI interaction limit of ${limit}. Upgrade to Premium for ${LIMITS.premium} interactions per month.`
          : `You have reached your monthly AI interaction limit of ${limit}.`;

      return new Response(
        JSON.stringify({
          allowed: false,
          current_count: totalCount,
          limit,
          remaining: 0,
          tier,
          counts_by_type: countByType,
          message: upgradeMsg,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check-only mode: return current usage without incrementing
    if (checkOnly) {
      return new Response(
        JSON.stringify({
          allowed: true,
          current_count: totalCount,
          limit,
          remaining: limit - totalCount,
          tier,
          counts_by_type: countByType,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment the specific usage_type row
    const currentTypeCount = countByType[usageType] ?? 0;
    const { error: upsertError } = await serviceClient.rpc("increment_ai_usage", {
      p_user_id: userId,
      p_usage_type: usageType,
      p_month_year: monthYear,
    });

    // Fallback: if RPC doesn't exist, do manual upsert
    if (upsertError) {
      const { error: insertError } = await serviceClient
        .from("ai_usage")
        .upsert(
          {
            user_id: userId,
            usage_type: usageType,
            month_year: monthYear,
            message_count: currentTypeCount + 1,
            last_used_at: new Date().toISOString(),
          },
          { onConflict: "user_id,usage_type,month_year" }
        );

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to update usage: " + insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const newTotal = totalCount + 1;
    const newCountByType = { ...countByType, [usageType]: currentTypeCount + 1 };

    return new Response(
      JSON.stringify({
        allowed: true,
        current_count: newTotal,
        limit,
        remaining: limit - newTotal,
        tier,
        counts_by_type: newCountByType,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
