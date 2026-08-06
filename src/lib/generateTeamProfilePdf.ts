import jsPDF from "jspdf";
import {
  PAGE_W,
  PAGE_H,
  MARGIN_L,
  MARGIN_B,
  MARGIN_T,
  CONTENT_W,
  NAVY,
  MUTED,
  BLACK,
  ORANGE,
  TEAL,
  GREEN,
  MUSTARD,
  GRAY,
  PURPLE,
  createPdfContext,
  renderCoverPage,
  stampPageNumbers,
  cleanMarkdown,
  splitParas,
  drawTeamDistRow,
  drawTeamDistScale,
  drawDistStripAt,
  DIST_STRIP_H,
  asBlocks,
  blockAccent,
  chipLayout,
  drawChipRows,
  makeFacetStyler,
  measureCard,
  drawCardAt,
  CARD_GAP,
  CARD_PAD,
  CARD_RULE_W,
  type CardMetrics,
  type FacetStyler,
  type PdfBlock,
  type PdfContext,
} from "./generatePdfPrimitivesShared";
import {
  facetDisplayLabel,
  bulletToText,
  type Bullet,
} from "./pairedSectionTypes";
import type { TeamPdfData, TeamFacetForPdf } from "./assembleTeamPdfData";

export interface TeamPdfSections {
  teamInThree: boolean;
  domains: boolean;
  shapeLegend: boolean;
  driving: boolean;
  drivingFacetCharts: boolean;
  communication: boolean;
  conflict: boolean;
  leadership: boolean;
  leaderBrief: boolean;
  fullMap: boolean;
  fullMapCharts: boolean;
  coach: boolean;
}

const TEAM_SHAPES = ["allHigh", "allLow", "two", "even", "together"] as const;
type TeamShapeKey = (typeof TEAM_SHAPES)[number];

const TEAM_SHAPE_TITLE: Record<TeamShapeKey, string> = {
  allHigh: "Nobody down there",
  allLow: "Nobody up here",
  two: "Two groups",
  even: "Even spread",
  together: "Together",
};

const TEAM_SHAPE_DESC: Record<TeamShapeKey, string> = {
  allHigh: "everyone is high here",
  allLow: "no one is high, unwatched",
  two: "the team is split",
  even: "a full spectrum",
  together: "real common ground",
};

/* Exact-match on the shape vocabulary the database actually stores, mirroring
   shapeKey() in src/pages/TeamReport.tsx. The previous substring chain never
   matched "Everyone high"/"Everyone low", so those facets silently fell through
   to `together` and the allHigh/allLow buckets were unreachable. */
function shapeKey(shape: string | null | undefined): TeamShapeKey {
  switch ((shape ?? "").trim()) {
    case "Everyone high":
      return "allHigh";
    case "Everyone low":
      return "allLow";
    case "Two groups":
      return "two";
    case "Together (mid)":
      return "together";
    case "Even spread":
    case "Mild":
      return "even";
    default:
      return "even"; // defined fallback for an unrecognized shape
  }
}


/* ---------- v14 bullet normalization ----------
   Sections may hold plain strings (pre-v14 profiles) or { point, body, facets }
   objects (v14+, generator currently at v17). Everything funnels through
   asLines / asBlocks so no object ever reaches cleanMarkdown. asBlocks, the
   chip layer and the card layer live in generatePdfPrimitivesShared.ts and are
   shared with the paired PDF. */

/** One rule for every top-level section: it needs this much room below its
 *  heading or it starts the next page, so major sections never begin as a
 *  three-line sliver at the foot of a page. */
const SECTION_RESERVE = 62;

/** Team body metrics; the paired PDF passes its own to the same primitives. */
const CARD_METRICS: CardMetrics = { bodySize: 9, lhBody: 4.5, lhPoint: 4.6 };
const BODY_SIZE = CARD_METRICS.bodySize;
const LH_BODY = CARD_METRICS.lhBody;

function asLines(v: string | Bullet[] | undefined): string[] {
  if (!v) return [];
  if (!Array.isArray(v)) return [v];
  return v.map((b) => bulletToText(b)).filter(Boolean);
}

function hasCards(blocks: PdfBlock[]): boolean {
  return blocks.some((b) => !!b.point || (b.facets ?? []).length > 0);
}

function bulletCards(
  ctx: PdfContext,
  blocks: PdfBlock[],
  fs: FacetStyler,
  opts: { indent?: number; width?: number; accent?: readonly [number, number, number] } = {},
): void {
  const indent = opts.indent ?? 0;
  const w = opts.width ?? CONTENT_W - indent;
  const PAGE_AVAIL = PAGE_H - MARGIN_T - MARGIN_B;
  for (const b of blocks) {
    const m = measureCard(ctx.doc, b, w, blockAccent(b, opts.accent ?? TEAL, fs), fs, CARD_METRICS);
    if (m.h > PAGE_AVAIL) {
      drawCardAt(ctx.doc, m, MARGIN_L + indent, ctx.y, w, false);
      ctx.y += m.h + CARD_GAP;
      continue;
    }
    ctx.reserveBlockOrAllow(m.h + CARD_GAP);
    drawCardAt(ctx.doc, m, MARGIN_L + indent, ctx.y, w);
    ctx.y += m.h + CARD_GAP;
  }
}

