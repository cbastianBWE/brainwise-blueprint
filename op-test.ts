import { generateOnePagerPdf } from "./src/lib/generateOnePagerPdf";
const jsPDFmod = await import("jspdf");
(jsPDFmod.jsPDF.prototype as any).save = function(n:string){ console.log("saved", n, "pages", this.getNumberOfPages()); };
(globalThis as any).fetch = async () => ({ ok:false });
const mk = (chars:number, blocks:number) => {
  const per = Math.floor(chars/blocks);
  return { snapshot: "x ".repeat(40), blocks: Array.from({length:blocks},(_,i)=>({heading:"Heading "+i, items:["word ".repeat(Math.floor(per/10)), "word ".repeat(Math.floor(per/10))]})) };
};
for (const [name, secs] of [["therapist-worst",[mk(1700,4),mk(1700,4)]],["friend-mid",[mk(900,3)]]] as any) {
  await generateOnePagerPdf({audience:"therapist", title:"A shared snapshot of what matters", disclaimer:"Not a diagnosis.", sections:secs, nutshell:"y ".repeat(60)} as any, {userName:"Test User", dateTaken:"2026-08-05"});
  console.log("--", name);
}
// malformed
await generateOnePagerPdf({audience:"friend", title:"T", sections:[{snapshot:"hi", blocks:[{heading:null, items:null} as any, {heading:"ok", items:["a"]}]}], nutshell:"n"} as any, {userName:"Null Case"});
console.log("malformed ok");
