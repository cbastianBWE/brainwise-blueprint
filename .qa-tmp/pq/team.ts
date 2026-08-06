import "./count";
import { generateTeamProfilePdf } from "../../src/lib/generateTeamProfilePdf";
import type { TeamPdfData } from "../../src/lib/assembleTeamPdfData";

const p = (n: number, s: string) =>
  Array.from({ length: n }, (_, i) => `${s} sentence ${i + 1} describing how the team operates under pressure.`).join(" ");
const bl = (n: number, s: string) =>
  Array.from({ length: n }, (_, i) => ({ point: `${s} point ${i + 1}`, body: p(2, `${s} ${i + 1}`), facets: ["Emotional Safety", "Repair Speed"] }));

const facets = ["Emotional Safety","Repair Speed","Shared Direction","Predictability","Play","Autonomy","Reassurance","Candor","Pace","Recognition"];
const domains = ["Protection","Participation","Prediction","Purpose","Pleasure"];
const mk = (facetName: string, i: number) => ({
  itemNumber: i + 1, facetName, domain: domains[i % 5],
  shape: ["allHigh","allLow","two","even","together"][i % 5],
  driverScore: (i % 10) / 10,
  stats: { n: 8, mean: 40 + i * 2, min: 10, max: 90, range: 80 },
});
const fullMap = facets.map(mk);

const data: TeamPdfData = {
  teamName: "Delivery",
  memberCount: 8,
  domains: Object.fromEntries(domains.map((d, i) => [d, { mean: 50 + i, high: 3, low: 2 }])),
  strengths: [fullMap[0]],
  focusAreas: fullMap.slice(1, 5),
  fullMap,
  scoresByItem: new Map(fullMap.map((f) => [f.itemNumber, [10, 30, 45, 60, 72, 80, 88, 95]])),
  itemText: new Map(fullMap.map((f) => [f.itemNumber, `Item text for ${f.facetName}.`])),
  sections: {
    team_in_three: Array.from({ length: 3 }, (_, i) => ({ headline: `Headline ${i + 1}`, detail: p(2, `Detail ${i + 1}`), action: p(1, `Action ${i + 1}`), facets: ["Emotional Safety"] })),
    driving_facets: { opening: p(2, "Opening"), strengths: [{ item: 1, why: p(2, "Why s"), actions: [p(1, "a1"), p(1, "a2")] }], focus: fullMap.slice(1,5).map((f, i) => ({ item: f.itemNumber, why: p(2, `Why f${i}`), actions: [p(1, "b1"), p(1, "b2")] })) },
    communication: { general: bl(3, "Gen"), under_pressure: bl(3, "Press"), avoid_conflict: bl(4, "Avoid") },
    conflict: { summary: p(2, "Conflict"), mitigate: bl(3, "Mit"), promote_healthy: bl(3, "Pro") },
    leader_brief: { rows: fullMap.slice(0,4).map((f) => ({ item: f.itemNumber, risk_to_work: p(1, "Risk"), the_move: p(1, "Move"), potential_owner: "Team lead" })), lean_on: p(2, "Lean") },
    leadership: Array.from({ length: 3 }, (_, i) => ({ headline: `Leader ${i + 1}`, detail: p(2, `LDetail ${i}`), action: p(1, "LAction"), facets: ["Play"] })),
    coach: { why: fullMap.slice(0,5).map((f) => ({ item: f.itemNumber, rationale: p(3, "Rationale") })), debrief_prompts: Array.from({length:5},(_,i)=>`Prompt ${i+1}?`) },
  },
};

await generateTeamProfilePdf(data, {
  teamInThree: true, domains: true, shapeLegend: true, driving: true, drivingFacetCharts: true,
  communication: true, conflict: true, leadership: true, leaderBrief: true, fullMap: true,
  fullMapCharts: true, coach: true,
});
