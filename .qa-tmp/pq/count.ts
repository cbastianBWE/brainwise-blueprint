import J from "jspdf";
const d: any = new (J as any)();
console.log(typeof d.save, Object.getPrototypeOf(d) === (J as any).prototype, Object.getOwnPropertyNames(d).filter(k=>/save|output|getNumberOfPages/.test(k)));
