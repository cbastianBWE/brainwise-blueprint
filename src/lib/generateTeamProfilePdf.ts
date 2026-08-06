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
  type PdfContext,
} from "./generatePdfPrimitivesShared";
import {
  facetDisplayLabel,
  isBulletObject,
  bulletToText,
  bulletFacets,
  normFacetName,
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

const TEAM_SHAPE_COLOR: Record<TeamShapeKey, readonly [number, number, number]> = {
  allHigh: GREEN,
  allLow: NAVY,
  two: MUSTARD,
  even: PURPLE,
  together: TEAL,
};

function shapeKey(shape: string | null | undefined): TeamShapeKey {
  const s = (shape ?? "").toLowerCase();
  if (s.includes("all high")) return "allHigh";
  if (s.includes("all low")) return "allLow";
  if (s.includes("two")) return "two";
  if (s.includes("even")) return "even";
  return "together";
}

/* ---------- v14 bullet normalisation ----------
   Sections may hold plain strings (pre-v14 profiles) or { point, body, facets }
   objects (v14+, generator currently at v16). Everything funnels through asLines / asBlocks so no object
   ever reaches cleanMarkdown. Ported from generatePairedProfilePdf.ts. */

export interface PdfBlock {
  /** bold lead sentence (v14+ object bullets only) */
  point?: string;
  text: string;
  facets?: string[];
}

/** Facet domain lookup, keyed on the normalised facet name. Set per render. */
let facetDomainByName: Map<string, string> = new Map();

const PDF_DIM_COLOR: Record<string, readonly [number, number, number]> = {
  Protection: NAVY,
  Participation: TEAL,
  Prediction: GRAY,
  Purpose: PURPLE,
  Pleasure: MUSTARD, // amber is illegible at 6.5pt; mustard is its text-safe pair
};

function facetColor(name: string): readonly [number, number, number] {
  const dom = facetDomainByName.get(normFacetName(name));
  return (dom && PDF_DIM_COLOR[dom]) || GRAY;
}

/** jsPDF has no alpha on fills; blend toward white instead. */
function tint(c: readonly [number, number, number], a: number): [number, number, number] {
  return [
    Math.round(255 + (c[0] - 255) * a),
    Math.round(255 + (c[1] - 255) * a),
    Math.round(255 + (c[2] - 255) * a),
  ];
}

function asLines(v: string | Bullet[] | undefined): string[] {
  if (!v) return [];
  if (!Array.isArray(v)) return [v];
  return v.map((b) => bulletToText(b)).filter(Boolean);
}

function asBlocks(v: string | Bullet[] | undefined | null): PdfBlock[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v
      .map((b) => {
        if (typeof b === "string" || !isBulletObject(b)) {
          return { text: bulletToText(b), facets: bulletFacets(b) } as PdfBlock;
        }
        const point = (b.point ?? "").trim();
        const body = (b.body ?? "").trim();
        return {
          point: point || undefined,
          text: point ? body : bulletToText(b),
          facets: bulletFacets(b),
        } as PdfBlock;
      })
      .filter((b) => !!(b.text || b.point));
  }
  return typeof v === "string" ? [{ text: v }] : [];
}

function hasCards(blocks: PdfBlock[]): boolean {
  return blocks.some((b) => !!b.point || (b.facets ?? []).length > 0);
}

/* ---------- facet chips ---------- */

const CHIP_H = 3.4;
const CHIP_GAP_X = 1.5;
const CHIP_GAP_Y = 1.2;
const CHIP_PAD_X = 1.6;

interface Chip {
  label: string;
  w: number;
  color: readonly [number, number, number];
}

function chipLayout(
  doc: jsPDF,
  facets: string[] | undefined,
  maxW: number,
): { rows: Chip[][]; h: number } {
  const list = (facets ?? []).filter((f) => typeof f === "string" && f.trim());
  if (list.length === 0) return { rows: [], h: 0 };
  doc.setFont("Montserrat", "semibold");
  doc.setFontSize(6.5);
  const rows: Chip[][] = [];
  let row: Chip[] = [];
  let rowW = 0;
  for (const raw of list) {
    const label = facetDisplayLabel(cleanMarkdown(raw).trim(), "work");
    if (!label) continue;
    const w = Math.min(maxW, doc.getTextWidth(label) + CHIP_PAD_X * 2 + 1.5);
    if (row.length > 0 && rowW + CHIP_GAP_X + w > maxW) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    row.push({ label, w, color: facetColor(raw) });
    rowW += (row.length > 1 ? CHIP_GAP_X : 0) + w;
  }
  if (row.length > 0) rows.push(row);
  const h = rows.length === 0 ? 0 : rows.length * CHIP_H + (rows.length - 1) * CHIP_GAP_Y;
  return { rows, h };
}

