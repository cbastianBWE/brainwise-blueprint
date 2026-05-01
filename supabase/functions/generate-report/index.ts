import { createClient } from "npm:@supabase/supabase-js@2";
import { serverError } from "../_shared/errors.ts";
import { safeEqual } from "../_shared/secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Hybrid auth: internal-secret bypass OR user JWT with ownership check
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  const headerSecret = req.headers.get("x-internal-secret");
  const isInternal = !!(internalSecret && headerSecret && safeEqual(internalSecret, headerSecret));

  let callerUserId: string | null = null;

  if (!isInternal) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    callerUserId = user.id;
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

    // Ownership check (skip for internal calls)
    if (!isInternal && callerUserId) {
      if (result.user_id !== callerUserId) {
        const { data: callerProfile } = await admin
          .from("users")
          .select("account_type")
          .eq("id", callerUserId)
          .single();
        if (callerProfile?.account_type !== "brainwise_super_admin") {
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
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

    // ── 4b. Fetch driving facet scores (elevated/suppressed) ──
    const { data: responses } = await admin
      .from("assessment_responses")
      .select("response_value_numeric, is_reverse_scored, item_id")
      .eq("assessment_id", result.assessment_id);

    let elevatedFacets: Array<{ item_text: string; value: number; dimension_id: string }> = [];
    let suppressedFacets: Array<{ item_text: string; value: number; dimension_id: string }> = [];

    if (responses && responses.length > 0) {
      const itemIds = responses.map((r) => r.item_id);
      const { data: items } = await admin
        .from("items")
        .select("item_id, item_text, dimension_id")
        .in("item_id", itemIds);

      const itemMap: Record<string, { item_text: string; dimension_id: string }> = {};
      for (const it of items ?? []) {
        itemMap[it.item_id] = { item_text: it.item_text, dimension_id: it.dimension_id ?? "" };
      }

      const scoredItems = responses.map((r) => {
        const item = itemMap[r.item_id];
        const raw = Number(r.response_value_numeric);
        const value = r.is_reverse_scored ? 100 - raw : raw;
        return {
          item_text: item?.item_text ?? r.item_id,
          dimension_id: item?.dimension_id ?? "",
          value,
        };
      });

      const values = scoredItems.map((s) => s.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      const stdDev = Math.sqrt(variance);

      elevatedFacets = scoredItems
        .filter((s) => s.value > mean + stdDev)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      suppressedFacets = scoredItems
        .filter((s) => s.value < mean - stdDev)
        .sort((a, b) => a.value - b.value)
        .slice(0, 10);
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

    if (elevatedFacets.length > 0 || suppressedFacets.length > 0) {
      context.driving_facets = {
        elevated: elevatedFacets.map((f) => ({
          facet_text: f.item_text,
          score: f.value,
          dimension: dimLookup[f.dimension_id]?.dimension_name ?? f.dimension_id,
        })),
        suppressed: suppressedFacets.map((f) => ({
          facet_text: f.item_text,
          score: f.value,
          dimension: dimLookup[f.dimension_id]?.dimension_name ?? f.dimension_id,
        })),
      };
    }

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
        max_tokens: 8000,
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
    return serverError("generate-report", err, corsHeaders);
  }
});
