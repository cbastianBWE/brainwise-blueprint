import * as J from "jspdf";
const proto = ((J as any).jsPDF ?? (J as any).default).prototype;
const orig = proto.save;
proto.save = function (...a: any[]) {
  console.log("PAGES:", this.getNumberOfPages());
  return this;
};
console.log("patched", typeof orig);
