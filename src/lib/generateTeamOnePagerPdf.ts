import jsPDF from "jspdf";
import {
  NAVY,
  NAVY_CIRCLE,
  ORANGE,
  SAND_CIRCLE,
  TEAL,
  GRAY,
  PURPLE,
  MUSTARD,
  BLACK,
  makeFacetStyler,
  measureCard,
  drawCardAt,
  chipLayout,
  drawChipRows,
  blockAccent,
  type PdfBlock,
  type CardMetrics,
} from "./generatePdfPrimitivesShared";

type RGB = readonly [number, number, number];
const PEACH: RGB = SAND_CIRCLE;

/* ---------- section shapes (generate-team-narrative v17) ---------- */

export interface TeamOnePagerLine {
  text: string;
  facets?: string[];
}
export interface TeamOnePagerCard {
  point: string;
  body: string;
  facets?: string[];
}
export interface TeamOnePagerPreview {
  section?: string;
  heading?: string;
  text?: string;
  facets?: string[];
}
/** one_pager_team — for the whole team, read together. Never gated. */
export interface TeamOnePagerSection {
  title?: string;
  opening?: string;
  shared?: {
    strong?: TeamOnePagerLine;
    talk?: TeamOnePagerLine;
    clash?: TeamOnePagerLine;
    decide?: TeamOnePagerLine;
  };
  split?: TeamOnePagerCard[];
  watch?: TeamOnePagerCard[];
  talk_about?: string[];
  report_preview?: TeamOnePagerPreview[];
  disclaimer?: string;
}
/** one_pager_leader — RLS-gated. Absence of the row is the permission check. */
export interface LeaderOnePagerSection {
  title?: string;
  opening?: string;
  lean_on?: TeamOnePagerCard[];
  will_bite?: TeamOnePagerCard[];
  fault_lines?: TeamOnePagerLine;
  first_moves?: TeamOnePagerCard[];
  watch_for?: string[];
  disclaimer?: string;
}

export const TEAM_SHARED_LABELS: [keyof NonNullable<TeamOnePagerSection["shared"]>, string][] = [
  ["strong", "What holds you together"],
  ["talk", "How this team talks"],
  ["clash", "What your clashes turn into"],
  ["decide", "How decisions actually land"],
];

/** Shrink ladder. Step 0 is the roomy setting; the generator's word budget is
 *  roughly 1.6x what live profiles carry today, so the ladder has to be real. */
const LADDER = [1, 0.965, 0.93, 0.895, 0.86, 0.825, 0.79];

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const toCards = (v: TeamOnePagerCard[] | undefined, max: number): PdfBlock[] =>
  (Array.isArray(v) ? v : [])
    .filter(Boolean)
    .slice(0, max)
    .map((c) => ({
      point: str(c.point) || undefined,
      text: str(c.body),
      facets: Array.isArray(c.facets) ? c.facets.filter(Boolean) : [],
    }))
    .filter((b) => !!(b.point || b.text));

export interface TeamOnePagerPdfOpts {
  teamName: string;
  dateGenerated?: string;
  /** Facet index for chip color and display labels. Injected per invocation;
   *  the generator holds no module-level state of its own. */
  facets?: { facetName?: string | null; domain?: string | null }[];
}

export type TeamOnePagerPdfArgs =
  | { scope: "team"; data: TeamOnePagerSection }
  | { scope: "leader"; data: LeaderOnePagerSection };