/** Standalone chip row (team_in_three / leadership items). */
function chipsUnder(ctx: PdfContext, facets: string[] | undefined, fs: FacetStyler, indent = 0): void {
  const layout = chipLayout(ctx.doc, facets, CONTENT_W - indent, fs);
  if (layout.rows.length === 0) return;
  ctx.checkPageBreak(layout.h + 2);
  drawChipRows(ctx.doc, layout.rows, MARGIN_L + indent, ctx.y);
  ctx.y += layout.h + 2;
}

/** Height of the first card in a run, so a subheading never lands alone. */
function firstCardH(
  ctx: PdfContext,
  blocks: PdfBlock[],
  fs: FacetStyler,
  accent: readonly [number, number, number],
  width = CONTENT_W,
): number {
  const b = blocks[0];
  if (!b) return 0;
  const PAGE_AVAIL = PAGE_H - MARGIN_T - MARGIN_B;
  const m = measureCard(ctx.doc, b, width, blockAccent(b, accent, fs), fs, CARD_METRICS);
  return Math.min(m.h + CARD_GAP, PAGE_AVAIL - 12);
}

/**
 * Draw a subheading. The page-break check runs FIRST, because checkPageBreak
 * may emit a footer and a continuation header, both of which reset font, size
 * and color — setting the font before the break left headings rendered in
 * footer styling. `firstBlockH` reserves room for the content that follows so
 * a heading is never stranded at the foot of a page.
 */
function subheading(ctx: PdfContext, label: string, firstBlockH = 14): void {
  const { doc } = ctx;
  ctx.checkPageBreak(6 + Math.max(0, firstBlockH));
  doc.setFont("Poppins", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(label, MARGIN_L, ctx.y);
  ctx.y += 5;
}


function paragraphs(ctx: PdfContext, text: string): void {
  const paras = splitParas(text);
  for (let i = 0; i < paras.length; i++) {
    ctx.bodyText(paras[i]);
    if (i < paras.length - 1) ctx.y += 2;
  }
}

interface ColLine {
  text: string;
  x: number;
}

function twoColumn(
  ctx: PdfContext,
  leftTitle: string,
  leftBody: string[],
  rightTitle: string,
  rightBody: string[],
  opts: { bulleted?: boolean } = {},
): void {
  const { doc } = ctx;
  const bulleted = opts.bulleted ?? false;
  const colGap = 6;
  const colW = (CONTENT_W - colGap) / 2;
  const lineH = 4.5;
  const leftX = MARGIN_L;
  const rightX = MARGIN_L + colW + colGap;

  doc.setFont("Montserrat", "normal");
  doc.setFontSize(9);
  const bulletW = doc.getTextWidth("• ");

  const wrapCol = (body: string[], x: number): ColLine[] => {
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(9);
    const out: ColLine[] = [];
    body.forEach((raw, idx) => {
      const clean = cleanMarkdown(raw);
      if (!clean) return;
      if (bulleted) {
        const wrapped: string[] = doc.splitTextToSize(clean, colW - 5 - bulletW);
        wrapped.forEach((ln, i) => {
          out.push({ text: i === 0 ? "• " + ln : ln, x: i === 0 ? x : x + bulletW });
        });
      } else {
        const wrapped: string[] = doc.splitTextToSize(clean, colW - 5);
        wrapped.forEach((ln) => out.push({ text: ln, x }));
        if (idx < body.length - 1) out.push({ text: "", x });
      }
    });
    return out;
  };

  const drawTitles = (y: number): number => {
    doc.setFont("Poppins", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(leftTitle, leftX, y);
    doc.text(rightTitle, rightX, y);
    return y + 5;
  };

  const leftLines = wrapCol(leftBody, leftX);
  const rightLines = wrapCol(rightBody, rightX);

  ctx.ensureBlockSpace(5 + lineH * 3);
  let y = drawTitles(ctx.y);
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);

  const n = Math.max(leftLines.length, rightLines.length);
  for (let i = 0; i < n; i++) {
    if (y + lineH > PAGE_H - MARGIN_B) {
      ctx.y = y;
      ctx.addFooter();
      doc.addPage();
      ctx.renderContinuationHeader();
      y = drawTitles(MARGIN_T);
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BLACK);
    }
    const L = leftLines[i];
    const R = rightLines[i];
    if (L && L.text) doc.text(L.text, L.x, y);
    if (R && R.text) doc.text(R.text, R.x, y);
    y += lineH;
  }
  ctx.y = y + 3;
}

