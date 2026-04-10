import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Determine tier dynamically from product name/metadata
const determineTier = (productName: string, metadata: Record<string, string>): string => {
  if (metadata.tier) return metadata.tier.toLowerCase();
  const name = productName.toLowerCase();
  if (name.includes("premium")) return "premium";
  if (name.includes("base")) return "base";
  return "base";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    logStep("Auth header present", { length: authHeader.length, prefix: authHeader.substring(0, 20) });
    logStep("Anon key present", { hasAnonKey: !!supabaseAnonKey, length: supabaseAnonKey.length });

    // Extract token and use admin client to validate
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    logStep("getUser result", { hasData: !!userData?.user, error: userError?.message });
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      // Ensure DB reflects no subscription
      await supabaseAdmin
        .from("users")
        .update({ subscription_status: "inactive", subscription_tier: "base" })
        .eq("id", user.id);

      return new Response(
        JSON.stringify({ subscribed: false, tier: "base", subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActive = subscriptions.data.length > 0;
    let tier = "base";
    let subscriptionEnd: string | null = null;

    if (hasActive) {
      const sub = subscriptions.data[0];

      // Safely convert current_period_end (Unix seconds → ms)
      try {
        if (sub.current_period_end && typeof sub.current_period_end === "number") {
          subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
        }
      } catch (e) {
        logStep("Warning: could not convert current_period_end", { value: sub.current_period_end });
        subscriptionEnd = null;
      }

      const productId = sub.items.data[0].price.product as string;
      const product = await stripe.products.retrieve(productId);
      tier = determineTier(product.name, (product.metadata || {}) as Record<string, string>);
      logStep("Active subscription", { tier, productId, productName: product.name, subscriptionEnd });
    } else {
      logStep("No active subscription");
    }

    // Sync to DB
    await supabaseAdmin
      .from("users")
      .update({
        subscription_status: hasActive ? "active" : "inactive",
        subscription_tier: tier,
      })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({ subscribed: hasActive, tier, subscription_end: subscriptionEnd }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
