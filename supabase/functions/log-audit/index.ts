import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is a super admin using their JWT
    const authHeader = req.headers.get("Authorization")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify super admin
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData } = await serviceClient
      .from("users")
      .select("account_type")
      .eq("id", user.id)
      .single();

    if (userData?.account_type !== "brainwise_super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { entries } = await req.json();
    if (!Array.isArray(entries) || entries.length === 0) {
      return new Response(JSON.stringify({ error: "No entries provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert audit log entries using service role
    const rows = entries.map((e: any) => ({
      super_admin_user_id: user.id,
      action_type: e.action_type,
      company_id: e.company_id || null,
      affected_user_id: e.affected_user_id || null,
      session_id: e.session_id,
      detail: e.detail || null,
    }));

    const { error: insertError } = await serviceClient
      .from("super_admin_audit_log")
      .insert(rows);

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return serverError("log-audit", err, corsHeaders);
  }
});
