import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_DISCLAIMER = `You are an AI assistant for BrainWise. You help users reflect on their psychometric assessment results. You do not provide clinical diagnoses or professional psychological advice. Always frame responses as possibilities for reflection, not conclusions.

Be warm and conversational. Never be diagnostic. Always be suggestive and reflective. Use the user's assessment data to ground your responses but avoid making definitive statements about the user's personality or capabilities.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    let body: {
      message: string;
      conversation_history: Array<{ role: string; content: string }>;
      assessment_result_ids: string[];
      subscription_tier: string;
    };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, conversation_history = [], assessment_result_ids = [], subscription_tier = "base" } = body;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check usage via check-ai-usage function
    const usageRes = await fetch(`${supabaseUrl}/functions/v1/check-ai-usage`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body: JSON.stringify({ subscription_tier }),
    });
    const usage = await usageRes.json();

    if (!usage.allowed) {
      return new Response(
        JSON.stringify({ error: usage.message, limit_reached: true }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch assessment results
    const admin = createClient(supabaseUrl, serviceRoleKey);
    let contextBlocks: string[] = [];

    if (assessment_result_ids.length > 0) {
      const { data: results, error: resultsErr } = await admin
        .from("assessment_results")
        .select("id, dimension_scores, overall_profile, instrument_id, ai_narrative, instrument_version, created_at")
        .in("id", assessment_result_ids)
        .eq("user_id", user.id);

      if (resultsErr) {
        console.error("Failed to fetch results:", resultsErr.message);
      }

      if (results && results.length > 0) {
        // Fetch dimension names for all instruments
        const instrumentIds = [...new Set(results.map((r: any) => r.instrument_id).filter(Boolean))];
        let dimensionMap: Record<string, Record<string, string>> = {};

        if (instrumentIds.length > 0) {
          const { data: dims } = await admin
            .from("dimensions")
            .select("instrument_id, dimension_id, dimension_name")
            .in("instrument_id", instrumentIds);

          if (dims) {
            for (const d of dims) {
              if (!dimensionMap[d.instrument_id]) dimensionMap[d.instrument_id] = {};
              dimensionMap[d.instrument_id][d.dimension_id] = d.dimension_name;
            }
          }
        }

        // Fetch instrument names
        let instrumentNames: Record<string, string> = {};
        if (instrumentIds.length > 0) {
          const { data: instruments } = await admin
            .from("instruments")
            .select("instrument_id, instrument_name")
            .in("instrument_id", instrumentIds);
          if (instruments) {
            for (const inst of instruments) {
              instrumentNames[inst.instrument_id] = inst.instrument_name;
            }
          }
        }

        for (const result of results) {
          const instName = instrumentNames[result.instrument_id] || result.instrument_id;
          const dimNames = dimensionMap[result.instrument_id] || {};

          // Enrich dimension scores with names
          let enrichedScores = result.dimension_scores;
          if (enrichedScores && typeof enrichedScores === "object") {
            const enriched: Record<string, any> = {};
            for (const [key, val] of Object.entries(enrichedScores as Record<string, any>)) {
              const name = dimNames[key] || key;
              enriched[name] = val;
            }
            enrichedScores = enriched;
          }

          const date = new Date(result.created_at).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
          });

          contextBlocks.push(
            `--- Assessment: ${instName} (completed ${date}) ---\n` +
            `Dimension Scores: ${JSON.stringify(enrichedScores)}\n` +
            (result.overall_profile ? `Overall Profile: ${JSON.stringify(result.overall_profile)}\n` : "") +
            (result.ai_narrative ? `AI Narrative Summary: ${result.ai_narrative.slice(0, 2000)}\n` : "")
          );
        }
      }
    }

    // Build system prompt
    const systemPrompt = SYSTEM_DISCLAIMER +
      (contextBlocks.length > 0
        ? `\n\nHere is the user's assessment context:\n\n${contextBlocks.join("\n\n")}`
        : "\n\nThe user has not selected any assessment results for this conversation.");

    // Build messages array
    const messages = [
      ...conversation_history.map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Call Anthropic
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20250414",
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicRes.json();
    const assistantText = anthropicData.content?.[0]?.text || "I'm sorry, I couldn't generate a response.";

    return new Response(
      JSON.stringify({
        response: assistantText,
        usage: {
          current_count: usage.current_count,
          limit: usage.limit,
          remaining: usage.remaining,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-chat error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