function drawChipRows(doc: jsPDF, rows: Chip[][], x: number, top: number): void {
  let y = top;
  for (const row of rows) {
    let cx = x;
    for (const chip of row) {
      const fill = tint(chip.color, 0.1);
      const border = tint(chip.color, 0.3);
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.setDrawColor(border[0], border[1], border[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(cx, y, chip.w, CHIP_H, CHIP_H / 2, CHIP_H / 2, "FD");
      doc.setFont("Montserrat", "semibold");
      doc.setFontSize(6.5);
      doc.setTextColor(chip.color[0], chip.color[1], chip.color[2]);
      doc.text(chip.label, cx + chip.w / 2, y + CHIP_H / 2 + 0.85, { align: "center" });
      cx += chip.w + CHIP_GAP_X;
    }
    y += CHIP_H + CHIP_GAP_Y;
  }
}

/* ---------- bullet cards ---------- */

const BODY_SIZE = 9;
const LH_BODY = 4.5;
const LH_POINT = 4.6;
const CARD_PAD = 2.5;
const CARD_GAP = 2;
const CARD_RULE_W = 1.5;

interface CardMeasure {
  h: number;
  pointLines: string[];
  textLines: string[];
  chips: { rows: Chip[][]; h: number };
  accent: readonly [number, number, number];
}

function measureCard(
  doc: jsPDF,
  b: PdfBlock,
  w: number,
  accent: readonly [number, number, number],
): CardMeasure {
  const innerW = w - CARD_PAD * 2 - CARD_RULE_W;
  doc.setFont("Poppins", "bold");
  doc.setFontSize(9.5);
  const pointLines: string[] = b.point
    ? doc.splitTextToSize(cleanMarkdown(b.point), innerW)
    : [];
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(BODY_SIZE);
  const textLines: string[] = b.text ? doc.splitTextToSize(cleanMarkdown(b.text), innerW) : [];
  const chips = chipLayout(doc, b.facets, innerW);
  const h =
    CARD_PAD * 2 +
    pointLines.length * LH_POINT +
    textLines.length * LH_BODY +
    (chips.h > 0 ? chips.h + 0.8 : 0);
  return { h, pointLines, textLines, chips, accent };
}

function drawCardAt(doc: jsPDF, m: CardMeasure, x: number, y: number, w: number, framed = true): void {
  if (framed) {
    doc.setDrawColor(224, 222, 216);
    doc.setLineWidth(0.15);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, w, m.h, 1.6, 1.6, "FD");
    doc.setFillColor(m.accent[0], m.accent[1], m.accent[2]);
    doc.rect(x, y, CARD_RULE_W, m.h, "F");
  }
  const tx = x + CARD_RULE_W + CARD_PAD;
  let cy = y + CARD_PAD + 2.6;
  if (m.pointLines.length > 0) {
    doc.setFont("Poppins", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    for (const l of m.pointLines) {
      doc.text(l, tx, cy);
      cy += LH_POINT;
    }
  }
  if (m.textLines.length > 0) {
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(BODY_SIZE);
    doc.setTextColor(...BLACK);
    for (const l of m.textLines) {
      doc.text(l, tx, cy);
      cy += LH_BODY;
    }
  }
  if (m.chips.rows.length > 0) {
    drawChipRows(doc, m.chips.rows, tx, cy - 2.6 + 0.8);
  }
}

/** Accent rule colour: the first facet's PTP dimension, else the section accent. */
function blockAccent(b: PdfBlock, fallback: readonly [number, number, number]) {
  for (const f of b.facets ?? []) {
    const dom = facetDomainByName.get(normFacetName(f));
    if (dom && PDF_DIM_COLOR[dom]) return PDF_DIM_COLOR[dom];
  }
  return fallback;
}

function bulletCards(
  ctx: PdfContext,
  blocks: PdfBlock[],
  opts: { indent?: number; width?: number; accent?: readonly [number, number, number] } = {},
): void {
  const indent = opts.indent ?? 0;
  const w = opts.width ?? CONTENT_W - indent;
  const PAGE_AVAIL = PAGE_H - MARGIN_T - MARGIN_B;
  for (const b of blocks) {
    const m = measureCard(ctx.doc, b, w, blockAccent(b, opts.accent ?? TEAL));
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
function chipsUnder(ctx: PdfContext, facets: string[] | undefined, indent = 0): void {
  const layout = chipLayout(ctx.doc, facets, CONTENT_W - indent);
  if (layout.rows.length === 0) return;
  ctx.checkPageBreak(layout.h + 2);
  drawChipRows(ctx.doc, layout.rows, MARGIN_L + indent, ctx.y);
  ctx.y += layout.h + 2;
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
  args: { kind: "strength" | "focus"; name: string; why: string; actions: string[] },
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
  const actLines = args.actions.flatMap((a) =>
    doc.splitTextToSize("• " + cleanMarkdown(a), CONTENT_W - 12),
  );
  const contentH = 6 + nameLines.length * 4.5 + whyLines.length * 4.5 + actLines.length * 4.5 + 6;
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
  for (const l of actLines) { doc.text(l, MARGIN_L + 4, y); y += 4.5; }
  ctx.y = boxTop + contentH + 3;
}

function drawDomainsRadial(ctx: PdfContext, data: TeamPdfData): void {
  const order = ["Protection", "Participation", "Prediction"].filter((d) => data.domains[d] != null);
  if (order.length === 0) return;
  const { doc } = ctx;
  const cx = PAGE_W / 2;
  const cy = ctx.y + 42;
  const R = 30;
  ctx.checkPageBreak(90);

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
    contextPillLabel: `${data.memberCount} MEMBERS`,
    field1: { label: "TEAM", value: data.teamName },
    field2: { label: "DATE COMPLETED", value: todayLong },
    field3: { label: "TEAM SIZE", value: `${data.memberCount} members` },
    disclaimer:
      "This report aggregates the self-report profiles of team members to describe group tendencies under pressure. It is not a clinical assessment, a diagnosis, or an evaluation of any individual. Individual responses are not identified. It is intended to support team discussion, not to rank or appraise people.",
    copyright:
      "© {year} BrainWise Enterprises. Confidential and proprietary. Shared with the named recipients for their own reflection only; not to be reproduced or disclosed without written consent. The Personal Threat Profile and 5P model are the property of BrainWise Enterprises.",
  });

  doc.addPage();
  const ctx = createPdfContext(doc);
  const s = data.sections;

  /* Chip colour comes only from the facet's PTP dimension, keyed on the
     normalised facet name (chips carry names, everything else carries items). */
  facetDomainByName = new Map<string, string>();
  for (const f of [...data.fullMap, ...data.strengths, ...data.focusAreas]) {
    if (!f?.facetName || !f.domain) continue;
    const key = normFacetName(f.facetName);
    if (!facetDomainByName.has(key)) facetDomainByName.set(key, f.domain);
  }

  // 1. team in three
  if (sections.teamInThree && Array.isArray(s.team_in_three) && s.team_in_three.length > 0) {
    ctx.sectionHeading("Your team in three");
    s.team_in_three.slice(0, 3).forEach((it, i) => {
      ctx.ensureBlockSpace(20);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...ORANGE);
      doc.text(`${i + 1}.`, MARGIN_L, ctx.y);
      doc.setTextColor(...NAVY);
      doc.text(it.headline, MARGIN_L + 6, ctx.y);
      ctx.y += 5;
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
      chipsUnder(ctx, it.facets, 6);
      ctx.y += 4;
    });
  }

  // 2. domains
  if (sections.domains && Object.keys(data.domains).length > 0) {
    ctx.sectionHeading("Three domains, at a glance");
    drawDomainsRadial(ctx, data);
  }

  // 3. shape legend
  if (sections.shapeLegend) {
    ctx.sectionHeading("How to read the shapes");
    for (const k of TEAM_SHAPES) {
      ctx.ensureBlockSpace(14);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text(TEAM_SHAPE_TITLE[k], MARGIN_L, ctx.y);
      ctx.y += 4.5;
      ctx.bodyText(TEAM_SHAPE_DESC[k]);
      ctx.y += 2;
    }
  }

  // 4. driving
  if (sections.driving && s.driving_facets) {
    ctx.sectionHeading("Driving facets");
    if (s.driving_facets.opening) paragraphs(ctx, s.driving_facets.opening);
    ctx.y += 2;
    const strengthSrc = s.driving_facets.strengths ?? [];
    data.strengths.forEach((f, i) => {
      const src = strengthSrc[i];
      const acts = src?.actions ?? (src?.action ? [src.action] : []);
      drivingCard(ctx, {
        kind: "strength",
        name: facetDisplayLabel(f.facetName, "work"),
        why: src?.why ?? "",
        actions: acts.slice(0, 3),
      });
    });
    const focusSrc = s.driving_facets.focus ?? [];
    data.focusAreas.forEach((f, i) => {
      const src = focusSrc[i];
      const acts = src?.actions ?? (src?.action ? [src.action] : []);
      drivingCard(ctx, {
        kind: "focus",
        name: facetDisplayLabel(f.facetName, "work"),
        why: src?.why ?? "",
        actions: acts.slice(0, 3),
      });
    });
  }

  // 5. driving facet charts
  if (sections.drivingFacetCharts) {
    const set: TeamFacetForPdf[] = [...data.strengths, ...data.focusAreas];
    if (set.length > 0) {
      ctx.sectionHeading("Driving facets — team distribution");
      for (const f of set) {
        const scores = data.scoresByItem.get(f.itemNumber) ?? [];
        drawTeamDistRow(ctx, {
          label: facetDisplayLabel(f.facetName, "work"),
          scores,
          dotColor: TEAM_SHAPE_COLOR[shapeKey(f.shape)],
        });
      }
    }
  }

  // 6. communication
  if (sections.communication && s.communication) {
    ctx.sectionHeading("Communication");
    doc.setFont("Poppins", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    ctx.checkPageBreak(6);
    doc.text("In general", MARGIN_L, ctx.y);
    ctx.y += 5;
    const genBlocks = asBlocks(s.communication.general);
    if (hasCards(genBlocks)) bulletCards(ctx, genBlocks, { accent: TEAL });
    else for (const line of asLines(s.communication.general)) paragraphs(ctx, line);
    ctx.y += 3;
    doc.setFont("Poppins", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text("Under pressure", MARGIN_L, ctx.y);
    ctx.y += 5;
    const upBlocks = asBlocks(s.communication.under_pressure);
    if (hasCards(upBlocks)) bulletCards(ctx, upBlocks, { accent: TEAL });
    else for (const line of asLines(s.communication.under_pressure)) paragraphs(ctx, line);
    ctx.y += 3;
    if (Array.isArray(s.communication.avoid_conflict) && s.communication.avoid_conflict.length > 0) {
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text("Avoiding conflict", MARGIN_L, ctx.y);
      ctx.y += 5;
      s.communication.avoid_conflict.forEach((t, i) => {
        const blocks = asBlocks([t]);
        const b = blocks[0];
        if (!b) return;
        if (b.point || (b.facets ?? []).length > 0) {
          // the ordinal rides the point when there is one, otherwise the text,
          // so a bullet with facets but no point keeps its number
          bulletCards(ctx, [b.point
            ? { ...b, point: `${i + 1}. ${b.point}` }
            : { ...b, text: `${i + 1}. ${b.text}` }], {
            indent: 3,
            width: CONTENT_W - 3,
            accent: TEAL,
          });
          return;
        }
        const lines = doc.splitTextToSize(`${i + 1}. ${cleanMarkdown(b.text)}`, CONTENT_W - 6);
        for (const l of lines) {
          ctx.checkPageBreak(5);
          doc.setFont("Montserrat", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          doc.text(l, MARGIN_L + 3, ctx.y);
          ctx.y += 4.5;
        }
      });
    }
  }

  // 7. conflict
  if (sections.conflict && s.conflict) {
    ctx.sectionHeading("Conflict");
    if (s.conflict.summary) paragraphs(ctx, s.conflict.summary);
    ctx.y += 2;
    const mit = asBlocks(s.conflict.mitigate);
    const pro = asBlocks(s.conflict.promote_healthy);
    if (hasCards(mit) || hasCards(pro)) {
      // cards are too tall for the two-column grid; stack them full width
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      ctx.checkPageBreak(6);
      doc.text("Mitigate", MARGIN_L, ctx.y);
      ctx.y += 5;
      bulletCards(ctx, mit, { accent: TEAL });
      ctx.y += 2;
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      ctx.checkPageBreak(6);
      doc.text("Promote healthy", MARGIN_L, ctx.y);
      ctx.y += 5;
      bulletCards(ctx, pro, { accent: MUSTARD });
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

  // 7b. leadership snapshot (three headlines + moves)
  if (sections.leadership && Array.isArray(s.leadership) && s.leadership.length > 0) {
    ctx.sectionHeading("For the leader");
    for (let i = 0; i < Math.min(3, s.leadership.length); i++) {
      const it = s.leadership[i];
      ctx.ensureBlockSpace(20);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...NAVY);
      doc.text(`${i + 1}. ${it.headline ?? ""}`, MARGIN_L, ctx.y);
      ctx.y += 5;
      ctx.bodyText(it.detail ?? "");
      if (it.action) {
        doc.setFont("Poppins", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...NAVY);
        doc.text(it.action, MARGIN_L, ctx.y);
        ctx.y += 5;
      }
      chipsUnder(ctx, it.facets);
      ctx.y += 2;
    }
  }

  // 8. leader brief (privileged)
  if (sections.leaderBrief && s.leader_brief) {
    ctx.sectionHeading("For the leader: the moves");
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

    for (const r of rows) {
      const driver = data.itemText.get(r.item) ?? `Item ${r.item}`;
      const cells = [driver, r.risk_to_work, r.the_move, r.potential_owner];
      const splits = cells.map((t, i) => doc.splitTextToSize(cleanMarkdown(t ?? ""), cols[i].w - 3));
      const rowH = Math.max(...splits.map((s) => s.length)) * 4.2 + 2;
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
      doc.setFillColor(245, 250, 245);
      doc.setDrawColor(200, 220, 200);
      const leanRaw = cleanMarkdown(s.leader_brief.lean_on).replace(/^\s*lean on:\s*/i, "");
      const dl = doc.splitTextToSize("Lean on: " + leanRaw, CONTENT_W - 6);
      const h = dl.length * 4.5 + 6;
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
    ctx.sectionHeading("The full map");
    const buckets: Record<TeamShapeKey, TeamFacetForPdf[]> = {
      allHigh: [], allLow: [], two: [], even: [], together: [],
    };
    for (const f of data.fullMap) buckets[shapeKey(f.shape)].push(f);

    for (const k of TEAM_SHAPES) {
      const items = buckets[k];
      if (items.length === 0) continue;
      ctx.ensureBlockSpace(12);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text(TEAM_SHAPE_TITLE[k], MARGIN_L, ctx.y);
      ctx.y += 5;
      if (sections.fullMapCharts) {
        for (const f of items) {
          drawTeamDistRow(ctx, {
            label: facetDisplayLabel(f.facetName, "work"),
            scores: data.scoresByItem.get(f.itemNumber) ?? [],
            dotColor: TEAM_SHAPE_COLOR[k],
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

  // 10. coach (privileged)
  if (sections.coach && s.coach) {
    ctx.sectionHeading("For the practitioner, org admin & super admin");
    if (Array.isArray(s.coach.why) && s.coach.why.length > 0) {
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      ctx.checkPageBreak(6);
      doc.text("Why these matter", MARGIN_L, ctx.y);
      ctx.y += 5;
      for (const w of s.coach.why) {
        const q = data.itemText.get(w.item) ?? `Item ${w.item}`;
        ctx.ensureBlockSpace(16);
        doc.setFont("Montserrat", "semibold");
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        const ql = doc.splitTextToSize(cleanMarkdown(q), CONTENT_W);
        for (const l of ql) {
          ctx.checkPageBreak(5);
          doc.text(l, MARGIN_L, ctx.y);
          ctx.y += 4;
        }
        ctx.y += 0.5;
        paragraphs(ctx, w.rationale);
        ctx.y += 2;
      }
    }
    if (Array.isArray(s.coach.debrief_prompts) && s.coach.debrief_prompts.length > 0) {
      ctx.checkPageBreak(6);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text("Debrief prompts", MARGIN_L, ctx.y);
      ctx.y += 5;
      s.coach.debrief_prompts.forEach((p, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${cleanMarkdown(p)}`, CONTENT_W - 4);
        for (const l of lines) {
          ctx.checkPageBreak(5);
          doc.setFont("Montserrat", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          doc.text(l, MARGIN_L + 3, ctx.y);
          ctx.y += 4.5;
        }
      });
    }
  }

  ctx.addFooter();
  stampPageNumbers(doc);

  const today = new Date().toISOString().slice(0, 10);
  const safeName = (data.teamName || "Team").replace(/[^A-Za-z0-9-_]+/g, "_").slice(0, 40);
  doc.save(`BrainWise-Team-${safeName}-${today}.pdf`);
  void MUTED; void GRAY;
}
