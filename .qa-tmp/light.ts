import { generatePairedOnePagerPdf } from "../src/lib/generatePairedOnePagerPdf";

const long = (n: number, seed: string) =>
  Array.from({ length: n }, (_, i) => `${seed} sentence ${i + 1} about how the two of you tend to move together under pressure.`).join(" ");

const v = (t: string) => ({ text: t });
const voice = (who: string) => ({
  bring: v(`I bring steadiness when things get loud, ${who}.`),
  need: v(`I need you to tell me early, not after you have decided.`),
  talk: v(`I go quiet and start planning before I say anything out loud at all.`),
  clash: v(`I feel my chest tighten and I want to leave the room immediately.`),
  repair: v(`I come back with a small practical offer rather than a big apology.`),
  close: v(`I feel closest when we are doing something ordinary side by side.`),
});

const data: any = {
  title: "Person A and Person B: the short version",
  opening: long(2, "Opening"),
  shared: {
    strong: v(long(1, "Strong")),
    talk: v(long(2, "Talk")),
    fight: v(long(2, "Fight")),
    repair: v(long(2, "Repair")),
  },
  a_to_b: voice("Person B"),
  b_to_a: voice("Person A"),
  watch: [
    { point: "The silent stretch", body: long(2, "Watch one") },
    { point: "The scoreboard", body: long(2, "Watch two") },
  ],
  talk_about: [
    "When did you last feel properly heard by me, and what was different that day?",
    "What do I do that makes it harder for you to say the thing you actually mean?",
    "Which of our arguments keeps coming back in a new costume?",
    "What would a good week between us actually look like in practice?",
  ],
  report_preview: Array.from({ length: 8 }, (_, i) => ({
    heading: `Section ${i + 1}: how you handle the hard part`,
    text: long(2, `Preview ${i + 1}`),
    facets: ["Emotional Safety", "Repair Speed", "Shared Direction"],
  })),
  disclaimer: long(2, "Disclaimer"),
};

await generatePairedOnePagerPdf(data, {
  nameA: "Alex",
  nameB: "Jordan",
  dateGenerated: "5 August 2026",
  nm: (s: string) => s.split("Person A").join("Alex").split("Person B").join("Jordan"),
});
