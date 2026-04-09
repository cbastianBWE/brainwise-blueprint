import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: { assessment_result_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { assessment_result_id } = body;
  if (!assessment_result_id || typeof assessment_result_id !== "string") {
    return new Response(
      JSON.stringify({ error: "assessment_result_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ── 1. Fetch assessment_results ──
    const { data: result, error: resultErr } = await admin
      .from("assessment_results")
      .select(
        "id, assessment_id, user_id, instrument_id, instrument_version, dimension_scores, manager_dimension_scores, self_manager_divergence, overall_profile, ai_version, ai_version_history"
      )
      .eq("id", assessment_result_id)
      .single();

    if (resultErr || !result) {
      return new Response(
        JSON.stringify({ error: "Assessment result not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Fetch user name ──
    const { data: user } = await admin
      .from("users")
      .select("full_name")
      .eq("id", result.user_id)
      .single();

    const userName = user?.full_name || "Participant";

    // ── 3. Fetch active ai_version ──
    const { data: aiVersion, error: aiErr } = await admin
      .from("ai_versions")
      .select("system_prompt, user_prompt_template, model_id, version_string")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (aiErr || !aiVersion) {
      return new Response(
        JSON.stringify({ error: "No active AI version found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Fetch dimensions for this instrument ──
    const { data: dimensions } = await admin
      .from("dimensions")
      .select("dimension_id, dimension_name, cross_instrument_notes")
      .eq("instrument_id", result.instrument_id!);

    const dimLookup: Record<string, { dimension_name: string; cross_instrument_notes: string | null }> = {};
    for (const d of dimensions ?? []) {
      dimLookup[d.dimension_id] = {
        dimension_name: d.dimension_name,
        cross_instrument_notes: d.cross_instrument_notes,
      };
    }

    // ── 5. Fetch triggered recommendations ──
    const overallProfile = result.overall_profile as Record<string, unknown> | null;
    const triggeredIds: string[] =
      (overallProfile?.triggered_cross_instrument_recommendations as string[]) ?? [];

    let triggeredRecommendations: Array<Record<string, unknown>> = [];
    if (triggeredIds.length > 0) {
      const { data: triggers } = await admin
        .from("trigger_logic")
        .select("trigger_id, rationale, report_flag_text, target_instrument")
        .in("trigger_id", triggeredIds);

      triggeredRecommendations = (triggers ?? []).map((t) => ({
        trigger_id: t.trigger_id,
        rationale: t.rationale,
        report_flag_text: t.report_flag_text,
        target_instrument: t.target_instrument,
      }));
    }

    // ── 6. Fetch other instrument scores for this user ──
    const { data: otherResults } = await admin
      .from("assessment_results")
      .select("instrument_id, dimension_scores")
      .eq("user_id", result.user_id)
      .neq("id", assessment_result_id);

    const otherInstrumentScores: Record<string, Record<string, unknown>> = {};
    if (otherResults && otherResults.length > 0) {
      // Fetch instrument names for other results
      const otherInstrumentIds = [...new Set(otherResults.map((r) => r.instrument_id).filter(Boolean))];
      const { data: otherInstruments } = await admin
        .from("instruments")
        .select("instrument_id, instrument_name")
        .in("instrument_id", otherInstrumentIds);

      const instrNameLookup: Record<string, string> = {};
      for (const inst of otherInstruments ?? []) {
        instrNameLookup[inst.instrument_id] = inst.instrument_name;
      }

      // Fetch dimension names for other instruments
      const { data: otherDims } = await admin
        .from("dimensions")
        .select("dimension_id, dimension_name, instrument_id")
        .in("instrument_id", otherInstrumentIds);

      const otherDimLookup: Record<string, string> = {};
      for (const d of otherDims ?? []) {
        otherDimLookup[`${d.instrument_id}:${d.dimension_id}`] = d.dimension_name;
      }

      for (const r of otherResults) {
        const instrName = instrNameLookup[r.instrument_id!] ?? r.instrument_id!;
        const scores = r.dimension_scores as Record<string, Record<string, unknown>>;
        const mapped: Record<string, unknown> = {};
        for (const [dimId, scoreObj] of Object.entries(scores)) {
          const dimName = otherDimLookup[`${r.instrument_id}:${dimId}`] ?? dimId;
          mapped[dimName] = scoreObj.mean ?? scoreObj.readiness_level ?? scoreObj;
        }
        otherInstrumentScores[instrName] = mapped;
      }
    }

    // ── 7. Fetch instrument record ──
    const { data: instrument } = await admin
      .from("instruments")
      .select("instrument_name, scale_type")
      .eq("instrument_id", result.instrument_id!)
      .single();

    const instrumentName = instrument?.instrument_name ?? result.instrument_id!;
    const scaleType = instrument?.scale_type ?? "unknown";

    // ── 8. Build context object ──
    const dimensionScores = result.dimension_scores as Record<string, Record<string, unknown>>;

    const dimensionsContext = Object.entries(dimensionScores).map(([dimId, scoreObj]) => {
      const info = dimLookup[dimId];
      return {
        dimension_id: dimId,
        dimension_name: info?.dimension_name ?? dimId,
        score_or_level: scoreObj.mean ?? scoreObj.readiness_level ?? null,
        band_or_readiness: scoreObj.band ?? scoreObj.readiness_level ?? null,
        cross_instrument_notes: info?.cross_instrument_notes ?? null,
      };
    });

    const context: Record<string, unknown> = {
      user_name: userName,
      instrument_name: instrumentName,
      instrument_id: result.instrument_id,
      scale_type: scaleType,
      dimensions: dimensionsContext,
      triggered_recommendations: triggeredRecommendations,
      other_instrument_scores: otherInstrumentScores,
    };

    if (result.manager_dimension_scores) {
      context.manager_dimensions = result.manager_dimension_scores;
    }
    if (result.self_manager_divergence) {
      context.self_manager_divergence = result.self_manager_divergence;
    }

    // ── 9. Build user prompt ──
    const userPrompt = aiVersion.user_prompt_template.replace(
      "{{CONTEXT_JSON}}",
      JSON.stringify(context, null, 2)
    );

    // ── 10. Call Anthropic API ──
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiVersion.model_id,
        max_tokens: 2500,
        system: aiVersion.system_prompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errText);
      throw new Error(`Anthropic API error: ${anthropicResponse.status}`);
    }

    const anthropicData = await anthropicResponse.json();
    const narrative =
      anthropicData.content?.[0]?.text ?? "Report generation failed.";

    // ── 11. Store narrative ──
    const existingHistory = (result.ai_version_history as string[]) ?? [];
    const updatedHistory = result.ai_version
      ? [...existingHistory, result.ai_version]
      : existingHistory;

    const { error: updateErr } = await admin
      .from("assessment_results")
      .update({
        ai_narrative: narrative,
        ai_narrative_generated_at: new Date().toISOString(),
        ai_version: aiVersion.version_string,
        ai_version_history: updatedHistory,
      })
      .eq("id", assessment_result_id);

    if (updateErr) throw new Error(`Failed to store narrative: ${updateErr.message}`);

    // ── 12. Return success ──
    return new Response(
      JSON.stringify({ success: true, assessment_result_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-report error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
