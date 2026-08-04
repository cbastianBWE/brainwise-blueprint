import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Lens = "love" | "good" | "need" | "paid";
const LENSES: Lens[] = ["love", "good", "need", "paid"];

interface MMValue {
  text?: string;
  mode?: string;
  transcript?: string;
}

function itemLabel(v: unknown): string {
  if (typeof v === "string") return v.trim();
  const mm = (v ?? {}) as MMValue;
  return String(mm.text || mm.transcript || "").trim();
}

function regionFor(lenses: Lens[]): string {
  const sorted = LENSES.filter((l) => lenses.includes(l));
  if (sorted.length === 4) return "ikigai";
  if (sorted.length === 0) return "unplaced";
  return sorted.join("+");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    let body: { session_id?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const sessionId = body.session_id;
    if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
      return json({ error: "session_id must be a uuid" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: session, error: sessErr } = await admin
      .from("relationship_activity_sessions")
      .select("id, user_id, activity_id, responses")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessErr) return json({ error: "Could not load session" }, 500);
    if (!session) return json({ error: "Session not found" }, 404);
    // The map is personal: only the session owner may generate it.
    if (session.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    const { data: activity } = await admin
      .from("relationship_activities")
      .select("definition")
      .eq("id", session.activity_id)
      .maybeSingle();

    const steps: any[] = (activity?.definition as any)?.steps ?? [];
    const ikigaiStep = steps.find((s) => s?.widget === "ikigai" && Array.isArray(s?.lenses));
    const lensDefs: { lens: Lens; storeKey: string; label?: string }[] =
      (ikigaiStep?.lenses ?? []).filter((l: any) => LENSES.includes(l?.lens));
    if (lensDefs.length === 0) return json({ error: "No ikigai lenses on this activity" }, 400);

    const responses = (session.responses ?? {}) as Record<string, unknown>;
    const source: { label: string; source_lens: Lens }[] = [];
    for (const def of lensDefs) {
      const arr = responses[def.storeKey];
      if (!Array.isArray(arr)) continue;
      for (const v of arr) {
        const label = itemLabel(v);
        if (label) source.push({ label, source_lens: def.lens });
      }
    }
    if (source.length === 0) {
      return json({ error: "Add a few entries first, then map." }, 400);
    }

    const prompt = `You are helping someone map their own answers onto the four Ikigai lenses:
love (what they love), good (what they are good at), need (what the people around them need), paid (what they could be rewarded for).

Here are their entries, each with the lens they wrote it under:
${source.map((s, i) => `${i + 1}. [${s.source_lens}] ${s.label}`).join("\n")}

For every entry, decide which of the four lenses it genuinely belongs to (always include its source lens). Add a one-sentence reasoning in warm, plain, second-person language. Never diagnose; frame everything as a possibility.

Reply with JSON only, no prose, in this exact shape:
{"items":[{"label":"...","source_lens":"love","lenses":["love","good"],"reasoning":"..."}],"sufficiency":{"enough":true,"note":"...","questions":["..."]}}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiRes.ok) {
      console.error("Anthropic error", aiRes.status, await aiRes.text());
      return json({ error: "Could not map your Ikigai right now." }, 502);
    }
    const aiData = await aiRes.json();
    const raw = String(aiData?.content?.[0]?.text ?? "");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    let parsed: any = null;
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(raw.slice(start, end + 1));
      } catch {
        parsed = null;
      }
    }

    const byLabel = new Map<string, Lens>(source.map((s) => [s.label, s.source_lens]));
    const modelItems: any[] = Array.isArray(parsed?.items) ? parsed.items : [];
    const items = source.map((s) => {
      const hit = modelItems.find((m) => String(m?.label ?? "").trim() === s.label);
      const lenses = Array.from(
        new Set<Lens>([
          s.source_lens,
          ...((Array.isArray(hit?.lenses) ? hit.lenses : []) as Lens[]).filter((l) => LENSES.includes(l)),
        ]),
      );
      return {
        label: s.label,
        source_lens: byLabel.get(s.label) ?? s.source_lens,
        lenses,
        region: regionFor(lenses),
        reasoning: typeof hit?.reasoning === "string" ? hit.reasoning : undefined,
      };
    });

    const ikigai_map = {
      items,
      sufficiency:
        parsed?.sufficiency && typeof parsed.sufficiency === "object"
          ? {
              enough: parsed.sufficiency.enough !== false,
              note: String(parsed.sufficiency.note ?? ""),
              questions: Array.isArray(parsed.sufficiency.questions)
                ? parsed.sufficiency.questions.filter((q: unknown) => typeof q === "string")
                : [],
            }
          : undefined,
      model: "claude-haiku-4-5-20251001",
      generated_at: new Date().toISOString(),
    };

    const mapKey = ikigaiStep?.mapKey || "ikigai_map";
    const { error: saveErr } = await admin
      .from("relationship_activity_sessions")
      .update({ responses: { ...responses, [mapKey]: ikigai_map } })
      .eq("id", sessionId);
    if (saveErr) console.error("Could not persist ikigai map", saveErr.message);

    return json({ ikigai_map });
  } catch (e) {
    console.error("relationship-ikigai-map failed", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
