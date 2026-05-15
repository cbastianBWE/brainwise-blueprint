// customer-portal Edge Function
//
// Security hardening (Session 73 close):
//   - ALLOWED_ORIGINS + LOVABLE_PREVIEW_PATTERN: server-side allowlist of
//     accepted Origin headers. Rejects unrecognized origins so the Stripe
//     billing portal's return_url cannot be pointed at attacker domains.
//     Closes Warning 5 carry-over to this function.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { serverError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ORIGINS = new Set<string>([
  "https://brainwiseenterprises.com",
  "https://www.brainwiseenterprises.com",
  "https://brainwise-seedling.lovable.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
]);
const LOVABLE_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (LOVABLE_PREVIEW_PATTERN.test(origin)) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Validate Origin header BEFORE building return_url (Warning 5)
    const origin = req.headers.get("origin");
    if (!isOriginAllowed(origin)) {
      console.error(`[CUSTOMER-PORTAL] REJECTED origin not allowlisted: ${origin}`);
      return new Response(
        JSON.stringify({ error: "origin_not_allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const safeOrigin = origin!; // safe by allowlist check above

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found");

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${safeOrigin}/settings/billing`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return serverError("customer-portal", error, corsHeaders);
  }
});
