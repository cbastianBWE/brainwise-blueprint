import jsPDF from "jspdf";
import fs from "node:fs";
import { generateTeamProfilePdfBefore } from "./beforeGen";

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
    sections: Object.fromEntries(
      Object.entries((p.sections ?? {}) as Record<string, unknown>).map(([k, v]) => [
        k, typeof v === "string" ? JSON.parse(v) : v,
      ]),
    ),
  };

  const draws: Draw[] = [];
  let captured: any = null;
  const API: any = (jsPDF as any).API;
  const hook = ["initialized", function (this: any) {
    const doc = this;
    captured = doc;
    const orig = doc.text.bind(doc);
    doc.text = (txt: any, x: number, y: number, ...rest: any[]) => {
      const arr = Array.isArray(txt) ? txt : [txt];
      try {
        const f = doc.getFont();
        const size = doc.internal.getFontSize();
        const opts = rest.find((r) => r && typeof r === "object" && "align" in r) as { align?: string } | undefined;
        const align = opts?.align ?? "left";
        for (const t of arr) {
          if (typeof t !== "string" || !t) continue;
          const w = doc.getTextWidth(t);
          const right = align === "right" ? x : align === "center" ? x + w / 2 : x + w;
          draws.push({
            page: doc.internal.getCurrentPageInfo().pageNumber,
            x, y, right,
            text: t, font: `${f?.fontName}/${f?.fontStyle}`, size,
          });
        }
      } catch { /* ignore */ }
      return orig(txt, x, y, ...rest);
    };
    const os = doc.save.bind(doc);
    doc.save = () => doc;
    void os;
  }];
  API.events.push(hook);

  await generateTeamProfilePdfBefore(data as any, {
    teamInThree: true, domains: true, shapeLegend: true, driving: true,
    drivingFacetCharts: true, communication: true, conflict: true, leadership: true,
    leaderBrief: true, fullMap: true, fullMapCharts: true, coach: true,
  } as any);

  API.events.splice(API.events.indexOf(hook), 1);

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
  const lean = draws.filter((d) => /Lean on/.test(d.text) || d.text.length > 0);
  void lean;
  const leanLines = draws.filter((d) => d.font.startsWith("Montserrat") && d.size === 9 && d.right > 190);
  console.log("wide 9pt lines (lean-on candidates):", leanLines.length, leanLines.map((d) => d.right.toFixed(1)).join(","));
  const body = draws.filter((d) => !/^Page \d+ of|^AUGUST|BRAINWISE/i.test(d.text));
  const wb = body.reduce((a, b) => (b.right > a.right ? b : a), body[0]);
  console.log("widest BODY line:", wb.right.toFixed(2) + "mm", wb.font, wb.size, JSON.stringify(wb.text.slice(0, 80)));
  const lead = draws.filter((d) => d.font === "Poppins/bold" && d.size === 9);
  const wl = lead.reduce((a, b) => (b.right > a.right ? b : a), lead[0]);
  console.log("leadership action lines:", lead.length, "widest:", wl?.right.toFixed(2) + "mm", JSON.stringify(wl?.text.slice(0, 80)));
  const shapeHeads = draws.filter((d) => /Nobody down there|Nobody up here|Two groups|Even spread|Together/.test(d.text));
  console.log("full-map group headings:", shapeHeads.map((d) => `p${d.page}:${d.text}`).join(" | "));
  return { pages, over: over.length };
}

for (const p of profiles) await run(p, p.report_label ?? "(unnamed team)");
