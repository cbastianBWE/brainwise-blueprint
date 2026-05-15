// create-checkout Edge Function
//
// Pattern C addition (Session 73, Migration J):
//   When the caller is a super admin practitioner coach AND the BrainWise
//   comp coupon system has a matching active coupon, apply it to the Stripe
//   Checkout Session via discounts:[{coupon}] AND stamp metadata.bw_super_admin_comp:'true'.
//   stripe-webhook reads that flag to skip the coach-credit-coupon side effect
//   on $0 super-admin orders (which would create meaningless $0 credit coupons).
//
//   Real coach flows (single-client invitation, bulk invitation, share link,
//   self-pay, share-link coach-paid) are 100% unchanged — they never have
//   the bw_super_admin_comp metadata and never get the discount applied because
//   the Pattern C super-admin comp coupon's applicable_account_types is
//   ['brainwise_super_admin'] (not 'coach').
//
// Security hardening (Session 73 close):
//   - PRICE_ID_ALLOWLIST: server-side allowlist of accepted Stripe price IDs.
//     Rejects any incoming price_id not in the set. Closes Warning 4 ("Stripe
//     price_id Not Validated Against Allowlist in Checkout"). The 5 IDs match
//     src/lib/stripe.ts exactly.
//   - ALLOWED_ORIGINS + LOVABLE_PREVIEW_PATTERN: server-side allowlist of
//     accepted Origin headers. Rejects unrecognized origins so success_url /
//     cancel_url cannot be pointed at attacker domains. Closes Warning 5
//     ("Stripe Redirect URLs Built from Unvalidated Origin Header"). Matches
//     production + www + the seedling lovable.app + any *.lovable.app preview
//     + localhost dev ports.
//   - MAX_QUANTITY: caps resolvedQuantity to prevent abuse of high-volume
//     checkout sessions.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { serverError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Security hardening constants (Session 73 close)
const PRICE_ID_ALLOWLIST = new Set<string>([
  "price_1TS3WV2FY7qIyIXA5L2Gs71D", // Base monthly $10
  "price_1TS3WU2FY7qIyIXAPG37X3eg", // Base annual $100
  "price_1TS3WY2FY7qIyIXA6aO8QZfO", // Premium monthly $18
  "price_1TS3WY2FY7qIyIXAUrBknGRQ", // Premium annual $180
  "price_1TS3WY2FY7qIyIXAalOKbxdZ", // Per-assessment $29.99
]);

const ALLOWED_ORIGINS = new Set<string>([
  "https://brainwiseenterprises.com",
  "https://www.brainwiseenterprises.com",
  "https://brainwise-seedling.lovable.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
]);
// Matches any subdomain of lovable.app (preview builds get rotating IDs)
const LOVABLE_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;