function drivingCard(
  ctx: PdfContext,
  args: {
    kind: "strength" | "focus";
    name: string;
    why: string;
    actions: string[];
    /** the facet's member scores; the evidence sits inside the card, between
     *  the rationale and the actions, rather than in a cross-referenced section */
    scores?: number[];
  },
): void {
  const { doc } = ctx;
  const accent = args.kind === "strength" ? GREEN : MUSTARD;
  const kindLabel = args.kind === "strength" ? "STRENGTH" : "FOCUS";
  doc.setFont("Poppins", "bold");
  doc.setFontSize(11);
  const nameLines = doc.splitTextToSize(cleanMarkdown(args.name), CONTENT_W - 8);
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(9);
  const whyLines = doc.splitTextToSize(cleanMarkdown(args.why), CONTENT_W - 8);
  const bulletW = doc.getTextWidth("• ");
  // wrapped action lines hang to the text, not back to the bullet
  const actLines: Array<{ text: string; indent: number }> = args.actions.flatMap((a) => {
    const wrapped: string[] = doc.splitTextToSize(cleanMarkdown(a), CONTENT_W - 12 - bulletW);
    return wrapped.map((ln, i) => ({
      text: i === 0 ? "• " + ln : ln,
      indent: i === 0 ? 0 : bulletW,
    }));
  });
  const scores = (args.scores ?? []).filter((n) => typeof n === "number");
  const stripH = scores.length > 0 ? DIST_STRIP_H + 2 : 0;
  const contentH =
    6 + nameLines.length * 4.5 + whyLines.length * 4.5 + stripH + actLines.length * 4.5 + 6;
  ctx.ensureBlockSpace(contentH + 3);
  const boxTop = ctx.y;
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN_L, boxTop, CONTENT_W, contentH, 2, 2, "FD");
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(MARGIN_L, boxTop, 1.5, contentH, "F");
  let y = boxTop + 5;
  doc.setFont("Montserrat", "semibold");
  doc.setFontSize(7.5);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.setCharSpace(1);
  doc.text(kindLabel, MARGIN_L + 4, y);
  doc.setCharSpace(0);
  y += 4;
  doc.setFont("Poppins", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  for (const l of nameLines) { doc.text(l, MARGIN_L + 4, y); y += 4.5; }
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  for (const l of whyLines) { doc.text(l, MARGIN_L + 4, y); y += 4.5; }
  if (scores.length > 0) {
    drawDistStripAt(doc, { x: MARGIN_L + 4, y: y - 3, width: CONTENT_W - 8, scores });
    y += stripH;
  }
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  for (const l of actLines) { doc.text(l.text, MARGIN_L + 4 + l.indent, y); y += 4.5; }
  ctx.y = boxTop + contentH + 3;
}

function drawDomainsRadial(ctx: PdfContext, data: TeamPdfData): void {
  const order = ["Protection", "Participation", "Prediction"].filter((d) => data.domains[d] != null);
  if (order.length === 0) return;
  const { doc } = ctx;
  const cx = PAGE_W / 2;
  const R = 30;
  ctx.checkPageBreak(90);
  const cy = ctx.y + 42;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  [0.25, 0.5, 0.75, 1].forEach((f) => doc.circle(cx, cy, R * f, "S"));

  const N = order.length;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / N;
  const point = (i: number, v: number): [number, number] => {
    const r = R * (v / 100);
    const a = angle(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };

  doc.setFont("Montserrat", "semibold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  order.forEach((name, i) => {
    const a = angle(i);
    const [ex, ey] = [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    doc.setDrawColor(220, 220, 220);
    doc.line(cx, cy, ex, ey);
    const lx = cx + Math.cos(a) * (R + 7);
    const ly = cy + Math.sin(a) * (R + 7) + 1.5;
    doc.text(name, lx, ly, { align: "center" });
  });

  const drawPoly = (
    getVal: (i: number) => number,
    color: readonly [number, number, number],
    dashed = false,
  ) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(dashed ? 0.6 : 1);
    if (dashed) doc.setLineDashPattern([1.5, 1.5], 0);
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) pts.push(point(i, getVal(i)));
    for (let i = 0; i < N; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % N];
      doc.line(x1, y1, x2, y2);
    }
    if (dashed) doc.setLineDashPattern([], 0);
    if (!dashed) {
      doc.setFillColor(color[0], color[1], color[2]);
      for (const [x, y] of pts) doc.circle(x, y, 1.2, "F");
    }
  };
  drawPoly((i) => data.domains[order[i]].mean, NAVY, false);
  drawPoly((i) => data.domains[order[i]].high, ORANGE, true);
  drawPoly((i) => data.domains[order[i]].low, MUSTARD, true);

  ctx.y = cy + R + 14;

  // Legend
  const legendItems: Array<{ label: string; color: readonly [number, number, number]; dashed: boolean }> = [
    { label: "Team mean", color: NAVY, dashed: false },
    { label: "Team high", color: ORANGE, dashed: true },
    { label: "Team low", color: MUSTARD, dashed: true },
  ];
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  let lx = MARGIN_L;
  for (const item of legendItems) {
    doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
    if (item.dashed) doc.setLineDashPattern([1.5, 1.5], 0);
    doc.setLineWidth(1);
    doc.line(lx, ctx.y - 1, lx + 8, ctx.y - 1);
    if (item.dashed) doc.setLineDashPattern([], 0);
    doc.text(item.label, lx + 10, ctx.y + 1);
    lx += 45;
  }
  ctx.y += 6;

  // Agreement bars
  ctx.y += 2;
  for (const name of order) {
    ctx.checkPageBreak(10);
    const y = ctx.y;
    doc.setFont("Montserrat", "semibold");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(name, MARGIN_L, y + 3);
    const barX = MARGIN_L + 40;
    const barW = CONTENT_W - 40;
    const barH = 4;
    doc.setFillColor(240, 238, 232);
    doc.roundedRect(barX, y, barW, barH, 1, 1, "F");
    const d = data.domains[name];
    const lx2 = barX + (d.low / 100) * barW;
    const hx = barX + (d.high / 100) * barW;
    const mx = barX + (d.mean / 100) * barW;
    doc.setDrawColor(...MUSTARD);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(lx2, y + barH / 2, hx, y + barH / 2);
    doc.setLineDashPattern([], 0);
    doc.setFillColor(...NAVY);
    doc.circle(mx, y + barH / 2, 1.5, "F");
    ctx.y += 8;
  }
}

