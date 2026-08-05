import jsPDF from "jspdf";
(globalThis as any).fetch = async () => ({ ok: false });
const out: any = {};
(jsPDF as any).prototype.save = function (name: string) {
  require("fs").writeFileSync("/tmp/op.pdf", Buffer.from(this.output("arraybuffer")));
  out.name = name;
};
const { generatePairedOnePagerPdf } = await import("./src/lib/generatePairedOnePagerPdf");
const L = (n: number) => ({ text: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor. ".repeat(n).trim() });
const voice = { bring: L(2), need: L(2), talk: L(2), clash: L(2), repair: L(2), close: L(2) };
await generatePairedOnePagerPdf({
  title: "Person A and Person B: the shape you make together",
  opening: L(3).text,
  shared: { strong: L(2), talk: L(2), fight: L(2), repair: L(2) },
  a_to_b: voice, b_to_a: voice,
  watch: [{ point: "Watch this", body: L(2).text, facets: ["Reassurance"] }, { point: "And this", body: L(2).text }],
  talk_about: [L(1).text, L(1).text, L(1).text, L(1).text],
  report_preview: Array.from({ length: 8 }, (_, i) => ({ section: "s" + i, heading: "Section heading " + i, text: L(2).text, facets: ["Reassurance", "Novelty"] })),
  disclaimer: L(1).text,
} as any, { nameA: "Alex", nameB: "Sam", dateGenerated: "5 Aug 2026" });
console.log("saved", out.name);
