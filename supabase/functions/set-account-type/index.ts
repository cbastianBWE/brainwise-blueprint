import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(
    `[SET-ACCOUNT-TYPE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`,
  );
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // 1. Authenticate caller via JWT.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = claimsData.claims.sub as string;

    // 2. Parse body — accept either { account_type } (individual path)
    //    OR { invite_code } (corporate redemption path).
    let body: { account_type?: string; invite_code?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { account_type, invite_code } = body ?? {};

    // 3. Onboarding-state guard: refuse if user already has an account_type set.
    //    This is the primary defense against the privilege-escalation finding.
    //    Service-role context bypasses the enforce_immutable_user_fields trigger,
    //    so the guard must live here in application code.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existingUser, error: fetchErr } = await adminClient
      .from("users")
      .select("account_type")
      .eq("id", userId)
      .single();

    if (fetchErr || !existingUser) {
      log("Failed to fetch user record", { userId });
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (existingUser.account_type !== null) {
      log("Onboarding-state guard blocked re-onboarding", {
        userId,
        currentType: existingUser.account_type,
      });
      return new Response(
        JSON.stringify({
          error: "Account already configured. Contact support if you need to change account type.",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4a. Corporate path: delegate entirely to invitation_redeem RPC.
    //     The RPC handles email matching, expiry, redeem-once, and writes
    //     account_type + organization_id + department_id + supervisor + org_level.
    if (invite_code) {
      const { data, error } = await userClient.rpc("invitation_redeem", {
        p_invite_code: invite_code,
        p_user_id: userId,
      });

      if (error) {
        log("invitation_redeem failed", {
          code: error.code,
          message: error.message,
        });
        let status = 400;
        let clientMessage = error.message || "Invitation could not be redeemed";
        if (error.code === "P0002") {
          clientMessage = "Invitation code not found";
          status = 404;
        } else if (error.code === "42501") {
          clientMessage = "This invitation was issued to a different email address";
          status = 403;
        } else if (
          typeof error.message === "string" &&
          (error.message.includes("already been redeemed") ||
            error.message.includes("expired"))
        ) {
          status = 410;
        }
        return new Response(
          JSON.stringify({ error: clientMessage, code: error.code }),
          {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      log("Corporate invitation redeemed", { userId });
      return new Response(
        JSON.stringify({ success: true, redemption: data?.[0] ?? null }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4b. Individual path: only 'individual' is permitted via this endpoint.
    //     Coach assignment must come from accept-coach-invitation (validated by token).
    //     Corporate assignment must come from invite_code -> invitation_redeem.
    if (account_type !== "individual") {
      log("Rejected disallowed account_type", { account_type });
      return new Response(
        JSON.stringify({
          error: "Only individual self-onboarding is permitted via this endpoint.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Defense-in-depth: WHERE account_type IS NULL precondition. Even if the
    //   guard above were bypassed somehow, this UPDATE would no-op against an
    //   already-onboarded user.
    const { data: updateRows, error: updateError } = await adminClient
      .from("users")
      .update({ account_type: "individual" })
      .eq("id", userId)
      .is("account_type", null)
      .select("id");

    if (updateError) {
      log("Update error", { updateError });
      return new Response(
        JSON.stringify({ error: "Failed to update account type" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!updateRows || updateRows.length === 0) {
      // Race condition: row was updated between the guard check and this UPDATE.
      log("Update no-op (precondition failed at WHERE)", { userId });
      return new Response(
        JSON.stringify({
          error: "Account already configured. Contact support if you need to change account type.",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    log("Individual account onboarded", { userId });
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[SET-ACCOUNT-TYPE] Internal error", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