const MAX_QUANTITY = 50;

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (LOVABLE_PREVIEW_PATTERN.test(origin)) return true;
  return false;
}

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) throw new Error(`Auth error: ${authError.message}`);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Validate Origin header BEFORE any further processing (Warning 5)
    const origin = req.headers.get("origin");
    if (!isOriginAllowed(origin)) {
      logStep("REJECTED origin not allowlisted", { origin });
      return new Response(
        JSON.stringify({ error: "origin_not_allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const safeOrigin = origin!; // safe by allowlist check above

    const body = await req.json();
    const { price_id, mode, instrument_id, instrument_ids, quantity, client_email, client_first_name, client_last_name, coach_note } = body;
    if (!price_id) throw new Error("price_id is required");

    // Validate price_id against server-side allowlist (Warning 4)
    if (!PRICE_ID_ALLOWLIST.has(price_id)) {
      logStep("REJECTED price_id not in allowlist", { price_id });
      return new Response(
        JSON.stringify({ error: "price_id_not_allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Support both single instrument_id and multi instrument_ids
    const resolvedInstrumentIds = instrument_ids || instrument_id || "";
    const resolvedQuantity = quantity || 1;

    // Cap quantity to prevent abuse (Warning 4 remediation step 3)
    if (resolvedQuantity < 1 || resolvedQuantity > MAX_QUANTITY) {
      logStep("REJECTED quantity out of bounds", { quantity: resolvedQuantity });
      return new Response(
        JSON.stringify({ error: "quantity_out_of_bounds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkoutMode = mode === "payment" || mode === "coach_order" ? "payment" : "subscription";
    logStep("Checkout params", { price_id, mode, checkoutMode, instrument_ids: resolvedInstrumentIds, quantity: resolvedQuantity });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // ====================================================================
    // Pattern C: check for applicable BrainWise comp coupon
    //
    // get_applicable_comp_coupon(caller_id, instrument_id=null) returns the
    // best-applicable active coupon for this caller (matching by account_type
    // and instrument restrictions). For Pattern C super-admin comp orders, this
    // returns the super-admin comp coupon (100% off). For all other callers
    // (real coaches, individuals, corporate), it returns empty unless a future
    // promotional coupon is configured to apply to them.
    //
    // We pass instrument_id=null because Stripe coupons apply session-wide;
    // we want a single coupon for the whole order. Future per-instrument
    // coupon logic can call get_applicable_comp_coupon per instrument if needed.
    // ====================================================================
    let appliedCompCouponStripeId: string | null = null;
    let appliedCompCouponInternalName: string | null = null;
    try {
      const { data: compCouponRows, error: compCouponErr } = await supabaseClient
        .rpc("get_applicable_comp_coupon", {
          p_caller_user_id: user.id,
          p_instrument_id: null,
        });
      if (compCouponErr) {
        logStep("WARNING get_applicable_comp_coupon errored, continuing without comp", { error: compCouponErr.message });
      } else if (compCouponRows && compCouponRows.length > 0) {
        const row = compCouponRows[0];
        appliedCompCouponStripeId = row.out_stripe_coupon_id;
        appliedCompCouponInternalName = row.out_internal_name;
        logStep("Comp coupon applied to session", {
          stripeCouponId: appliedCompCouponStripeId,
          internalName: appliedCompCouponInternalName,
          percent_off: row.out_percent_off,
        });
      }
    } catch (compErr) {
      // Best-effort: comp coupon lookup must not block the checkout flow.
      logStep("WARNING comp coupon lookup threw, continuing without comp", { error: String(compErr) });
    }

    // Find or reuse Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: price_id, quantity: resolvedQuantity }],
      mode: checkoutMode,
      success_url:
        mode === "coach_order"
          ? `${safeOrigin}/coach/clients?checkout=success`
          : checkoutMode === "subscription"
            ? `${safeOrigin}/dashboard?checkout=success`
            : `${safeOrigin}/assessment?checkout=success&instrument=${resolvedInstrumentIds}&autostart=true`,
      cancel_url:
        mode === "coach_order"
          ? `${safeOrigin}/coach/clients?checkout=cancelled`
          : `${safeOrigin}/settings/plan?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        instrument_ids: resolvedInstrumentIds,
        checkout_type: mode === "coach_order" ? "coach_order" : checkoutMode,
        ...(mode === "coach_order" ? {
          client_email: client_email || "",
          client_first_name: client_first_name || "",
          client_last_name: client_last_name || "",
          coach_note: coach_note || "",
        } : {}),
        // Pattern C: stamp the super-admin-comp flag so stripe-webhook can
        // skip the coach-credit-coupon side effect on $0 super-admin orders.
        // The flag fires ONLY when the comp coupon was actually applied to
        // this session, regardless of caller account_type — belt-and-suspenders.
        ...(appliedCompCouponStripeId ? {
          bw_super_admin_comp: "true",
          bw_comp_coupon_internal_name: appliedCompCouponInternalName || "",
        } : {}),
      },
      // Pattern C: apply the comp coupon if one was matched
      ...(appliedCompCouponStripeId ? {
        discounts: [{ coupon: appliedCompCouponStripeId }],
      } : {}),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Session created", { sessionId: session.id, compApplied: appliedCompCouponStripeId !== null });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return serverError("create-checkout", error, corsHeaders);
  }
});