export async function generateTeamOnePagerPdf(
  args: TeamOnePagerPdfArgs,
  opts: TeamOnePagerPdfOpts,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { registerPdfFonts } = await import("./pdfFonts");
  await registerPdfFonts(doc);

  // team reports always cover the full instrument, so workplace wording is right
  const fs = makeFacetStyler(opts.facets ?? [], "work");

  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const M = 14;
  const CONTENT_W = PAGE_W - M * 2;
  const BAND_H = 50;
  /** Flow boundary for every normal block: content blocks break to a new page
   *  rather than cross this line. The single documented exception is the
   *  disclaimer, which may run down to DISCLAIMER_BOTTOM (below). */
  const BOTTOM = PAGE_H - 16;
  /** The disclaimer is fine print and is allowed into the bottom margin rather
   *  than strand itself on an otherwise empty page. It still clears the footer
   *  text baseline at PAGE_H - 8. */
  const DISCLAIMER_BOTTOM = PAGE_H - 12;
  const CONT_TOP = 22;
  const GUTTER = 10;
  const COL_W = (CONTENT_W - GUTTER) / 2;

  const logo = await (async () => {
    try {
      const res = await fetch("/logo-orange-white.png");
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  })();

  const eyebrow = args.scope === "team" ? "TEAM SNAPSHOT" : "LEADER SNAPSHOT";

  const header = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_W, BAND_H, "F");
    doc.setFillColor(...NAVY_CIRCLE);
    doc.circle(PAGE_W - 4, 10, 30, "F");
    doc.circle(PAGE_W - 30, 42, 7, "F");
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.8);
    doc.circle(PAGE_W - 60, 20, 11, "S");
    doc.setFillColor(...PEACH);
    doc.circle(PAGE_W - 44, 34, 2.6, "F");

    if (logo) {
      const logoH = 30;
      let logoW = 52;
      try {
        const p = doc.getImageProperties(logo);
        logoW = (p.width / p.height) * logoH;
      } catch { /* fallback width */ }
      doc.addImage(logo, "PNG", M, (BAND_H - logoH) / 2, logoW, logoH, undefined, "FAST");
    } else {
      doc.setFont("Poppins", "extrabold");
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text("BrainWise", M, BAND_H / 2 + 3);
    }
    doc.setFont("Montserrat", "semibold");
    doc.setFontSize(9.5);
    doc.setTextColor(...ORANGE);
    doc.setCharSpace(1.1);
    doc.text(eyebrow, PAGE_W - M, BAND_H / 2 + 1, { align: "right" });
    doc.setCharSpace(0);
  };

  const continuationHeader = (label: string) => {
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(label.toUpperCase(), M, CONT_TOP - 8);
  };

  const footer = () => {
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(
      `${opts.teamName} · ${args.scope === "leader" ? "Leader snapshot — restricted" : "Team snapshot"}` +
        ` · Generated by BrainWise${opts.dateGenerated ? " · " + opts.dateGenerated : ""} · Confidential`,
      M,
      PAGE_H - 8,
    );
  };

  /* ── page cursor: the dry run counts pages, the draw pass materialises them ── */
  let draw = false;
  let pagesUsed = 1;
  const goto = (p: number) => {
    pagesUsed = Math.max(pagesUsed, p);
    if (!draw) return;
    while (doc.getNumberOfPages() < p) {
      doc.addPage();
      const created = doc.getNumberOfPages();
      doc.setPage(created);
      if (created === 1) header();
      else continuationHeader(`${opts.teamName} · continued`);
      footer();
    }
    doc.setPage(p);
  };

  /**
   * The whole sheet at one ladder step. Measures when `draw` is false and paints
   * when true. Overflow adds a page rather than clamping a block upward: the
   * clamp is what silently painted over text in the PTP one-pager.
   */
  const layout = (k: number): number => {
    pagesUsed = 1;
    let page = 1;
    goto(1);
    let y = BAND_H + 12;

    const body = 10 * k;
    const lh = body * 0.4556;
    const metrics: CardMetrics = { bodySize: body - 1.2, lhBody: lh, lhPoint: lh + 0.4 };

    const ensure = (h: number) => {
      if (y + h > BOTTOM) {
        page += 1;
        goto(page);
        y = CONT_TOP;
      }
    };

    const heading = (t: string) => {
      ensure(lh * 3);
      y += 3.2 * k;
      if (draw) {
        doc.setFont("Poppins", "bold");
        doc.setFontSize(body + 1.6);
        doc.setTextColor(...NAVY);
        doc.text(t, M, y);
      }
      y += 2;
      if (draw) {
        doc.setDrawColor(...NAVY);
        doc.setLineWidth(0.3);
        doc.line(M, y, M + CONTENT_W, y);
      }
      y += 4 * k;
    };

    const titleBlock = (title: string) => {
      doc.setFont("Poppins", "bold");
      doc.setFontSize(body + 6);
      const lines = doc.splitTextToSize(title, CONTENT_W) as string[];
      ensure(lines.length * (lh + 2.4));
      if (draw) {
        doc.setTextColor(...NAVY);
        doc.text(lines, M, y);
      }
      y += lines.length * (lh + 2.4) + 1;
    };

    const openingBlock = (text: string) => {
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(body);
      const lines = doc.splitTextToSize(text, CONTENT_W - 5) as string[];
      const h = lines.length * lh;
      ensure(h + 2);
      if (draw) {
        doc.setFillColor(...TEAL);
        doc.rect(M, y - lh + 1.2, 1, h, "F");
        doc.setTextColor(...BLACK);
        doc.text(lines, M + 4, y);
      }
      y += h + 1;
    };

    /** measured, whole-card rows; a card is never split across a page */
    const cardGrid = (blocks: PdfBlock[], cols: number, accent: RGB) => {
      const w = cols === 1 ? CONTENT_W : COL_W;
      const measured = blocks.map((b) => measureCard(doc, b, w, blockAccent(b, accent, fs), fs, metrics));
      const gap = 3 * k;
      for (let i = 0; i < blocks.length; i += cols) {
        const rowH = Math.max(...measured.slice(i, i + cols).map((m) => m.h));
        ensure(rowH + gap);
        for (let j = i; j < Math.min(i + cols, blocks.length); j++) {
          const x = cols === 1 ? M : M + (j - i) * (COL_W + GUTTER);
          if (draw) drawCardAt(doc, measured[j], x, y, w);
        }
        y += rowH + gap;
      }

    };

    const numberedList = (items: string[], cols: number) => {
      const w = cols === 1 ? CONTENT_W - 8 : COL_W - 8;
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(body - 0.5);
      const lines = items.map((t) => doc.splitTextToSize(t, w) as string[]);
      for (let i = 0; i < items.length; i += cols) {
        const rowH = Math.max(...lines.slice(i, i + cols).map((l) => l.length)) * lh + 2.4;
        ensure(rowH);
        if (draw) {
          for (let j = i; j < Math.min(i + cols, items.length); j++) {
            const x = cols === 1 ? M : M + (j - i) * (COL_W + GUTTER);
            doc.setFillColor(...PURPLE);
            doc.circle(x + 2.4, y - 1.2, 2.4, "F");
            doc.setFont("Poppins", "bold");
            doc.setFontSize(body - 2.5);
            doc.setTextColor(255, 255, 255);
            doc.text(String(j + 1), x + 2.4, y - 0.2, { align: "center" });
            doc.setFont("Montserrat", "normal");
            doc.setFontSize(body - 0.5);
            doc.setTextColor(...BLACK);
            doc.text(lines[j], x + 7, y);
          }
        }
        y += rowH;
      }
    };

    const disclaimerBlock = (text: string) => {
      const dsize = 7.5 * Math.max(k, 0.9);
      const dlh = 3.1 * Math.max(k, 0.9);
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(dsize);
      const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
      const need = lines.length * dlh + 5;
      // the disclaimer may run into the bottom margin (see DISCLAIMER_BOTTOM)
      // rather than strand itself on an otherwise empty page
      if (y + need > DISCLAIMER_BOTTOM) ensure(need);
      y += 2;
      if (draw) {
        doc.setDrawColor(220, 224, 228);
        doc.setLineWidth(0.2);
        doc.line(M, y, M + CONTENT_W, y);
      }
      y += dlh;
      if (draw) {
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(dsize);
        doc.setTextColor(...GRAY);
        doc.text(lines, M, y);
      }
      y += lines.length * dlh;
    };


    if (args.scope === "team") {
      const d = args.data;
      titleBlock(str(d.title));
      if (str(d.opening)) openingBlock(str(d.opening));

      /* the four shared lines */
      const sharedRows = TEAM_SHARED_LABELS
        .map(([key, label]) => ({ label, line: d.shared?.[key] }))
        .filter((r) => str(r.line?.text));
      if (sharedRows.length > 0) {
        heading("What happens across this team");
        const labelW = 46;
        sharedRows.forEach((row, i) => {
          const textW = CONTENT_W - labelW - 4;
          doc.setFont("Montserrat", "normal");
          doc.setFontSize(body);
          const lines = doc.splitTextToSize(str(row.line?.text), textW) as string[];
          const chips = chipLayout(doc, row.line?.facets, textW, fs);
          const h = lines.length * lh + (chips.h > 0 ? chips.h + 1.6 : 0) + 1.4;
          ensure(h + 1.4);
          if (i > 0 && draw) {
            doc.setDrawColor(220, 224, 228);
            doc.setLineWidth(0.2);
            doc.line(M, y - lh + 1.4, M + CONTENT_W, y - lh + 1.4);
          }
          if (i > 0) y += 1.4;
          if (draw) {
            doc.setFont("Poppins", "bold");
            doc.setFontSize(body - 0.5);
            doc.setTextColor(...NAVY);
            doc.text(doc.splitTextToSize(row.label, labelW - 3), M, y);
            doc.setFont("Montserrat", "normal");
            doc.setFontSize(body);
            doc.setTextColor(...BLACK);
            doc.text(lines, M + labelW, y);
          }
          let rowBottom = y + lines.length * lh;
          if (chips.h > 0) {
            if (draw) drawChipRows(doc, chips.rows, M + labelW, rowBottom - lh + 1.6);
            rowBottom += chips.h - lh + 2.4;
          }
          y = rowBottom + 1.4;
        });
      }

      const split = toCards(d.split, 2);
      if (split.length > 0) {
        heading("Where you divide");
        cardGrid(split, 2, MUSTARD);
      }

      const watch = toCards(d.watch, 2);
      if (watch.length > 0) {
        heading("Keep an eye on");
        cardGrid(watch, 2, TEAL);
      }

      const talkAbout = (Array.isArray(d.talk_about) ? d.talk_about : []).map(str).filter(Boolean).slice(0, 4);
      if (talkAbout.length > 0) {
        heading("Talk about this together");
        numberedList(talkAbout, 2);
      }

      if (str(d.disclaimer)) disclaimerBlock(str(d.disclaimer));

      /* the report preview always starts its own page, like the paired snapshot */
      const preview = (Array.isArray(d.report_preview) ? d.report_preview : []).filter(Boolean);
      if (preview.length > 0) {
        page += 1;
        goto(page);
        y = CONT_TOP;
        heading("What is in your full report");
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(body - 1);
        const lead = doc.splitTextToSize(
          "This sheet is the short version. Your full team report goes deeper on each of these, with the patterns behind them mapped question by question.",
          CONTENT_W,
        ) as string[];
        ensure(lead.length * lh + 3);
        if (draw) {
          doc.setTextColor(...GRAY);
          doc.text(lead, M, y);
        }
        y += lead.length * lh + 3;
        const blocks: PdfBlock[] = preview.map((p) => ({
          point: str(p.heading) || str(p.section) || undefined,
          text: str(p.text),
          facets: Array.isArray(p.facets) ? p.facets.filter(Boolean) : [],
        }));
        cardGrid(blocks, 2, TEAL);
      }
    } else {
      const d = args.data;
      titleBlock(str(d.title));
      if (str(d.opening)) openingBlock(str(d.opening));

      const leanOn = toCards(d.lean_on, 2);
      if (leanOn.length > 0) {
        heading("Lean on this");
        cardGrid(leanOn, 2, TEAL);
      }

      const willBite = toCards(d.will_bite, 2);
      if (willBite.length > 0) {
        heading("What will bite you");
        cardGrid(willBite, 2, MUSTARD);
      }

      if (str(d.fault_lines?.text)) {
        heading("The fault line");
        cardGrid(
          [{ text: str(d.fault_lines?.text), facets: d.fault_lines?.facets ?? [] }],
          1,
          PURPLE,
        );
      }

      const firstMoves = toCards(d.first_moves, 3);
      if (firstMoves.length > 0) {
        heading("Your first moves");
        cardGrid(firstMoves, 2, NAVY);
      }

      const watchFor = (Array.isArray(d.watch_for) ? d.watch_for : []).map(str).filter(Boolean).slice(0, 3);
      if (watchFor.length > 0) {
        heading("Watch for these in the room");
        numberedList(watchFor, 1);
      }

      if (str(d.disclaimer)) disclaimerBlock(str(d.disclaimer));
    }

    return pagesUsed;
  };

  /* measure down the ladder, then draw once at the first step that fits */
  const sheetPages = args.scope === "team" && (args.data.report_preview?.length ?? 0) > 0 ? 2 : 1;
  let step = 0;
  let pages = layout(LADDER[0]);
  while (pages > sheetPages && step < LADDER.length - 1) {
    step += 1;
    pages = layout(LADDER[step]);
  }
  if (pages > sheetPages) {
    console.info(
      `[team one-pager] ${args.scope}: still ${pages} pages at the smallest step; rendered with real pagination.`,
    );
  } else if (step > 0) {
    console.info(
      `[team one-pager] ${args.scope}: shrank ${step} step(s) to ${(LADDER[step] * 100).toFixed(1)}% type.`,
    );
  }

  draw = true;
  header();
  footer();
  layout(LADDER[step]);

  const base = opts.teamName.replace(/\s+/g, "_");
  doc.save(`${base}_${args.scope === "team" ? "team" : "leader"}-snapshot.pdf`);
}
