import jsPDF from "jspdf";

const NAVY: [number, number, number] = [2, 31, 54];
const NAVY_CIRCLE: [number, number, number] = [16, 38, 58];
const ORANGE: [number, number, number] = [245, 116, 26];
const PEACH: [number, number, number] = [251, 224, 200];
const MUTED: [number, number, number] = [109, 104, 117];
const BLACK: [number, number, number] = [30, 30, 30];
const SAND_BG: [number, number, number] = [249, 247, 241];

/** Shrink ladder. Step 0 is today's typography, byte-for-byte. */
const LADDER = [1, 0.965, 0.93, 0.895, 0.86, 0.825, 0.79];

interface Block { heading: string; items: string[] }
interface Section { label?: string; snapshot: string; blocks: Block[] }
export interface OnePager {
  audience: "work" | "therapist" | "partner" | "friend";
  title: string; disclaimer?: string; sections: Section[]; nutshell: string;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function generateOnePagerPdf(onePager: OnePager, opts: { userName: string; dateTaken?: string }): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { registerPdfFonts } = await import("./pdfFonts");
  await registerPdfFonts(doc);

  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const M = 16;
  const CONTENT_W = PAGE_W - M * 2;
  /** Single footer boundary. Nothing is drawn below this, on any page. */
  const BOTTOM = PAGE_H - 16;
  const BAND_H = 50;
  const CONT_TOP = 20;

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

  /* ── sanitise: degrade, never throw ── */
  const sections: Section[] = (Array.isArray(onePager.sections) ? onePager.sections : [])
    .map((s) => ({
      label: str(s?.label) || undefined,
      snapshot: str(s?.snapshot),
      blocks: (Array.isArray(s?.blocks) ? s.blocks : [])
        .map((b) => ({
          heading: str(b?.heading),
          items: (Array.isArray(b?.items) ? b.items : []).map(str).filter(Boolean),
        }))
        .filter((b) => b.heading && b.items.length > 0),
    }))
    .filter((s) => s.snapshot || s.blocks.length > 0);
  const nutshell = str(onePager.nutshell);
  const title = str(onePager.title);
  const disclaimer = str(onePager.disclaimer);

  const twoCol = sections.length > 1;

  /* ── page cursor: dry run counts pages, draw pass materialises them ── */
  let draw = false;
  let pagesUsed = 1;
  const goto = (p: number) => {
    pagesUsed = Math.max(pagesUsed, p);
    if (!draw) return;
    while (doc.getNumberOfPages() < p) doc.addPage();
    doc.setPage(p);
  };

  const header = () => {
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
  };

  /**
   * Lays out one section. Measures when `draw` is false, paints when true.
   * Returns { y, page } so a two-column layout can pick the taller column.
   */
  const renderSection = (
    s: Section, x: number, w: number, startY: number, startPage: number, compact: boolean, k: number,
  ): { y: number; page: number } => {
    let yy = startY;
    let page = startPage;
    const snapSize = (compact ? 9.3 : 11) * k;
    const bodySize = (compact ? 9.3 : 10.5) * k;
    const lh = (compact ? 4.3 : 5.2) * k;

    /** page break: type and leading scale together, gaps scale with them */
    const ensure = (h: number) => {
      if (yy + h > BOTTOM) { page += 1; goto(page); yy = CONT_TOP; }
    };

    if (s.label) {
      ensure(lh * 2);
      goto(page);
      if (draw) {
        doc.setFont("Poppins", "bold"); doc.setFontSize((compact ? 10.5 : 11.5) * k); doc.setTextColor(...ORANGE);
        doc.text(s.label.toUpperCase(), x, yy);
      }
      yy += (compact ? 6.5 : 7.5) * k;
    }
    if (s.snapshot) {
      doc.setFont("Montserrat", "normal"); doc.setFontSize(snapSize);
      const snap = doc.splitTextToSize(s.snapshot, w) as string[];
      ensure(snap.length * lh);
      goto(page);
      if (draw) { doc.setTextColor(...BLACK); doc.text(snap, x, yy); }
      yy += snap.length * lh + 3.5 * k;
    }
    for (const b of s.blocks) {
      doc.setFont("Poppins", "bold"); doc.setFontSize(bodySize + 0.6 * k);
      ensure(lh * 2);
      goto(page);
      if (draw) {
        doc.setFont("Poppins", "bold"); doc.setFontSize(bodySize + 0.6 * k); doc.setTextColor(...NAVY);
        doc.text(b.heading, x, yy);
      }
      yy += lh + 1.5 * k;
      for (const it of b.items) {
        doc.setFont("Montserrat", "normal"); doc.setFontSize(bodySize);
        const lines = doc.splitTextToSize(it, w - 4) as string[];
        ensure(lines.length * lh);
        goto(page);
        if (draw) {
          doc.setFont("Montserrat", "normal"); doc.setFontSize(bodySize); doc.setTextColor(...BLACK);
          doc.text("•", x, yy); doc.text(lines, x + 4, yy);
        }
        yy += lines.length * lh + 1.6 * k;
      }
      yy += 2.2 * k;
    }
    return { y: yy, page };
  };

