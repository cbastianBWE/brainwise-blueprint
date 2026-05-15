// Resets PTP narrative_status on an assessment_results row so the report page
// gate releases and the existing on-demand self-heal in PTPNarrativeSections.tsx
// regenerates any missing narrative sections.
//
// This is the ONLY thing this function does. It does NOT delete facet_interpretations,
// does NOT re-run scoring, and does NOT touch any other row. That keeps the blast
// radius minimal and avoids any chance of duplicating assessment_results.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) return json(401, { error: "Unauthorized" });
  const callerUserId = claimsData.claims.sub as string;

  let body: { assessment_result_id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const { assessment_result_id } = body;
  if (!assessment_result_id || typeof assessment_result_id !== "string") {
    return json(400, { error: "assessment_result_id is required" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify ownership: the caller must own the row. We only allow self-retry here.
  const { data: row, error: rowErr } = await admin
    .from("assessment_results")
    .select("id, user_id, instrument_id, narrative_status")
    .eq("id", assessment_result_id)
    .maybeSingle();

  if (rowErr) return json(500, { error: rowErr.message });
  if (!row) return json(404, { error: "Not found" });
  if (row.user_id !== callerUserId) return json(403, { error: "Forbidden" });

  // Reset narrative_status to NULL. The frontend hook treats NULL as 'ready',
  // which lets PTPNarrativeProvider mount and the existing on-demand self-heal
  // in PTPNarrativeSections.tsx regenerate any missing facet_interpretations.
  const { error: updErr } = await admin
    .from("assessment_results")
    .update({
      narrative_status: null,
      narrative_started_at: null,
      narrative_completed_at: null,
    })
    .eq("id", assessment_result_id);

  if (updErr) return json(500, { error: updErr.message });

  // Kick generate-all-facets — it self-short-circuits if already complete
  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-all-facets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "",
    },
    body: JSON.stringify({ assessment_result_id }),
  }).catch((e) => console.error("[retry-ptp-narratives] generate-all-facets fire failed:", e));

  return json(200, { ok: true });
});
