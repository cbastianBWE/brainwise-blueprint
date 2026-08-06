import J from "jspdf";
const proto: any = (J as any).prototype;
console.log("keys", Object.getOwnPropertyNames(proto).slice(0,20), typeof (J as any).API?.save);
