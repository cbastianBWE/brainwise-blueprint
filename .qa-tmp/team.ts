import jsPDF from "jspdf";
import fs from "node:fs";
import { generateTeamProfilePdf } from "../src/lib/generateTeamProfilePdf";

const MARGIN_L = 15, CONTENT_W = 180, LIMIT = MARGIN_L + CONTENT_W;

const profiles = JSON.parse(fs.readFileSync(".qa-tmp/team-data.json", "utf8"));
const itemPairs: [number, string][] = JSON.parse(fs.readFileSync(".qa-tmp/items.json", "utf8"));
const itemText = new Map<number, string>(itemPairs);

type Draw = { page: number; x: number; y: number; right: number; text: string; font: string; size: number };

async function run(p: any, label: string) {
  const st = p.structured ?? {};
  const data = {
    teamName: p.report_label ?? "Team",
    memberCount: p.member_count,
    domains: st.dimensions ?? {},
    strengths: st.strengths ?? [],
    focusAreas: st.focusAreas ?? [],
    fullMap: st.fullMap ?? st.facets ?? [],
    scoresByItem: new Map<number, number[]>(),
    itemText,
    sections: p.sections ?? {},
  };

  const draws: Draw[] = [];
  const API: any = (jsPDF as any).API;
  const origText = API.text;
  let captured: any = null;
  API.text = function (txt: any, x: number, y: number, ...rest: any[]) {
    const arr = Array.isArray(txt) ? txt : [txt];
    try {
      const f = this.getFont?.();
      const size = this.internal.getFontSize();
      for (const t of arr) {
        if (typeof t !== "string" || !t) continue;
        draws.push({
          page: this.internal.getCurrentPageInfo().pageNumber,
          x, y, right: x + this.getTextWidth(t),
          text: t, font: `${f?.fontName}/${f?.fontStyle}`, size,
        });
      }
    } catch { /* ignore */ }
    return origText.call(this, txt, x, y, ...rest);
  };
  const origSave = API.save;
  API.save = function () { captured = this; return this; };

  await generateTeamProfilePdf(data as any, {
    team_in_three: true, driving_facets: true, communication: true,
    conflict: true, leadership: true, leader_brief: true, coach: true, full_map: true,
  } as any);

  API.text = origText;
  API.save = origSave;

  const pages = captured?.internal?.getNumberOfPages?.() ?? 0;
  const over = draws.filter((d) => d.right > LIMIT + 0.3);
  const widest = draws.reduce((a, b) => (b.right > a.right ? b : a), draws[0]);
  console.log(`\n===== ${label} =====`);
  console.log("pages:", pages, "| text draws:", draws.length);
  console.log("widest right edge:", widest.right.toFixed(2) + "mm", JSON.stringify(widest.text.slice(0, 60)));
  console.log("draws past 195mm:", over.length);
  for (const d of over.slice(0, 15))
    console.log(`   p${d.page} right=${d.right.toFixed(1)} ${d.font} ${d.size} ${JSON.stringify(d.text.slice(0, 90))}`);
  console.log("[object Object]:", draws.filter((d) => d.text.includes("[object Object]")).length);
  console.log("context suffixes:", draws.filter((d) => /\((professional|personal)\)/i.test(d.text)).length);
  const HEADS = ["In general", "Under pressure", "Avoiding conflict", "Mitigate", "Promote healthy", "Why these matter", "Debrief prompts"];
  for (const h of HEADS)
    for (const d of draws.filter((x) => x.text === h))
      console.log(`   head "${h}" p${d.page} y=${d.y.toFixed(1)} font=${d.font} size=${d.size}`);
  // stranded heading check: heading is last draw on its page
  const byPage = new Map<number, Draw[]>();
  for (const d of draws) (byPage.get(d.page) ?? byPage.set(d.page, []).get(d.page)!).push(d);
  for (const h of HEADS) {
    for (const d of draws.filter((x) => x.text === h)) {
      const after = (byPage.get(d.page) ?? []).filter((x) => x.y > d.y + 1);
      if (after.length < 2) console.log(`   STRANDED heading "${h}" on p${d.page}`);
    }
  }
  // numbering gaps for avoid_conflict sequence
  const nums = draws.filter((d) => /^\d+$/.test(d.text.trim()) && d.x < 25).map((d) => Number(d.text));
  console.log("small ordinals seen:", nums.slice(0, 30).join(","));
  return { pages, over: over.length };
}

for (const p of profiles) await run(p, p.report_label ?? "(unnamed team)");