  /** Whole document at one ladder step. Returns the nutshell box bottom + page count. */
  const layout = (step: number): { bottom: number; pages: number } => {
    const k = LADDER[step];
    pagesUsed = 1;
    goto(1);
    if (draw) header();

    let y = BAND_H + 14;
    let page = 1;

    if (title) {
      doc.setFont("Poppins", "bold"); doc.setFontSize(16.5);
      const tl = doc.splitTextToSize(title, CONTENT_W) as string[];
      if (draw) { doc.setTextColor(...NAVY); doc.text(tl, M, y); }
      y += tl.length * 7.5 + 2;
    }

    if (disclaimer) {
      doc.setFont("Montserrat", "normal"); doc.setFontSize(8.5);
      const dl = doc.splitTextToSize(disclaimer, CONTENT_W) as string[];
      if (draw) { doc.setTextColor(...MUTED); doc.text(dl, M, y); }
      y += dl.length * 4.2 + 5;
    } else { y += 3; }

    if (twoCol) {
      const gutter = 9;
      const colW = (CONTENT_W - gutter) / 2;
      const left = renderSection(sections[0], M, colW, y, page, true, k);
      const right = renderSection(sections[1], M + colW + gutter, colW, y, page, true, k);
      // both columns share the step, so they stay visually matched
      page = Math.max(left.page, right.page);
      y = (left.page === right.page ? Math.max(left.y, right.y) : (left.page > right.page ? left.y : right.y)) + 5;
    } else if (sections.length === 1) {
      const one = renderSection(sections[0], M, CONTENT_W, y, page, false, k);
      page = one.page; y = one.y + 4;
    }

    let bottom = y;
    if (nutshell) {
      doc.setFont("Montserrat", "semibold"); doc.setFontSize(10.5);
      const nut = doc.splitTextToSize("In a nutshell: " + nutshell, CONTENT_W - 10) as string[];
      const nutH = nut.length * 5 + 9;
      // never pulled upward over content: it breaks to the next page instead
      if (y + nutH > BOTTOM) { page += 1; goto(page); y = CONT_TOP; }
      goto(page);
      if (draw) {
        doc.setFillColor(...SAND_BG); doc.roundedRect(M, y, CONTENT_W, nutH, 2.5, 2.5, "F");
        doc.setFont("Montserrat", "semibold"); doc.setFontSize(10.5);
        doc.setTextColor(...NAVY); doc.text(nut, M + 5, y + 6.8);
      }
      bottom = y + nutH;
    }

    return { bottom, pages: pagesUsed };
  };

  /* measure down the ladder, then draw once at the first step that fits one page */
  let step = 0;
  let m = layout(0);
  while (m.pages > 1 && step < LADDER.length - 1) {
    step += 1;
    m = layout(step);
  }
  if (m.pages > 1) {
    console.info(`[one-pager] ${onePager.audience}: overflowed at the smallest step; rendered on ${m.pages} pages.`);
  } else if (step > 0) {
    console.info(`[one-pager] ${onePager.audience}: shrank ${step} step(s) to ${(LADDER[step] * 100).toFixed(1)}% type.`);
  }

  draw = true;
  layout(step);

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("Montserrat", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(`${opts.userName} · Generated by BrainWise${opts.dateTaken ? " · " + opts.dateTaken : ""} · Confidential`, M, PAGE_H - 8);
  }

  doc.save(`${opts.userName.replace(/\s+/g, "_")}_${onePager.audience}_one-page-snapshot.pdf`);
}
