import { generatePairedProfilePdfBefore } from "../src/lib/__qa_before";

const p = (n: number, s: string) =>
  Array.from({ length: n }, (_, i) => `${s} sentence ${i + 1} describing how the pair operates when the pressure is on.`).join(" ");

const bl = (n: number, s: string) =>
  Array.from({ length: n }, (_, i) => ({
    point: `${s} point ${i + 1}`,
    body: p(2, `${s} ${i + 1}`),
    facets: ["Emotional Safety", "Repair Speed"],
  }));

const facets = [
  "Emotional Safety", "Repair Speed", "Shared Direction", "Predictability",
  "Play", "Autonomy", "Reassurance", "Candour", "Pace", "Recognition",
];
const domains = ["Protection", "Participation", "Prediction", "Purpose", "Pleasure"];
const fullMap = facets.map((facetName, i) => ({
  itemNumber: i + 1,
  facetName,
  domain: domains[i % 5],
  shape: i % 3 === 0 ? "far_apart" : "aligned",
  driverScore: 60 + i,
  stats: { a: 40 + i * 3, b: 70 - i * 2 },
}));

const itemText = new Map<number, string>(
  facets.map((f, i) => [i + 1, `I find it easy to say what I actually want when we disagree about ${f.toLowerCase()}.`]),
);

const data: any = {
  mode: "romantic",
  nameA: "Alex",
  nameB: "Jordan",
  firstA: "Alex",
  firstB: "Jordan",
  nm: (s: string) => (s ?? "").split("Person A").join("Alex").split("Person B").join("Jordan"),
  dimensions: Object.fromEntries(domains.map((d, i) => [d, { a: 40 + i * 8, b: 70 - i * 5 }])),
  strengths: fullMap.slice(0, 3),
  focusAreas: fullMap.slice(3, 6),
  fullMap,
  itemText,
  sections: {
    pair_in_three: [1, 2, 3].map((i) => ({
      headline: `Headline ${i}: the pattern that keeps repeating`,
      detail: p(3, `Detail ${i}`),
      action: `Name the pattern out loud within the first two minutes of the next disagreement.`,
      facets: ["Emotional Safety", "Candour"],
    })),
    driving_facets: {
      opening: p(2, "Driving"),
      strengths: [1, 2].map((i) => ({ item: i, why: p(2, `Strength ${i}`), action: "Keep doing it deliberately." })),
      focus: [4, 5].map((i) => ({ item: i, why: p(2, `Focus ${i}`), action: "Try the smaller version first." })),
    },
    within_person: { a: bl(3, "A within"), b: bl(3, "B within") },
    needs: { a_needs_from_b: bl(3, "A needs"), b_needs_from_a: bl(3, "B needs") },
    communication: { general: bl(3, "Comms"), under_pressure: bl(3, "Pressure"), avoid_conflict: bl(3, "Avoid") },
    conflict: {
      summary: p(3, "Conflict"),
      mitigate: bl(3, "Mitigate"),
      promote_healthy: bl(3, "Promote"),
      per_person: {
        a: { read: p(2, "A read"), counter_move: p(1, "A move"), facets: ["Candour"] },
        b: { read: p(2, "B read"), counter_move: p(1, "B move"), facets: ["Pace"] },
      },
      safety: p(2, "Safety"),
    },
    repair: {
      overview: p(2, "Repair"),
      a: bl(2, "A repair"),
      b: bl(2, "B repair"),
      steps: bl(4, "Step"),
      safety: p(2, "Repair safety"),
      disclaimer: p(1, "Repair disclaimer"),
    },
    intimacy: { overview: p(2, "Intimacy"), a: bl(2, "A int"), b: bl(2, "B int"), disclaimer: p(1, "Int disclaimer") },
    coach: {
      why: [1, 4, 5, 7, 9].map((i) => ({
        item: i,
        rationale: `${data0Read(i)}\n\n${p(3, `Rationale ${i}`)}`,
      })),
      debrief_prompts: [
        "Where does each of them place responsibility for the last unresolved argument?",
        "Which of the two moves first, and what does that cost them?",
        "What would need to be true for the repair attempt to land?",
        "Which facet would you work first, and why that one?",
        "What is the risk of naming the pattern too early in the room?",
      ],
    },
  },
};

function data0Read(i: number): string {
  return `Alex scores 42 here and Jordan scores 78, a 36 point gap on item ${i}.`;
}

await generatePairedProfilePdfBefore(data, {
  pairInThree: true, atAGlance: true, shapeLegend: true, driving: true,
  drivingFacetCharts: true, within: true, needs: true, communication: true,
  conflict: true, leaderActions: false, repair: true, intimacy: true,
  fullMap: true, fullMapCharts: true, coach: true,
});
