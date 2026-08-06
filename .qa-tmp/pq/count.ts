import J from "jspdf";
const A: any = (J as any).API;
console.log("API?", !!A, A && Object.keys(A).filter(k=>/save|output/.test(k)));
if (A) { A.save = function () { console.log("PAGES:", this.getNumberOfPages()); return this; }; }
