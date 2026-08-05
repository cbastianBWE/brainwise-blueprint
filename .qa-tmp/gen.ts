import jsPDF from "jspdf";
import { writeFileSync } from "fs";
(jsPDF as any).prototype.save = function (name: string) {
  writeFileSync("/tmp/qa/" + name, Buffer.from(this.output("arraybuffer")));
};
(globalThis as any).fetch = async () => ({ ok: false });
const { generatePairedOnePagerPdf } = await import("/dev-server/src/lib/generatePairedOnePagerPdf.ts");
const L = (t: string) => ({ text: t });
const sent = (n: number) => Array.from({ length: n }, (_, i) => `Sentence ${i + 1} of a realistic length that a generator would actually produce here.`).join(" ");
const voice = () => ({
  bring: L(sent(2)), need: L(sent(2)), talk: L(sent(2)),
  clash: L(sent(2)), repair: L(sent(2)), close: L(sent(2)),
});
const data: any = {
  title: "Alex and Sam: how you two work",
  opening: sent(3),
  shared: { strong: L(sent(2)), talk: L(sent(2)), fight: L(sent(2)), repair: L(sent(2)) },
  a_to_b: voice(), b_to_a: voice(),
  watch: [{ point: "Pace mismatch", body: sent(2) }, { point: "Silence reads as distance", body: sent(2) }],
  talk_about: [sent(1), sent(1), sent(1), sent(1)],
  report_preview: Array.from({ length: 6 }, (_, i) => ({ section: "s" + i, heading: "Section heading " + (i + 1), text: sent(2), facets: ["Warmth", "Assertiveness"] })),
  disclaimer: sent(2),
};
await generatePairedOnePagerPdf(data, { nameA: "Alex", nameB: "Sam", dateGenerated: "5 Aug 2026" });
