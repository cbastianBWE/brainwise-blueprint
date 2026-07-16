import jsPDF from "jspdf";

const NAVY: [number, number, number] = [2, 31, 54];
const NAVY_CIRCLE: [number, number, number] = [16, 38, 58];
const ORANGE: [number, number, number] = [245, 116, 26];
const PEACH: [number, number, number] = [251, 224, 200];
const MUTED: [number, number, number] = [109, 104, 117];
const BLACK: [number, number, number] = [30, 30, 30];
const SAND_BG: [number, number, number] = [249, 247, 241];

interface Block { heading: string; items: string[] }
interface Section { label?: string; snapshot: string; blocks: Block[] }
export interface OnePager {
  audience: "work" | "therapist" | "partner" | "friend";
  title: string; disclaimer?: string; sections: Section[]; nutshell: string;
}

export async function generateOnePagerPdf(onePager: OnePager, opts: { userName: string; dateTaken?: string }): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { registerPdfFonts } = await import("./pdfFonts");
  await registerPdfFonts(doc);

  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const M = 16;
  const CONTENT_W = PAGE_W - M * 2;

  const logo = await (async () => {
    try {
      const res = await fetch("/logo-orange-white.png");
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const r = new FileReader(); r.onloadend = () => resolve(r.result as string); r.readAsDataURL(blob);
      });
    } catch { return null; }
  })();

  // ── Header band with decorative swirl (echoes the PTP report cover) ──
  const BAND_H = 50;
  doc.setFillColor(...NAVY); doc.rect(0, 0, PAGE_W, BAND_H, "F");
  doc.setFillColor(...NAVY_CIRCLE);
  doc.circle(PAGE_W - 4, 10, 30, "F");
  doc.circle(PAGE_W - 30, 42, 7, "F");
  doc.setDrawColor(...ORANGE); doc.setLineWidth(0.8);
  doc.circle(PAGE_W - 60, 20, 11, "S");
  doc.setFillColor(...PEACH); doc.circle(PAGE_W - 44, 34, 2.6, "F");

  if (logo) {
    const logoH = 30;
    let logoW = 52;
    try { const p = doc.getImageProperties(logo); logoW = (p.width / p.height) * logoH; } catch { /* fallback */ }
    doc.addImage(logo, "PNG", M, (BAND_H - logoH) / 2, logoW, logoH, undefined, "FAST");
  } else {
    doc.setFont("Poppins", "extrabold"); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
    doc.text("BrainWise", M, BAND_H / 2 + 3);
  }
  doc.setFont("Montserrat", "semibold"); doc.setFontSize(9.5); doc.setTextColor(...ORANGE); doc.setCharSpace(1.1);
  doc.text("ONE-PAGE SNAPSHOT", PAGE_W - M, BAND_H / 2 + 1, { align: "right" }); doc.setCharSpace(0);

  let y = BAND_H + 14;

  doc.setFont("Poppins", "bold"); doc.setFontSize(16.5); doc.setTextColor(...NAVY);
  const tl = doc.splitTextToSize(onePager.title, CONTENT_W); doc.text(tl, M, y); y += tl.length * 7.5 + 2;

  if (onePager.disclaimer) {
    doc.setFont("Montserrat", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
    const dl = doc.splitTextToSize(onePager.disclaimer, CONTENT_W); doc.text(dl, M, y); y += dl.length * 4.2 + 5;
  } else { y += 3; }

  const renderSection = (s: Section, x: number, w: number, startY: number, compact: boolean): number => {
    let yy = startY;
    const snapSize = compact ? 9.3 : 11;
    const bodySize = compact ? 9.3 : 10.5;
    const lh = compact ? 4.3 : 5.2;
    if (s.label) {
      doc.setFont("Poppins", "bold"); doc.setFontSize(compact ? 10.5 : 11.5); doc.setTextColor(...ORANGE);
      doc.text(s.label.toUpperCase(), x, yy); yy += compact ? 6.5 : 7.5;
    }
    doc.setFont("Montserrat", "normal"); doc.setFontSize(snapSize); doc.setTextColor(...BLACK);
    const snap = doc.splitTextToSize(s.snapshot, w); doc.text(snap, x, yy); yy += snap.length * lh + 3.5;
    for (const b of s.blocks) {
      doc.setFont("Poppins", "bold"); doc.setFontSize(bodySize + 0.6); doc.setTextColor(...NAVY);
      doc.text(b.heading, x, yy); yy += lh + 1.5;
      doc.setFont("Montserrat", "normal"); doc.setFontSize(bodySize); doc.setTextColor(...BLACK);
      for (const it of b.items) {
        const lines = doc.splitTextToSize(it, w - 4);
        doc.text("•", x, yy); doc.text(lines, x + 4, yy); yy += lines.length * lh + 1.6;
      }
      yy += 2.2;
    }
    return yy;
  };

  if (onePager.sections.length > 1) {
    const gutter = 9;
    const colW = (CONTENT_W - gutter) / 2;
    const leftEnd = renderSection(onePager.sections[0], M, colW, y, true);
    const rightEnd = renderSection(onePager.sections[1], M + colW + gutter, colW, y, true);
    y = Math.max(leftEnd, rightEnd) + 5;
  } else {
    y = renderSection(onePager.sections[0], M, CONTENT_W, y, false) + 4;
  }

  // ── Nutshell — set the font BEFORE measuring so wrapping matches the render ──
  doc.setFont("Montserrat", "semibold"); doc.setFontSize(10.5);
  const nut = doc.splitTextToSize("In a nutshell: " + onePager.nutshell, CONTENT_W - 10);
  const nutH = nut.length * 5 + 9;
  if (y + nutH > PAGE_H - 16) y = PAGE_H - 16 - nutH;
  doc.setFillColor(...SAND_BG); doc.roundedRect(M, y, CONTENT_W, nutH, 2.5, 2.5, "F");
  doc.setTextColor(...NAVY); doc.text(nut, M + 5, y + 6.8);

  doc.setFont("Montserrat", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
  doc.text(`${opts.userName} · Generated by BrainWise${opts.dateTaken ? " · " + opts.dateTaken : ""} · Confidential`, M, PAGE_H - 8);

  doc.save(`${opts.userName.replace(/\s+/g, "_")}_${onePager.audience}_one-page-snapshot.pdf`);
}
