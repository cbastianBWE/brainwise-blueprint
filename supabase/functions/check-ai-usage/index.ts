import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Hardcoded monthly limits per tier
const LIMITS: Record<string, number> = {
  base: 30,
  premium: 150,
};

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
    try {
      const body = await req.json();
      subscriptionTier = body.subscription_tier || "base";
      checkOnly = body.check_only === true;
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

    // Check current usage
    const { data: usageRow, error: selectError } = await serviceClient
      .from("ai_usage")
      .select("message_count")
      .eq("user_id", userId)
      .eq("usage_type", "chat_message")
      .eq("month_year", monthYear)
      .maybeSingle();

    if (selectError) {
      return new Response(
        JSON.stringify({ error: "Failed to check usage: " + selectError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentCount = usageRow?.message_count ?? 0;

    // If at or over limit, deny
    if (currentCount >= limit) {
      const upgradeMsg =
        tier === "base"
          ? `You have reached your monthly AI chat limit of ${limit} messages. Upgrade to Premium for ${LIMITS.premium} messages per month.`
          : `You have reached your monthly AI chat limit of ${limit} messages.`;

      return new Response(
        JSON.stringify({
          allowed: false,
          current_count: currentCount,
          limit,
          tier,
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
          current_count: currentCount,
          limit,
          remaining: limit - currentCount,
          tier,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { error: upsertError } = await serviceClient.rpc("increment_ai_usage", {
      p_user_id: userId,
      p_usage_type: "chat_message",
      p_month_year: monthYear,
    });

    // Fallback: if RPC doesn't exist, do manual upsert
    if (upsertError) {
      // Try direct upsert via insert + on conflict
      const { error: insertError } = await serviceClient
        .from("ai_usage")
        .upsert(
          {
            user_id: userId,
            usage_type: "chat_message",
            month_year: monthYear,
            message_count: currentCount + 1,
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

    const newCount = currentCount + 1;

    return new Response(
      JSON.stringify({
        allowed: true,
        current_count: newCount,
        limit,
        remaining: limit - newCount,
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
