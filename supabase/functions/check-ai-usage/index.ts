import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serverError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_USAGE_TYPES = ["chat_message", "report_generation"];

const FREE_TIER_DENIAL = {
  allowed: false,
  reason: "free_tier_no_chat",
  message: "Upgrade to a paid plan to chat with the AI coach.",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Parse input — NOTE: subscription_tier from body is intentionally ignored.
    let checkOnly = false;
    let usageType = "chat_message";
    try {
      const body = await req.json();
      checkOnly = body.check_only === true;
      if (body.usage_type && VALID_USAGE_TYPES.includes(body.usage_type)) {
        usageType = body.usage_type;
      }
    } catch {
      // defaults
    }

    const userId = user.id;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Resolve account context from server-side source of truth
    const { data: userRow, error: userRowErr } = await serviceClient
      .from("users")
      .select("account_type, subscription_tier, subscription_status")
      .eq("id", userId)
      .maybeSingle();

    if (userRowErr) {
      return serverError("check-ai-usage", userRowErr, corsHeaders);
    }

    if (!userRow) {
      return jsonResponse(FREE_TIER_DENIAL);
    }

    const accountType = userRow.account_type as string | null;
    const rawTier = userRow.subscription_tier as string | null;
    const rawStatus = userRow.subscription_status as string | null;

    // Defensive defaults
    const safeTier = rawTier === "premium" ? "premium" : "base";
    const safeStatus = rawStatus === "active" ? "active" : "inactive";

    // Current month in YYYY-MM
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Helper: read non-corp usage from ai_usage table
    async function readAiUsage() {
      const { data: usageRows, error: selectError } = await serviceClient
        .from("ai_usage")
        .select("usage_type, message_count")
        .eq("user_id", userId)
        .eq("month_year", monthYear)
        .in("usage_type", VALID_USAGE_TYPES);

      if (selectError) throw selectError;

      let totalCount = 0;
      const countByType: Record<string, number> = {};
      for (const row of usageRows ?? []) {
        const count = row.message_count ?? 0;
        totalCount += count;
        countByType[row.usage_type ?? "chat_message"] = count;
      }
      return { totalCount, countByType };
    }

    // Helper: increment ai_usage for the given usage_type
    async function incrementAiUsage(currentTypeCount: number) {
      const { error: upsertError } = await serviceClient.rpc("increment_ai_usage", {
        p_user_id: userId,
        p_usage_type: usageType,
        p_month_year: monthYear,
      });
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
            { onConflict: "user_id,usage_type,month_year" },
          );
        if (insertError) throw insertError;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Branch by account_type
    // ─────────────────────────────────────────────────────────────

    // Corporate tiers — use user_effective_allowances RPC under user JWT
    if (
      accountType === "corporate_employee" ||
      accountType === "company_admin" ||
      accountType === "org_admin"
    ) {
      const { data: allowanceData, error: allowanceErr } = await userClient.rpc(
        "user_effective_allowances",
      );
      if (allowanceErr) {
        return serverError("check-ai-usage", allowanceErr, corsHeaders);
      }

      const row = Array.isArray(allowanceData) ? allowanceData[0] : allowanceData;
      const aiChatEnabled = row?.ai_chat_enabled === true;
      const limit = Number(row?.chat_allowance_per_user ?? 0);
      const used = Number(row?.chat_used_this_month ?? 0);
      const remaining = Number(row?.chat_remaining ?? 0);

      if (!aiChatEnabled) {
        return jsonResponse({
          allowed: false,
          reason: "chat_disabled_by_contract",
          message:
            "AI chat is not enabled on your organization's plan. Contact your administrator.",
          tier: accountType,
          current_count: used,
          limit,
          remaining: 0,
        });
      }

      if (remaining <= 0) {
        return jsonResponse({
          allowed: false,
          reason: "limit_exceeded",
          tier: accountType,
          current_count: used,
          limit,
          remaining: 0,
          message: "You've used your monthly AI chat allowance.",
        });
      }

      if (checkOnly) {
        return jsonResponse({
          allowed: true,
          tier: accountType,
          current_count: used,
          limit,
          remaining,
        });
      }

      // Increment ai_usage so analytics tracking stays intact
      let countByType: Record<string, number> = {};
      try {
        const u = await readAiUsage();
        countByType = u.countByType;
        await incrementAiUsage(countByType[usageType] ?? 0);
      } catch (err) {
        return serverError("check-ai-usage", err, corsHeaders);
      }

      return jsonResponse({
        allowed: true,
        tier: accountType,
        current_count: used + 1,
        limit,
        remaining: remaining - 1,
        counts_by_type: {
          ...countByType,
          [usageType]: (countByType[usageType] ?? 0) + 1,
        },
      });
    }

    // Super admin — generous quota
    if (accountType === "brainwise_super_admin") {
      const limit = 9999;
      let totalCount = 0;
      let countByType: Record<string, number> = {};
      try {
        const u = await readAiUsage();
        totalCount = u.totalCount;
        countByType = u.countByType;
      } catch (err) {
        return serverError("check-ai-usage", err, corsHeaders);
      }

      if (totalCount >= limit) {
        return jsonResponse({
          allowed: false,
          reason: "limit_exceeded",
          tier: "brainwise_super_admin",
          current_count: totalCount,
          limit,
          remaining: 0,
          counts_by_type: countByType,
          message: "You've used your monthly AI chat allowance.",
        });
      }

      if (checkOnly) {
        return jsonResponse({
          allowed: true,
          tier: "brainwise_super_admin",
          current_count: totalCount,
          limit,
          remaining: limit - totalCount,
          counts_by_type: countByType,
        });
      }

      try {
        await incrementAiUsage(countByType[usageType] ?? 0);
      } catch (err) {
        return serverError("check-ai-usage", err, corsHeaders);
      }

      return jsonResponse({
        allowed: true,
        tier: "brainwise_super_admin",
        current_count: totalCount + 1,
        limit,
        remaining: limit - (totalCount + 1),
        counts_by_type: {
          ...countByType,
          [usageType]: (countByType[usageType] ?? 0) + 1,
        },
      });
    }

    // Individual — status checked BEFORE tier
    if (accountType === "individual") {
      if (safeStatus !== "active") {
        return jsonResponse(FREE_TIER_DENIAL);
      }

      const limit = safeTier === "premium" ? 150 : 30;
      let totalCount = 0;
      let countByType: Record<string, number> = {};
      try {
        const u = await readAiUsage();
        totalCount = u.totalCount;
        countByType = u.countByType;
      } catch (err) {
        return serverError("check-ai-usage", err, corsHeaders);
      }

      if (totalCount >= limit) {
        const upgradeMsg =
          safeTier === "base"
            ? `You have reached your monthly AI interaction limit of ${limit}. Upgrade to Premium for 150 interactions per month.`
            : `You have reached your monthly AI interaction limit of ${limit}.`;
        return jsonResponse({
          allowed: false,
          reason: "limit_exceeded",
          tier: safeTier,
          current_count: totalCount,
          limit,
          remaining: 0,
          counts_by_type: countByType,
          message: upgradeMsg,
        });
      }

      if (checkOnly) {
        return jsonResponse({
          allowed: true,
          tier: safeTier,
          current_count: totalCount,
          limit,
          remaining: limit - totalCount,
          counts_by_type: countByType,
        });
      }

      try {
        await incrementAiUsage(countByType[usageType] ?? 0);
      } catch (err) {
        return serverError("check-ai-usage", err, corsHeaders);
      }

      return jsonResponse({
        allowed: true,
        tier: safeTier,
        current_count: totalCount + 1,
        limit,
        remaining: limit - (totalCount + 1),
        counts_by_type: {
          ...countByType,
          [usageType]: (countByType[usageType] ?? 0) + 1,
        },
      });
    }

    // Coach, null, or anything unexpected → free-tier denial
    return jsonResponse(FREE_TIER_DENIAL);
  } catch (err) {
    return serverError("check-ai-usage", err, corsHeaders);
  }
});
