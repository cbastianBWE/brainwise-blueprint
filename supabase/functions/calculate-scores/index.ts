import { createClient } from "npm:@supabase/supabase-js@2";
import { serverError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // --- Auth ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } =
    await supabaseUser.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callerUserId = claimsData.claims.sub;

  // --- Parse input ---
  let body: { assessment_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { assessment_id } = body;
  if (!assessment_id || typeof assessment_id !== "string") {
    return new Response(
      JSON.stringify({ error: "assessment_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Use service role for all data operations
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ── Step 1: Fetch assessment ──
    const { data: assessment, error: assessmentErr } = await admin
      .from("assessments")
      .select("user_id, instrument_id, instrument_version, status, context_type, paired_assessment_id")
      .eq("id", assessment_id)
      .single();

    if (assessmentErr || !assessment) {
      return new Response(
        JSON.stringify({ error: "Assessment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only the assessment owner (or a coach who ordered it) should trigger scoring
    if (assessment.user_id !== callerUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, instrument_id, instrument_version } = assessment;

    // ── Step 2: Fetch responses ──
    const { data: responses, error: respErr } = await admin
      .from("assessment_responses")
      .select("item_id, response_value_numeric, is_reverse_scored, readiness_level")
      .eq("assessment_id", assessment_id);

    if (respErr) throw new Error(`Failed to fetch responses: ${respErr.message}`);
    if (!responses || responses.length === 0) {
      return new Response(
        JSON.stringify({ error: "No responses found for this assessment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 3: Fetch items for this instrument to get dimension_id & scale_type ──
    const { data: items, error: itemsErr } = await admin
      .from("items")
      .select("item_id, dimension_id, scale_type")
      .eq("instrument_id", instrument_id);

    if (itemsErr) throw new Error(`Failed to fetch items: ${itemsErr.message}`);

    // Build lookup: item_id → { dimension_id, scale_type }
    const itemLookup: Record<string, { dimension_id: string | null; scale_type: string | null }> = {};
    for (const item of items ?? []) {
      itemLookup[item.item_id] = {
        dimension_id: item.dimension_id,
        scale_type: item.scale_type,
      };
    }

    // ── Step 4 & 5: Apply reverse scoring and group by dimension ──
    // Determine instrument type. Real IDs are INST-001..INST-004 (+ INST-002L for EPN).
    // Keep the prefix checks as a fallback so any future PTP*/NAI*/etc. IDs still work.
    const isPTP = instrument_id === "INST-001" || instrument_id.startsWith("PTP");
    const isNAI = instrument_id === "INST-002" || instrument_id === "INST-002L" || instrument_id.startsWith("NAI");
    const isAIRSA = instrument_id === "INST-003" || instrument_id.startsWith("AIRSA");
    const isHSS = instrument_id === "INST-004" || instrument_id.startsWith("HSS");
    const isSlider = isPTP || isNAI; // 0-100 slider

    interface ProcessedResponse {
      item_id: string;
      value: number;
      readiness_level: string | null;
      dimension_id: string | null;
    }

    const processed: ProcessedResponse[] = responses.map((r) => {
      let value = Number(r.response_value_numeric);

      // Step 4: Reverse scoring
      if (r.is_reverse_scored) {
        if (isSlider) {
          // 0-100 slider: reversed = 100 - original
          value = 100 - value;
        } else if (isHSS) {
          // Level 1-4: reversed = 5 - original
          value = 5 - value;
        }
        // AIRSA (Never/Rarely/Often/Consistently): do not reverse
      }

      const itemInfo = itemLookup[r.item_id];
      return {
        item_id: r.item_id,
        value,
        readiness_level: r.readiness_level,
        dimension_id: itemInfo?.dimension_id ?? null,
      };
    });

    // Group by dimension_id
    const byDimension: Record<string, ProcessedResponse[]> = {};
    for (const p of processed) {
      const dim = p.dimension_id ?? "__unknown__";
      if (!byDimension[dim]) byDimension[dim] = [];
      byDimension[dim].push(p);
    }

    // ── Step 6: Calculate scores per dimension ──
    function scoreBand(mean: number): string {
      if (mean > 70) return "high";
      if (mean > 55) return "moderate_high";
      if (mean > 40) return "moderate";
      if (mean > 25) return "moderate_low";
      return "low";
    }

    function mostCommonReadiness(items: ProcessedResponse[]): string {
      const counts: Record<string, number> = {};
      for (const item of items) {
        const level = item.readiness_level ?? "Foundational";
        counts[level] = (counts[level] || 0) + 1;
      }

      // Rank order: Foundational < Proficient < Advanced (lower wins ties)
      const ranked = ["Foundational", "Proficient", "Advanced"];
      let best = ranked[0];
      let bestCount = 0;
      for (const level of ranked) {
        const c = counts[level] || 0;
        if (c > bestCount) {
          best = level;
          bestCount = c;
        }
        // If tied with current best, keep the one that appeared first in ranked (lower level)
      }
      return best;
    }

    const dimensionScores: Record<string, Record<string, unknown>> = {};
    const highDimensions: string[] = [];
    const lowDimensions: string[] = [];

    for (const [dimId, dimResponses] of Object.entries(byDimension)) {
      if (dimId === "__unknown__") continue;

      if (isAIRSA) {
        // AIRSA: most common readiness level
        const level = mostCommonReadiness(dimResponses);
        dimensionScores[dimId] = { readiness_level: level };
      } else {
        // PTP, NAI (0-100), HSS (1-4): mean
        const sum = dimResponses.reduce((acc, r) => acc + r.value, 0);
        const mean = parseFloat((sum / dimResponses.length).toFixed(2));

        if (isSlider) {
          const band = scoreBand(mean);
          dimensionScores[dimId] = { mean, band };
          if (band === "high") highDimensions.push(dimId);
          if (band === "low") lowDimensions.push(dimId);
        } else {
          // HSS: just mean, no band
          dimensionScores[dimId] = { mean };
          if (mean >= 3.5) highDimensions.push(dimId);
          if (mean <= 1.5) lowDimensions.push(dimId);
        }
      }
    }

    // ── Step 7: Evaluate trigger_logic ──
    const { data: triggers, error: trigErr } = await admin
      .from("trigger_logic")
      .select("trigger_id, trigger_condition, source_dimension, source_instrument");

    if (trigErr) throw new Error(`Failed to fetch trigger_logic: ${trigErr.message}`);

    const triggeredIds: string[] = [];

    for (const trig of triggers ?? []) {
      // Only evaluate triggers relevant to the current instrument
      if (trig.source_instrument && trig.source_instrument !== instrument_id) continue;

      const dimId = trig.source_dimension;
      if (!dimId || !dimensionScores[dimId]) continue;

      const dimScore = dimensionScores[dimId];
      const condition = trig.trigger_condition;
      if (!condition) continue;

      // Parse simple conditions like "avg > 50", "avg < 25", "mean >= 70"
      const match = condition.match(/^(?:avg|mean)\s*(>|>=|<|<=|==|!=)\s*(\d+(?:\.\d+)?)$/i);
      if (match) {
        const op = match[1];
        const threshold = parseFloat(match[2]);
        const mean = typeof dimScore.mean === "number" ? (dimScore.mean as number) : null;
        if (mean !== null) {
          let met = false;
          switch (op) {
            case ">": met = mean > threshold; break;
            case ">=": met = mean >= threshold; break;
            case "<": met = mean < threshold; break;
            case "<=": met = mean <= threshold; break;
            case "==": met = mean === threshold; break;
            case "!=": met = mean !== threshold; break;
          }
          if (met) triggeredIds.push(trig.trigger_id);
        }
      }
    }

    // ── Step 8 & 9: Build overall_profile ──
    const overall_profile = {
      high_dimensions: highDimensions,
      low_dimensions: lowDimensions,
      triggered_cross_instrument_recommendations: triggeredIds,
      profile_summary: `Scored ${Object.keys(dimensionScores).length} dimensions for ${instrument_id}. ${highDimensions.length} high, ${lowDimensions.length} low.`,
    };

    // ── Step 10: Fetch active ai_version ──
    const { data: aiVersion } = await admin
      .from("ai_versions")
      .select("version_string")
      .eq("is_active", true)
      .limit(1)
      .single();

    const ai_version = aiVersion?.version_string ?? null;

    // ── Step 11: Insert assessment_results ──
    // For PTP, mark narrative_status='generating' so the report page can gate on readiness.
    const isPtpInstrument = isPTP;
    const { data: result, error: insertErr } = await admin
      .from("assessment_results")
      .insert({
        assessment_id,
        user_id,
        instrument_id,
        instrument_version,
        dimension_scores: dimensionScores,
        overall_profile,
        ai_version,
        ai_version_history: ai_version ? [ai_version] : [],
        manager_dimension_scores: null,
        self_manager_divergence: null,
        narrative_status: isPtpInstrument ? "generating" : null,
        narrative_started_at: isPtpInstrument ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (insertErr) throw new Error(`Failed to insert result: ${insertErr.message}`);

    // Mark assessment as completed
    await admin
      .from("assessments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", assessment_id);

    // ── Trigger narrative report generation (fire-and-forget) ──
    try {
      const reportUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-report`;
      fetch(reportUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "",
        },
        body: JSON.stringify({ assessment_result_id: result!.id }),
      }).catch((e) => console.error("generate-report fire-and-forget error:", e));
    } catch (e) {
      console.error("Failed to trigger generate-report:", e);
    }

    // ── PTP narrative pre-generation (fire-and-forget fan-out) ──
    // For PTP only: dispatch generate-facet-interpretations calls in the background
    // so by the time the user lands on /my-results the narratives are already cached.
    // Each child invoke runs in its own 150s budget. Status is updated when all settle.
    if (isPtpInstrument) {
      const ctxType = (assessment as { context_type?: string | null }).context_type ?? null;
      // Determine which contexts to pre-generate.
      // PTP both = professional + personal + combined; single context = that context only.
      const contexts: string[] =
        ctxType === "professional"
          ? ["professional"]
          : ctxType === "personal"
          ? ["personal"]
          : ["professional", "personal", "combined"];

      const callBodies: Record<string, unknown>[] = [];
      for (const ctx of contexts) {
        callBodies.push({ assessment_result_id: result!.id, narrative_context: ctx });
        callBodies.push({ assessment_result_id: result!.id, generate_context_narrative: true, narrative_context: ctx });
        callBodies.push({ assessment_result_id: result!.id, generate_dimension_highlights: true, narrative_context: ctx });
        callBodies.push({ assessment_result_id: result!.id, generate_cross_and_action: true, narrative_context: ctx });
      }

      // Use admin.functions.invoke so auth uses whatever scheme this project's
      // Supabase runtime expects (legacy JWT vs new signing keys). Direct fetch
      // with `Bearer <SUPABASE_SERVICE_ROLE_KEY>` was rejected as a malformed
      // JWT under signing-keys mode.
      const fanOut = Promise.allSettled(
        callBodies.map((body) =>
          admin.functions.invoke("generate-facet-interpretations", { body }).then((res) => {
            if (res.error) {
              throw new Error(`facet: ${res.error.message ?? String(res.error)}`);
            }
            return res;
          }),
        ),
      ).then(async (results) => {
        const failures = results.filter((x) => x.status === "rejected");
        const finalStatus = failures.length === 0 ? "ready" : "failed";
        if (failures.length > 0) {
          console.error(
            `[calculate-scores] PTP narrative fan-out: ${failures.length}/${results.length} failed`,
            failures.map((f) => (f as PromiseRejectedResult).reason?.message ?? String((f as PromiseRejectedResult).reason)),
          );
        }
        await admin
          .from("assessment_results")
          .update({
            narrative_status: finalStatus,
            narrative_completed_at: new Date().toISOString(),
          })
          .eq("id", result!.id);
      }).catch((e) => console.error("[calculate-scores] PTP fan-out outer error:", e));

      // Keep the background promise alive after the response is sent.
      // EdgeRuntime.waitUntil is the supported Supabase API; fall back to bare promise if absent.
      try {
        // @ts-expect-error EdgeRuntime is provided by the Supabase Deno runtime
        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
          // @ts-expect-error EdgeRuntime is provided by the Supabase Deno runtime
          EdgeRuntime.waitUntil(fanOut);
        }
      } catch (e) {
        console.error("[calculate-scores] EdgeRuntime.waitUntil unavailable:", e);
      }
    }

    // ── Step 12: Upsert ai_usage ──
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Direct upsert via raw SQL isn't available, so check-then-upsert
    const { data: existingUsage } = await admin
      .from("ai_usage")
      .select("id, message_count")
      .eq("user_id", user_id)
      .eq("month_year", monthYear)
      .eq("usage_type", "report_generation")
      .maybeSingle();

    if (existingUsage) {
      await admin
        .from("ai_usage")
        .update({
          message_count: existingUsage.message_count + 1,
          last_used_at: now.toISOString(),
        })
        .eq("id", existingUsage.id);
    } else {
      await admin.from("ai_usage").insert({
        user_id,
        usage_type: "report_generation",
        month_year: monthYear,
        message_count: 1,
        last_used_at: now.toISOString(),
      });
    }

    // ── Step 13: Return success ──
    return new Response(
      JSON.stringify({ success: true, assessment_result_id: result!.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return serverError("calculate-scores", err, corsHeaders);
  }
});
