import jsPDF from "jspdf";
import { generateTeamProfilePdf } from "../src/lib/generateTeamProfilePdf";

const URL_ = process.env.VITE_SUPABASE_URL!;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const TOKEN = JSON.parse(process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON || "{}").access_token;

async function q(path: string) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${TOKEN ?? KEY}` },
  });
  if (!r.ok) throw new Error(path + " " + r.status + " " + (await r.text()));
  return r.json();
}
async function rpc(fn: string, body: unknown) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${TOKEN ?? KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) return [];
  return r.json();
}

const PAGE_W = 210, MARGIN_L = 15, CONTENT_W = 180;

async function run(profileId: string, label: string) {
  const [p] = await q(`team_profiles?id=eq.${profileId}&select=*`);
  const secRows = await q(`team_profile_sections?team_profile_id=eq.${profileId}&select=section_type,content`);
  const sections: Record<string, unknown> = {};
  for (const r of secRows) {
    sections[r.section_type] = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
  }
  const items = await q(`items_presentation?instrument_id=eq.INST-001&select=item_number,item_text`);
  const itemText = new Map<number, string>();
  for (const it of items) if (it.item_number != null) itemText.set(it.item_number, it.item_text);
  const dist = await rpc("bw_team_profile_distribution", { p_profile: profileId });
  const scoresByItem = new Map<number, number[]>();
  for (const r of dist as { item_number: number; scores: number[] }[]) {
    scoresByItem.set(r.item_number, (r.scores ?? []).slice().sort((a, b) => a - b));
  }
  const st = p.structured ?? {};
  const data = {
    teamName: p.report_label ?? "Team",
    memberCount: p.member_count,
    domains: st.dimensions ?? {},
    strengths: st.strengths ?? [],
    focusAreas: st.focusAreas ?? [],
    fullMap: st.fullMap ?? st.facets ?? [],
    scoresByItem,
    itemText,
    sections,
  };

  // shape census
  const census: Record<string, number> = {};
  for (const f of data.fullMap as { shape: string }[]) census[f.shape] = (census[f.shape] ?? 0) + 1;

  // instrument every text draw
  const draws: { page: number; x: number; right: number; text: string; font: string; size: number }[] = [];
  const origText = (jsPDF as any).API.text;
  let doc0: any = null;
  (jsPDF as any).API.text = function (txt: any, x: number, y: number, ...rest: any[]) {
    const arr = Array.isArray(txt) ? txt : [txt];
    try {
      const f = this.getFont?.();
      const size = this.getFontSize?.() ?? 0;
      for (const t of arr) {
        if (typeof t !== "string" || !t) continue;
        const w = this.getTextWidth(t);
        draws.push({
          page: this.internal.getCurrentPageInfo().pageNumber,
          x, right: x + w, text: t,
          font: `${f?.fontName}-${f?.fontStyle}`, size,
        });
      }
    } catch { /* ignore */ }
    return origText.call(this, txt, x, y, ...rest);
  };
  const origSave = (jsPDF as any).API.save;
  (jsPDF as any).API.save = function () { doc0 = this; return this; };

  await generateTeamProfilePdf(data as any, {
    teamInThree: true, domains: true, shapeLegend: true, driving: true,
    drivingFacetCharts: true, communication: true, conflict: true, leadership: true,
    leaderBrief: true, fullMap: true, fullMapCharts: false, coach: true,
  } as any);

  (jsPDF as any).API.text = origText;
  (jsPDF as any).API.save = origSave;

  const pages = doc0?.internal?.getNumberOfPages?.() ?? 0;
  const over = draws.filter((d) => d.right > MARGIN_L + CONTENT_W + 0.5);
  const widest = draws.reduce((a, b) => (b.right > a.right ? b : a), draws[0]);
  console.log(`\n===== ${label} (${profileId}) =====`);
  console.log("pages:", pages, "draws:", draws.length);
  console.log("shape census:", JSON.stringify(census));
  console.log("widest right edge:", widest.right.toFixed(2), "mm  |", JSON.stringify(widest.text.slice(0, 70)));
  console.log("draws past right margin (195mm):", over.length);
  for (const d of over.slice(0, 12)) console.log("  p" + d.page, d.right.toFixed(1), d.font, d.size, JSON.stringify(d.text.slice(0, 80)));
  const bad = draws.filter((d) => d.text.includes("[object Object]"));
  console.log("[object Object] draws:", bad.length);
  const suffix = draws.filter((d) => /\((professional|personal)\)/i.test(d.text));
  console.log("context-suffix labels:", suffix.length);
  // heading style check
  const HEADS = ["In general", "Under pressure", "Avoiding conflict", "Mitigate", "Promote healthy", "Why these matter", "Debrief prompts"];
  for (const h of HEADS) {
    const hits = draws.filter((d) => d.text === h);
    for (const d of hits) console.log(`  head "${h}" p${d.page} font=${d.font} size=${d.size}`);
  }
  return { pages, over: over.length, census };
}

await run("778fc709-5a5c-4165-9ed7-43704c0acc3d", "profile 1");
await run("b2a0fc06-7b35-495e-916a-23258d421b11", "profile 2");
