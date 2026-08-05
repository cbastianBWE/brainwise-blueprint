import jsPDF from "jspdf";
import { writeFileSync } from "fs";
(jsPDF as any).API.save = function (name: string) {
  writeFileSync("/tmp/qa/" + name, Buffer.from(this.output("arraybuffer")));
};
(globalThis as any).fetch = async () => ({ ok: false });
const { generatePairedProfilePdf } = await import("/dev-server/src/lib/generatePairedProfilePdf.ts");
const sent = (n: number) => Array.from({ length: n }, (_, i) => `Sentence ${i + 1} of a realistic length that a generator would actually produce for this pair.`).join(" ");
const bullets = (n: number) => Array.from({ length: n }, (_, i) => ({ point: `Point ${i + 1}`, body: sent(2), facets: ["Warmth"] }));
const facet = (i: number) => ({ itemNumber: i, facetName: "Facet " + i, domain: "Personality", shape: i % 2 ? "Far apart" : "Both high", driverScore: 60 + i, stats: { a: 40 + i, b: 70 - i } });
const data: any = {
  mode: "romantic", nameA: "Alex Doe", nameB: "Sam Roe", firstA: "Alex", firstB: "Sam",
  nm: (s: string) => s,
  dimensions: { Personality: { a: 62, b: 48 }, Purpose: { a: 55, b: 71 }, Perception: { a: 44, b: 66 }, Performance: { a: 70, b: 52 }, Presence: { a: 58, b: 61 } },
  strengths: [1, 2, 3].map(facet), focusAreas: [4, 5, 6].map(facet), fullMap: Array.from({ length: 12 }, (_, i) => facet(i + 1)),
  itemText: new Map(Array.from({ length: 12 }, (_, i) => [i + 1, "Item text " + (i + 1)])),
  sections: {
    pair_in_three: [1, 2, 3].map((i) => ({ headline: "Headline " + i, detail: sent(3), action: sent(1), facets: ["Warmth"] })),
    driving_facets: { opening: sent(2), strengths: [1, 2, 3].map((i) => ({ item: i, why: sent(2), actions: [sent(1), sent(1)] })), focus: [4, 5, 6].map((i) => ({ item: i, why: sent(2), actions: [sent(1)] })) },
    within_person: { a: bullets(3), b: bullets(3) },
    needs: { a_needs_from_b: bullets(3), b_needs_from_a: bullets(3) },
    communication: { general: bullets(3), under_pressure: bullets(3), avoid_conflict: bullets(3) },
    conflict: { summary: sent(2), mitigate: bullets(3), promote_healthy: bullets(3), per_person: { a: { read: sent(1), counter_move: sent(1) }, b: { read: sent(1), counter_move: sent(1) } }, safety: sent(1) },
    repair: { overview: sent(2), a: bullets(2), b: bullets(2), steps: bullets(3), safety: sent(1), disclaimer: sent(1) },
    intimacy: { overview: sent(2), a: bullets(2), b: bullets(2), disclaimer: sent(1) },
    coach: { why: [{ item: 1, rationale: sent(1) }], debrief_prompts: [sent(1), sent(1)] },
  },
};
const sections: any = { pairInThree: true, atAGlance: true, shapeLegend: true, driving: true, withinPerson: true, needs: true, communication: true, conflict: true, leaderActions: true, repair: true, intimacy: true, fullMap: true, fullMapCharts: true, coach: true };
await generatePairedProfilePdf(data, sections);
console.log("ok");