export async function generateTeamProfilePdf(
  data: TeamPdfData,
  sections: TeamPdfSections,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { registerPdfFonts } = await import("./pdfFonts");
  registerPdfFonts(doc);

  const todayLong = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  await renderCoverPage(doc, {
    eyebrow: "TEAM THREAT PROFILE",
    titleLine1: data.teamName,
    titleLine2: "Team Report",
    trademark: false,
    subtitle:
      "The patterns that shape how this team works under pressure, built from every member's Personal Threat Profile and mapped to the BrainWise 5P model.",
    // the team size is stated once, by the pill; the title already names the team
    contextPillLabel: `${data.memberCount} MEMBERS`,
    field1: { label: "DATE COMPLETED", value: todayLong },
    disclaimer:
      "This report aggregates the self-report profiles of team members to describe group tendencies under pressure. It is not a clinical assessment, a diagnosis, or an evaluation of any individual. Individual responses are not identified. It is intended to support team discussion, not to rank or appraise people.",
    copyright:
      "© {year} BrainWise Enterprises. Confidential and proprietary. Shared with the named recipients for their own reflection only; not to be reproduced or disclosed without written consent. The Personal Threat Profile and 5P model are the property of BrainWise Enterprises.",
  });

  doc.addPage();
  const ctx = createPdfContext(doc);
  const s = data.sections;

  /* Chip color comes only from the facet's PTP dimension, keyed on the
     normalized facet name (chips carry names, everything else carries items). */
  // The team report always covers the full instrument, so workplace wording is right.
  const fs = makeFacetStyler([...data.fullMap, ...data.strengths, ...data.focusAreas], "work");

  /* item number -> facet name. Built unconditionally: both the leader brief's
     Driver column and the practitioner cards key on it. */
  const facetByItem = new Map<number, string>();
  for (const f of [...data.fullMap, ...data.strengths, ...data.focusAreas]) {
    if (!facetByItem.has(f.itemNumber)) facetByItem.set(f.itemNumber, f.facetName);
  }

  // 1. team in three
  if (sections.teamInThree && Array.isArray(s.team_in_three) && s.team_in_three.length > 0) {
    ctx.sectionHeading("Your team in three", SECTION_RESERVE, "The shape");
    s.team_in_three.slice(0, 3).forEach((it, i) => {
      // font state first, then measure, then reserve: the headline and the first
      // two lines of its detail move together, so a headline is never stranded.
      doc.setFont("Poppins", "bold");
      doc.setFontSize(11);
      const hl = doc.splitTextToSize(cleanMarkdown(it.headline), CONTENT_W - 6) as string[];
      ctx.ensureBlockSpace(hl.length * 5 + 10);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...ORANGE);
      doc.text(`${i + 1}.`, MARGIN_L, ctx.y);
      doc.setTextColor(...NAVY);
      doc.text(hl, MARGIN_L + 6, ctx.y);
      ctx.y += hl.length * 5;
      ctx.bodyText(it.detail, 6);
      if (it.action) {
        doc.setFont("Montserrat", "semibold");
        doc.setFontSize(9);
        doc.setTextColor(...TEAL);
        const al = doc.splitTextToSize(cleanMarkdown(it.action), CONTENT_W - 6);
        for (const l of al) {
          ctx.checkPageBreak(5);
          doc.text(l, MARGIN_L + 6, ctx.y);
          ctx.y += 4.5;
        }
      }
      chipsUnder(ctx, it.facets, fs, 6);
      ctx.y += 4;
    });
  }

  // 2. domains
  if (sections.domains && Object.keys(data.domains).length > 0) {
    ctx.sectionHeading("Three domains, at a glance", SECTION_RESERVE, "The scores");
    drawDomainsRadial(ctx, data);
  }

  // 3. shape legend
  if (sections.shapeLegend) {
    ctx.sectionHeading("How to read the shapes", SECTION_RESERVE, "How to read this");
    for (const k of TEAM_SHAPES) {
      subheading(ctx, TEAM_SHAPE_TITLE[k], 10);
      ctx.bodyText(TEAM_SHAPE_DESC[k]);
      ctx.y += 2;
    }
  }

  // 4. driving (each driver's distribution is drawn inside its own card)
  if (sections.driving && s.driving_facets) {
    ctx.sectionHeading("Driving facets", SECTION_RESERVE, "What drives it");
    if (s.driving_facets.opening) paragraphs(ctx, s.driving_facets.opening);
    ctx.y += 2;
    const drivingSet: TeamFacetForPdf[] = [...data.strengths, ...data.focusAreas];
    const withScores =
      sections.drivingFacetCharts &&
      drivingSet.some((f) => (data.scoresByItem.get(f.itemNumber) ?? []).length > 0);
    if (withScores) {
      drawTeamDistScale(ctx, { n: data.memberCount, x: MARGIN_L + 4, width: CONTENT_W - 8 });
      ctx.y += 2;
    }
    const scoresFor = (f: TeamFacetForPdf) =>
      withScores ? data.scoresByItem.get(f.itemNumber) ?? [] : [];
    // pair the narrative to the facet by item number, never by array index:
    // any reordering would otherwise attach the wrong rationale to a facet.
    // A facet with no matching rationale is still drawn (and warned about), so
    // it can never vanish from the PDF while the screen still shows it.
    const strengthSrc = new Map(
      (s.driving_facets.strengths ?? []).map((d) => [d.item, d]),
    );
    data.strengths.forEach((f) => {
      const src = strengthSrc.get(f.itemNumber);
      if (!src) console.warn(`[team pdf] no driving_facets.strengths entry for item ${f.itemNumber}`);
      const acts = src?.actions ?? (src?.action ? [src.action] : []);
      drivingCard(ctx, {
        kind: "strength",
        name: facetDisplayLabel(f.facetName, "work"),
        why: src?.why ?? "",
        actions: acts.slice(0, 3),
        scores: scoresFor(f),
      });
    });
    const focusSrc = new Map((s.driving_facets.focus ?? []).map((d) => [d.item, d]));
    data.focusAreas.forEach((f) => {
      const src = focusSrc.get(f.itemNumber);
      if (!src) console.warn(`[team pdf] no driving_facets.focus entry for item ${f.itemNumber}`);
      const acts = src?.actions ?? (src?.action ? [src.action] : []);
      drivingCard(ctx, {
        kind: "focus",
        name: facetDisplayLabel(f.facetName, "work"),
        why: src?.why ?? "",
        actions: acts.slice(0, 3),
        scores: scoresFor(f),
      });
    });
  }


  // 6. communication
  if (sections.communication && s.communication) {
    ctx.sectionHeading("Communication", SECTION_RESERVE, "The mechanics");
    const genBlocks = asBlocks(s.communication.general);
    subheading(ctx, "In general", firstCardH(ctx, genBlocks, fs, TEAL));
    if (hasCards(genBlocks)) bulletCards(ctx, genBlocks, fs, { accent: TEAL });
    else for (const line of asLines(s.communication.general)) paragraphs(ctx, line);
    ctx.y += 3;
    const upBlocks = asBlocks(s.communication.under_pressure);
    subheading(ctx, "Under pressure", firstCardH(ctx, upBlocks, fs, TEAL));
    if (hasCards(upBlocks)) bulletCards(ctx, upBlocks, fs, { accent: TEAL });
    else for (const line of asLines(s.communication.under_pressure)) paragraphs(ctx, line);
    ctx.y += 3;
    if (Array.isArray(s.communication.avoid_conflict) && s.communication.avoid_conflict.length > 0) {
      subheading(
        ctx,
        "Avoiding conflict",
        firstCardH(ctx, asBlocks([s.communication.avoid_conflict[0]]), fs, TEAL, CONTENT_W - 3),
      );
      // number from the count of entries actually rendered, so a dropped block
      // does not leave a gap in the sequence (1, 3, 4)
      let n = 0;
      s.communication.avoid_conflict.forEach((t) => {
        const blocks = asBlocks([t]);
        const b = blocks[0];
        if (!b) return;
        const i = n++;
        if (b.point || (b.facets ?? []).length > 0) {
          // the ordinal rides the point when there is one, otherwise the text,
          // so a bullet with facets but no point keeps its number
          bulletCards(ctx, [b.point
            ? { ...b, point: `${i + 1}. ${b.point}` }
            : { ...b, text: `${i + 1}. ${b.text}` }], fs, {
            indent: 3,
            width: CONTENT_W - 3,
            accent: TEAL,
          });
          return;
        }
        // measure in the font it is drawn in, not whatever was left live
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(9);
        const ordW = doc.getTextWidth(`${i + 1}. `);
        const lines: string[] = doc.splitTextToSize(
          `${i + 1}. ${cleanMarkdown(b.text)}`,
          CONTENT_W - 6 - ordW,
        );

        lines.forEach((l, li) => {
          ctx.checkPageBreak(5);
          doc.setFont("Montserrat", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          doc.text(l, MARGIN_L + 3 + (li === 0 ? 0 : ordW), ctx.y);
          ctx.y += 4.5;
        });
      });
    }
  }

  // 7. conflict
  if (sections.conflict && s.conflict) {
    ctx.sectionHeading("Conflict", SECTION_RESERVE, "The pattern");
    if (s.conflict.summary) paragraphs(ctx, s.conflict.summary);
    ctx.y += 2;
    const mit = asBlocks(s.conflict.mitigate);
    const pro = asBlocks(s.conflict.promote_healthy);
    if (hasCards(mit) || hasCards(pro)) {
      // cards are too tall for the two-column grid; stack them full width
      subheading(ctx, "Mitigate", firstCardH(ctx, mit, fs, TEAL));
      bulletCards(ctx, mit, fs, { accent: TEAL });
      ctx.y += 2;
      subheading(ctx, "Promote healthy", firstCardH(ctx, pro, fs, MUSTARD));
      bulletCards(ctx, pro, fs, { accent: MUSTARD });

    } else {
      twoColumn(
        ctx,
        "Mitigate",
        asLines(s.conflict.mitigate),
        "Promote healthy",
        asLines(s.conflict.promote_healthy),
        { bulleted: true },
      );
    }
  }

  // 7b. leadership snapshot (three headlines + moves), carded like every other
  //     narrative section: the action is the card's last line and the chips sit
  //     at the card's foot, so they can never read as the next item's chips.
  if (sections.leadership && Array.isArray(s.leadership) && s.leadership.length > 0) {
    const leadershipBlocks: PdfBlock[] = s.leadership.slice(0, 3).map((it, i) => {
      const detail = cleanMarkdown(it.detail ?? "").trim();
      const action = cleanMarkdown(it.action ?? "").trim();
      return {
        point: `${i + 1}. ${cleanMarkdown(it.headline ?? "").trim()}`,
        text: [detail, action].filter(Boolean).join("\n"),
        facets: it.facets ?? [],
      };
    });
    ctx.sectionHeading("For the leader", SECTION_RESERVE, "For the leader");
    bulletCards(ctx, leadershipBlocks, fs, { accent: NAVY });
  }


  // 8. leader brief (privileged)
  if (sections.leaderBrief && s.leader_brief) {
    ctx.sectionHeading("For the leader: the moves", SECTION_RESERVE, "The moves");
    const rows = s.leader_brief.rows ?? [];
    const cols = [
      { key: "driver", label: "Driver", w: 40 },
      { key: "risk", label: "Risk to the work", w: 55 },
      { key: "move", label: "The move", w: 55 },
      { key: "owner", label: "Owner", w: 30 },
    ];
    const totalW = cols.reduce((a, c) => a + c.w, 0);
    const scale = CONTENT_W / totalW;
    cols.forEach((c) => (c.w = c.w * scale));

    // header
    ctx.checkPageBreak(8);
    doc.setFont("Montserrat", "semibold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    let hx = MARGIN_L;
    for (const c of cols) {
      doc.text(c.label.toUpperCase(), hx, ctx.y);
      hx += c.w;
    }
    ctx.y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN_L, ctx.y, MARGIN_L + CONTENT_W, ctx.y);
    ctx.y += 3;

    // the Driver column names the facet, exactly as the screen does; the raw
    // instrument question also appears in the practitioner section, but there it
    // is supporting detail under the facet name, not the heading
    for (const r of rows) {
      const facetName = facetByItem.get(r.item);
      const driver = facetName ? facetDisplayLabel(facetName, "work") : `Item ${r.item}`;
      const cells = [driver, r.risk_to_work, r.the_move, r.potential_owner];
      // measure in the body font the cells are drawn in, not the semibold
      // header font left live above
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(8);
      const splits = cells.map((t, i) => doc.splitTextToSize(cleanMarkdown(t ?? ""), cols[i].w - 3));
      // jsPDF advances a multi-line array by its own line factor; measure the
      // drawn height instead of assuming 4.2mm per line, which left dead gaps
      const rowH = Math.max(...splits.map((sp) => doc.getTextDimensions(sp).h)) + 2;
      ctx.checkPageBreak(rowH + 2);
      let cx = MARGIN_L;
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...BLACK);
      for (let i = 0; i < cols.length; i++) {
        doc.text(splits[i], cx, ctx.y + 3);
        cx += cols[i].w;
      }
      ctx.y += rowH;
      doc.setDrawColor(230, 230, 230);
      doc.line(MARGIN_L, ctx.y, MARGIN_L + CONTENT_W, ctx.y);
      ctx.y += 2;
    }
    if (s.leader_brief.lean_on) {
      ctx.y += 3;
      ctx.checkPageBreak(12);
      // set the font BEFORE measuring: splitTextToSize uses the live font
      // state, and the 8pt table font was wrapping this 9pt text 9/8 too wide
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(9);
      const leanRaw = cleanMarkdown(s.leader_brief.lean_on).replace(/^\s*lean on:\s*/i, "");
      const dl = doc.splitTextToSize("Lean on: " + leanRaw, CONTENT_W - 6);
      const h = dl.length * 4.5 + 6;
      doc.setFillColor(245, 250, 245);
      doc.setDrawColor(200, 220, 200);
      doc.roundedRect(MARGIN_L, ctx.y, CONTENT_W, h, 2, 2, "FD");
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BLACK);

      let ty = ctx.y + 4;
      for (const l of dl) {
        doc.text(l, MARGIN_L + 3, ty);
        ty += 4.5;
      }
      ctx.y += h + 2;
    }
  }

  // 9. full map (+ chart mode)
  if (sections.fullMap || sections.fullMapCharts) {
    ctx.sectionHeading("The full map", SECTION_RESERVE, "Every facet");
    const buckets: Record<TeamShapeKey, TeamFacetForPdf[]> = {
      allHigh: [], allLow: [], two: [], even: [], together: [],
    };
    for (const f of data.fullMap) buckets[shapeKey(f.shape)].push(f);

    if (
      sections.fullMapCharts &&
      data.fullMap.some((f) => (data.scoresByItem.get(f.itemNumber) ?? []).length > 0)
    ) {
      drawTeamDistScale(ctx, { n: data.memberCount });
      ctx.y += 2;
    }

    for (const k of TEAM_SHAPES) {
      const items = buckets[k];
      if (items.length === 0) continue;
      subheading(ctx, TEAM_SHAPE_TITLE[k], sections.fullMapCharts ? 14 : 5);
      if (sections.fullMapCharts) {
        for (const f of items) {
          drawTeamDistRow(ctx, {
            label: facetDisplayLabel(f.facetName, "work"),
            scores: data.scoresByItem.get(f.itemNumber) ?? [],
          });
        }
      } else {
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...BLACK);
        for (const f of items) {
          ctx.checkPageBreak(5);
          doc.text("• " + cleanMarkdown(facetDisplayLabel(f.facetName, "work")), MARGIN_L + 3, ctx.y);
          ctx.y += 4.5;
        }
      }
      ctx.y += 3;
    }
  }

  // 10. coach (privileged) — practitioner-only, always starts on a fresh page
  if (sections.coach && s.coach) {
    ctx.addFooter();
    doc.addPage();
    ctx.y = MARGIN_T;
    ctx.sectionHeading("For the practitioner, org admin & super admin", 22, "Behind the scenes");
    if (Array.isArray(s.coach.why) && s.coach.why.length > 0) {
      const LBL_H = 3.2;
      const innerX = MARGIN_L + CARD_RULE_W + CARD_PAD;
      const innerW = CONTENT_W - CARD_RULE_W - CARD_PAD * 2;

      /** Measure one practitioner card. Font state is set immediately before
       *  every split, because jsPDF measures in whatever font is live. */
      const layoutCard = (w: { item: number; rationale: string }) => {
        const question = cleanMarkdown(data.itemText.get(w.item) ?? `Item ${w.item}`);
        const facet = facetByItem.get(w.item) ?? `Item ${w.item}`;
        const anchors = data.anchorsByItem.get(w.item);
        const low = anchors?.low?.trim();
        const high = anchors?.high?.trim();
        const scale = low && high ? `0 = "${low}" · 100 = "${high}"` : "";

        const paras = splitParas(cleanMarkdown(w.rationale));
        const read = paras.length > 1 ? paras[0] : "";
        const why = paras.length > 1 ? paras.slice(1).join(" ") : (paras[0] ?? "");

        doc.setFont("Poppins", "bold");
        doc.setFontSize(10);
        const titleL: string[] = doc.splitTextToSize(fs.label(cleanMarkdown(facet)), innerW);
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(8);
        const qL: string[] = doc.splitTextToSize(question, innerW);
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(8);
        const scaleL: string[] = scale ? doc.splitTextToSize(scale, innerW) : [];
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(BODY_SIZE);
        const readL: string[] = read ? doc.splitTextToSize(read, innerW) : [];
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(BODY_SIZE);
        const whyL: string[] = why ? doc.splitTextToSize(why, innerW) : [];
        const chips = chipLayout(doc, [facet], innerW, fs);

        const cardH =
          CARD_PAD +
          titleL.length * 4.8 +
          1.2 +
          LBL_H + qL.length * 3.7 + 1.6 +
          (scaleL.length > 0 ? LBL_H + scaleL.length * 3.7 + 1.6 : 0) +
          (readL.length > 0 ? LBL_H + readL.length * LH_BODY + 1.6 : 0) +
          (whyL.length > 0 ? LBL_H + whyL.length * LH_BODY + 1.6 : 0) +
          (chips.h > 0 ? chips.h + 0.5 : 0) +
          CARD_PAD;

        return { facet, titleL, qL, scaleL, readL, whyL, chips, cardH };
      };

      // reserve the real height of the first card, so the subheading is never
      // the last ink on a page
      const first = layoutCard(s.coach.why[0] as { item: number; rationale: string });
      const PAGE_AVAIL = PAGE_H - MARGIN_T - MARGIN_B;
      subheading(ctx, "Why these matter", Math.min(first.cardH + CARD_GAP, PAGE_AVAIL - 12));

      for (const w of s.coach.why) {
        const { facet, titleL, qL, scaleL, readL, whyL, chips, cardH } = layoutCard(w);
        const accent = fs.color(facet);

        ctx.ensureBlockSpace(cardH + CARD_GAP);
        const top = ctx.y;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 228, 232);
        doc.setLineWidth(0.2);
        doc.roundedRect(MARGIN_L, top, CONTENT_W, cardH, 1.6, 1.6, "FD");
        doc.setFillColor(accent[0], accent[1], accent[2]);
        doc.rect(MARGIN_L, top, CARD_RULE_W, cardH, "F");

        let y = top + CARD_PAD + 3.4;
        doc.setFont("Poppins", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...NAVY);
        for (const l of titleL) {
          doc.text(l, innerX, y);
          y += 4.8;
        }
        y += 1.2;

        const label = (t: string) => {
          doc.setFont("Montserrat", "semibold");
          doc.setFontSize(6.5);
          doc.setTextColor(...MUTED);
          doc.text(t, innerX, y);
          y += LBL_H;
        };
        const muted8 = (lines: string[]) => {
          doc.setFont("Montserrat", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...MUTED);
          for (const l of lines) {
            doc.text(l, innerX, y);
            y += 3.7;
          }
          y += 1.6;
        };
        const body = (lines: string[]) => {
          doc.setFont("Montserrat", "normal");
          doc.setFontSize(BODY_SIZE);
          doc.setTextColor(...BLACK);
          for (const l of lines) {
            doc.text(l, innerX, y);
            y += LH_BODY;
          }
          y += 1.6;
        };

        label("THE ITEM");
        muted8(qL);
        if (scaleL.length > 0) {
          label("THE SCALE");
          muted8(scaleL);
        }
        if (readL.length > 0) {
          label("THE READ");
          body(readL);
        }
        if (whyL.length > 0) {
          label("WHY FLAGGED");
          body(whyL);
        }
        if (chips.h > 0) drawChipRows(doc, chips.rows, innerX, y - 2.6);

        ctx.y = top + cardH + CARD_GAP;
      }
    }

    if (Array.isArray(s.coach.debrief_prompts) && s.coach.debrief_prompts.length > 0) {
      subheading(ctx, "Debrief prompts", 10);
      s.coach.debrief_prompts.forEach((p, i) => {
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(9);
        const ordW = doc.getTextWidth(`${i + 1}. `);
        const lines: string[] = doc.splitTextToSize(
          `${i + 1}. ${cleanMarkdown(p)}`,
          CONTENT_W - 4 - ordW,
        );

        lines.forEach((l, li) => {
          ctx.checkPageBreak(5);
          doc.setFont("Montserrat", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          doc.text(l, MARGIN_L + 3 + (li === 0 ? 0 : ordW), ctx.y);
          ctx.y += 4.5;
        });
      });
    }
  }

  ctx.addFooter();
  stampPageNumbers(doc);

  const today = new Date().toISOString().slice(0, 10);
  const safeName = (data.teamName || "Team").replace(/[^A-Za-z0-9-_]+/g, "_").slice(0, 40);
  doc.save(`BrainWise-Team-${safeName}-${today}.pdf`);
  void MUTED; void GRAY; void PURPLE;
}
