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
  AMBER,
  createPdfContext,
  renderCoverPage,
  stampPageNumbers,
  cleanMarkdown,
  splitParas,
  drawPairDistRow,
  type PdfContext,
} from "./generatePdfPrimitivesShared";
import {
  bulletFacets,
  bulletToText,
  isBulletObject,
  isMoveBullet,
  stripMovePrefix,
  normFacetName,
  facetDisplayLabel,
  type Bullet,
  type StepItem,
} from "./pairedSectionTypes";
import type { PairedPdfData, PairedFacetForPdf } from "./assemblePairedPdfData";


const PAIRED_COVER_DISCLAIMER_ROMANTIC =
  "This report interprets two self-report profiles and describes tendencies in how two people may relate. It is not a clinical assessment, a diagnosis, or a judgment about the relationship. If any pattern here involves fear, control, or harm, please seek support from a qualified professional.";

const PAIRED_COVER_DISCLAIMER_NONROMANTIC =
  "This report interprets two self-report profiles and describes tendencies in how two people tend to work together. It is not a clinical assessment, a diagnosis, or a judgment about either person. If any pattern here involves fear, control, or harm, please seek support from a qualified professional.";


export interface PairedPdfSections {
  pairInThree: boolean;
  atAGlance: boolean;
  shapeLegend: boolean;
  driving: boolean;
  drivingFacetCharts: boolean;
  within: boolean;
  needs: boolean;
  communication: boolean;
  conflict: boolean;
  leaderActions: boolean;
  repair: boolean;
  intimacy: boolean;
  fullMap: boolean;
  fullMapCharts: boolean;
  coach: boolean;
}

const PAIR_SHAPES = ["farApart", "bothHigh", "bothLow", "bothMedium", "mild"] as const;
type PairShapeKey = (typeof PAIR_SHAPES)[number];

const PAIR_SHAPE_TITLE: Record<PairShapeKey, string> = {
  farApart: "Far apart",
  bothHigh: "Both high",
  bothLow: "Both low",
  bothMedium: "Both medium",
  mild: "Mild",
};

const PAIR_SHAPE_DESC: Record<PairShapeKey, string> = {
  farApart: "opposite ends",
  bothHigh: "both up here",
  bothLow: "neither is high",
  bothMedium: "meet in the middle",
  mild: "a soft difference",
};

function pairShapeKey(shape: string | null | undefined, a?: number, b?: number): PairShapeKey {
  const s = (shape ?? "").toLowerCase();
  if (s.includes("far apart") || s === "farapart") return "farApart";
  if (s.includes("both high")) return "bothHigh";
  if (s.includes("both low")) return "bothLow";
  if (s.includes("both medium") || s.includes("medium")) return "bothMedium";
  if (s.includes("mild")) return "mild";
  if (typeof a === "number" && typeof b === "number") {
    const diff = Math.abs(a - b);
    const mean = (a + b) / 2;
    if (diff >= 35) return "farApart";
    if (mean >= 65 && diff < 20) return "bothHigh";
    if (mean <= 35 && diff < 20) return "bothLow";
    if (diff < 12) return "bothMedium";
    return "mild";
  }
  return "mild";
}

function modeTitle(mode: string): string {
  if (mode === "work") return "Work Paired Report";
  if (mode === "personal") return "Personal Paired Report";
  if (mode === "romantic") return "Romantic Paired Report";
  return "Paired Report";
}

/* ---------- v19 bullet normalization ----------
   Sections may hold plain strings (pre-v19 reports) or { point, body, facets }
   objects (v19+). Everything funnels through asLines / asBlocks so no object
   ever reaches cleanMarkdown or nm(). */

export interface PdfBlock {
  /** bold lead sentence (v19+ object bullets only) */
  point?: string;
  text: string;
  facets?: string[];
  /** point began with "The move:" — green rule + THE MOVE label */
  move?: boolean;
}
export type ColItem = string | PdfBlock;

/** Facet domain lookup, keyed on the normalized facet name. Set per render. */
let facetDomainByName: Map<string, string> = new Map();

/** Relationship mode for this render; display labels only, never lookups. */
let renderMode: string | null = null;
/** The label to print for a facet. Lookups keep using the raw name. */
function facetLabel(name: string): string {
  return facetDisplayLabel(name, renderMode);
}

const PDF_DIM_COLOR: Record<string, readonly [number, number, number]> = {
  Protection: NAVY,
  Participation: TEAL,
  Prediction: GRAY,
  Purpose: PURPLE,
  Pleasure: MUSTARD, // amber is illegible at 8pt; mustard is its text-safe pair
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


function asBlocks(v: string | Bullet[] | undefined | null): PdfBlock[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v
      .map((b) => {
        if (typeof b === "string" || !isBulletObject(b)) {
          return { text: bulletToText(b), facets: bulletFacets(b) } as PdfBlock;
        }
        const move = isMoveBullet(b);
        const point = move ? stripMovePrefix(b.point ?? "") : (b.point ?? "").trim();
        const body = (b.body ?? "").trim();
        return {
          point: point || undefined,
          text: point ? body : bulletToText(b),
          facets: bulletFacets(b),
          move,
        } as PdfBlock;
      })
      .filter((b) => !!(b.text || b.point));
  }
  return typeof v === "string" ? [{ text: v }] : [];
}

function blockText(item: ColItem): string {
  return typeof item === "string" ? item : item.text;
}
function isCardItem(item: ColItem): boolean {
  return typeof item !== "string" && (!!item.point || (item.facets ?? []).length > 0);
}
function toBlock(item: ColItem): PdfBlock {
  return typeof item === "string" ? { text: item } : item;
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
    const label = facetLabel(cleanMarkdown(raw).trim());
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

/** Pill chips for a facet list, wrapping within the available width. */

/* ---------- bullet cards ---------- */

const BODY_SIZE = 8.5;
const LH_BODY = 4.1;
const LH_POINT = 4.4;
const CARD_PAD = 2.5;
const CARD_GAP = 2;
const CARD_RULE_W = 1.5;

interface CardMeasure {
  h: number;
  pointLines: string[];
  textLines: string[];
  chips: { rows: Chip[][]; h: number };
  innerW: number;
  accent: readonly [number, number, number];
  move: boolean;
}

function measureCard(
  doc: jsPDF,
  b: PdfBlock,
  w: number,
  accent: readonly [number, number, number],
): CardMeasure {
  const innerW = w - CARD_PAD * 2 - CARD_RULE_W;
  const move = !!b.move;
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
    (move ? 3.2 : 0) +
    pointLines.length * LH_POINT +
    textLines.length * LH_BODY +
    (chips.h > 0 ? chips.h + 0.8 : 0);
  return { h, pointLines, textLines, chips, innerW, accent: move ? GREEN : accent, move };
}

function drawCardAt(
  doc: jsPDF,
  m: CardMeasure,
  x: number,
  y: number,
  w: number,
  framed = true,
): void {
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
  if (m.move) {
    doc.setFont("Montserrat", "semibold");
    doc.setFontSize(6.5);
    doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.text("THE MOVE", tx, cy, { charSpace: 0.5 });
    cy += 3.2;
  }
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

/** A single full-width (or indented) bullet card. */
function bulletCard(
  ctx: PdfContext,
  block: PdfBlock,
  opts: { indent?: number; width?: number; accent?: readonly [number, number, number] } = {},
): void {
  const indent = opts.indent ?? 0;
  const w = opts.width ?? CONTENT_W - indent;
  const m = measureCard(ctx.doc, block, w, opts.accent ?? TEAL);
  const PAGE_AVAIL = PAGE_H - MARGIN_T - MARGIN_B;
  if (m.h > PAGE_AVAIL) {
    // taller than a page: render unframed rather than loop forever
    drawCardAt(ctx.doc, m, MARGIN_L + indent, ctx.y, w, false);
    ctx.y += m.h + CARD_GAP;
    return;
  }
  ctx.reserveBlockOrAllow(m.h + CARD_GAP);
  drawCardAt(ctx.doc, m, MARGIN_L + indent, ctx.y, w);
  ctx.y += m.h + CARD_GAP;
}

/** 8.5pt body paragraph at the tightened leading. */
function bodyLines(ctx: PdfContext, text: string, indent = 0): void {
  const { doc } = ctx;
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(BODY_SIZE);
  doc.setTextColor(...BLACK);
  const lines: string[] = doc.splitTextToSize(cleanMarkdown(text), CONTENT_W - indent);
  for (const l of lines) {
    ctx.checkPageBreak(LH_BODY + 0.5);
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(BODY_SIZE);
    doc.setTextColor(...BLACK);
    doc.text(l, MARGIN_L + indent, ctx.y);
    ctx.y += LH_BODY;
  }
}

/** Bordered amber callout used for conflict.safety / repair.safety. */
function safetyCallout(ctx: PdfContext, title: string, text: string): void {
  const body = (text ?? "").trim();
  if (!body) return;
  const { doc } = ctx;
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(BODY_SIZE);
  const lines: string[] = doc.splitTextToSize(cleanMarkdown(body), CONTENT_W - 12);
  const boxH = 5.5 + 4.2 + lines.length * LH_BODY + 3.5;
  ctx.ensureBlockSpace(boxH + 3);
  const top = ctx.y;
  doc.setDrawColor(AMBER[0], AMBER[1], AMBER[2]);
  doc.setFillColor(255, 252, 245);
  doc.roundedRect(MARGIN_L, top, CONTENT_W, boxH, 2, 2, "FD");
  doc.setFillColor(AMBER[0], AMBER[1], AMBER[2]);
  doc.rect(MARGIN_L, top, 1.5, boxH, "F");

  let y = top + 5.5;
  doc.setFont("Poppins", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUSTARD);
  doc.text(title, MARGIN_L + 5, y);
  y += 4.2;
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(BODY_SIZE);
  doc.setTextColor(...BLACK);
  for (const l of lines) {
    doc.text(l, MARGIN_L + 5, y);
    y += LH_BODY;
  }
  ctx.y = top + boxH + 3;
}

/** Numbered sequence with teal numeral discs and a connector between them. */
function numberedSteps(ctx: PdfContext, items: StepItem[], nm: (s: string) => string): void {
  const { doc } = ctx;
  const DISC_R = 2.25;
  const discX = MARGIN_L + DISC_R;
  const textX = MARGIN_L + DISC_R * 2 + 3;
  const textW = CONTENT_W - (textX - MARGIN_L);
  let prevBottom: number | null = null;

  items.forEach((raw, i) => {
    const isObj = typeof raw !== "string" && isBulletObject(raw);
    const point = isObj ? nm((raw as { point?: string }).point ?? "").trim() : "";
    const bodyRaw = isObj
      ? nm((raw as { body?: string }).body ?? "").trim()
      : nm(bulletToText(raw));
    if (!point && !bodyRaw) return;

    doc.setFont("Poppins", "bold");
    doc.setFontSize(9);
    const pointLines: string[] = point ? doc.splitTextToSize(cleanMarkdown(point), textW) : [];
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(BODY_SIZE);
    const bodyL: string[] = bodyRaw ? doc.splitTextToSize(cleanMarkdown(bodyRaw), textW) : [];
    const chips = chipLayout(doc, bulletFacets(raw), textW);
    const blockH =
      Math.max(DISC_R * 2, pointLines.length * LH_POINT + bodyL.length * LH_BODY) +
      (chips.h > 0 ? chips.h + 1 : 0) +
      2.5;

    const before = ctx.y;
    ctx.reserveBlockOrAllow(blockH);
    if (ctx.y !== before) prevBottom = null;

    const top = ctx.y;
    // connector
    if (prevBottom != null && prevBottom < top - 0.5) {
      doc.setDrawColor(TEAL[0], TEAL[1], TEAL[2]);
      doc.setLineWidth(0.3);
      doc.line(discX, prevBottom, discX, top);
    }
    doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
    doc.circle(discX, top + DISC_R, DISC_R, "F");
    doc.setFont("Poppins", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(String(i + 1), discX, top + DISC_R + 1.1, { align: "center" });

    let y = top + 3.2;
    if (pointLines.length > 0) {
      doc.setFont("Poppins", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      for (const l of pointLines) {
        doc.text(l, textX, y);
        y += LH_POINT;
      }
    }
    if (bodyL.length > 0) {
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(BODY_SIZE);
      doc.setTextColor(...BLACK);
      for (const l of bodyL) {
        doc.text(l, textX, y);
        y += LH_BODY;
      }
    }
    if (chips.rows.length > 0) {
      drawChipRows(doc, chips.rows, textX, y - 2.6 + 1);
      y += chips.h + 1;
    }
    prevBottom = top + DISC_R * 2;
    ctx.y = Math.max(y, top + DISC_R * 2) + 2.5;
  });
}



interface ColLine {
  text: string;
  x: number;
  /** facet caption line: 8pt italic, colored by the facet's dimension */
  facetColor?: readonly [number, number, number];
}

function twoColumn(
  ctx: PdfContext,
  leftTitle: string,
  leftBody: ColItem[],
  rightTitle: string,
  rightBody: ColItem[],
  opts: {
    bulleted?: boolean;
    /** person legend dots drawn before each column title */
    persons?: boolean;
  } = {},
): void {
  const { doc } = ctx;
  const bulleted = opts.bulleted ?? false;
  const colGap = 6;
  const colW = (CONTENT_W - colGap) / 2;
  const lineH = LH_BODY;
  const leftX = MARGIN_L;
  const rightX = MARGIN_L + colW + colGap;
  const persons = opts.persons ?? false;
  const titleIndent = persons ? 5 : 0;

  const drawTitles = (y: number): number => {
    if (persons) {
      doc.setFillColor(...NAVY);
      doc.circle(leftX + 1.1, y - 1.1, 1.1, "F");
      doc.setFillColor(...MUSTARD);
      doc.circle(rightX + 1.1, y - 1.1, 1.1, "F");
    }
    doc.setFont("Poppins", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text(leftTitle, leftX + titleIndent, y);
    doc.text(rightTitle, rightX + titleIndent, y);
    return y + 4.5;
  };

  /* ---- card mode: object bullets on either side ---- */
  const anyCards = [...leftBody, ...rightBody].some(isCardItem);
  if (anyCards) {
    const accentL = persons ? NAVY : TEAL;
    const accentR = persons ? MUSTARD : TEAL;
    ctx.ensureBlockSpace(4.5 + 14);
    let y = drawTitles(ctx.y);
    const n = Math.max(leftBody.length, rightBody.length);
    for (let i = 0; i < n; i++) {
      const l = leftBody[i] ? measureCard(doc, toBlock(leftBody[i]), colW, accentL) : null;
      const r = rightBody[i] ? measureCard(doc, toBlock(rightBody[i]), colW, accentR) : null;
      const rowH = Math.max(l?.h ?? 0, r?.h ?? 0);
      if (rowH === 0) continue;
      if (y + rowH > PAGE_H - MARGIN_B && rowH <= PAGE_H - MARGIN_T - MARGIN_B) {
        ctx.y = y;
        ctx.addFooter();
        doc.addPage();
        ctx.renderContinuationHeader();
        y = drawTitles(MARGIN_T);
      }
      if (l) drawCardAt(doc, l, leftX, y, colW);
      if (r) drawCardAt(doc, r, rightX, y, colW);
      y += rowH + CARD_GAP;
    }
    ctx.y = y + 2;
    return;
  }

  /* ---- legacy plain-string mode ---- */
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(BODY_SIZE);
  const bulletW = doc.getTextWidth("• ");

  const wrapCol = (body: ColItem[], x: number): ColLine[] => {
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(BODY_SIZE);
    const out: ColLine[] = [];
    body.forEach((item, idx) => {
      const clean = cleanMarkdown(blockText(item));
      if (!clean) return;
      if (bulleted) {
        const wrapped: string[] = doc.splitTextToSize(clean, colW - 5 - bulletW);
        wrapped.forEach((ln, i) => {
          out.push({ text: i === 0 ? "• " + ln : ln, x: i === 0 ? x : x + bulletW });
        });
      } else {
        const wrapped: string[] = doc.splitTextToSize(clean, colW - 5);
        wrapped.forEach((ln) => out.push({ text: ln, x }));
      }
      if (!bulleted && idx < body.length - 1) out.push({ text: "", x });
    });
    return out;
  };

  const leftLines = wrapCol(leftBody, leftX);
  const rightLines = wrapCol(rightBody, rightX);

  ctx.ensureBlockSpace(4.5 + lineH * 3);
  let y = drawTitles(ctx.y);
  const bodyStyle = () => {
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(BODY_SIZE);
    doc.setTextColor(...BLACK);
  };
  bodyStyle();

  const drawLine = (l: ColLine | undefined, yy: number) => {
    if (!l || !l.text) return;
    doc.text(l.text, l.x, yy);
  };

  const n = Math.max(leftLines.length, rightLines.length);
  for (let i = 0; i < n; i++) {
    if (y + lineH > PAGE_H - MARGIN_B) {
      ctx.y = y;
      ctx.addFooter();
      doc.addPage();
      ctx.renderContinuationHeader();
      y = drawTitles(MARGIN_T);
      bodyStyle();
    }
    drawLine(leftLines[i], y);
    drawLine(rightLines[i], y);
    y += lineH;
  }
  ctx.y = y + 3;
}


function paragraphs(ctx: PdfContext, text: string): void {
  const paras = splitParas(text);
  for (let i = 0; i < paras.length; i++) {
    bodyLines(ctx, paras[i]);
    if (i < paras.length - 1) ctx.y += 1.5;
  }
}

/** Render a list of blocks: cards for v19 object bullets, paragraphs for legacy strings. */
function renderBlocks(
  ctx: PdfContext,
  blocks: ColItem[],
  accent: readonly [number, number, number] = TEAL,
): void {
  for (const blk of blocks) {
    if (isCardItem(blk)) bulletCard(ctx, toBlock(blk), { accent });
    else paragraphs(ctx, blockText(blk));
  }
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
  for (const l of nameLines) {
    doc.text(l, MARGIN_L + 4, y);
    y += 4.5;
  }
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  for (const l of whyLines) {
    doc.text(l, MARGIN_L + 4, y);
    y += 4.5;
  }
  for (const l of actLines) {
    doc.text(l, MARGIN_L + 4, y);
    y += 4.5;
  }
  ctx.y = boxTop + contentH + 3;
}

function drawRadial(ctx: PdfContext, data: PairedPdfData): void {
  const dimOrder = ["Protection", "Participation", "Prediction", "Purpose", "Pleasure"].filter(
    (d) => data.dimensions[d] != null,
  );
  if (dimOrder.length === 0) return;
  const { doc } = ctx;
  const cx = PAGE_W / 2;
  const cy = ctx.y + 45;
  const R = 32;
  ctx.checkPageBreak(100);

  // rings
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  [0.25, 0.5, 0.75, 1].forEach((f) => doc.circle(cx, cy, R * f, "S"));

  const N = dimOrder.length;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / N;
  const point = (i: number, v: number): [number, number] => {
    const r = R * (v / 100);
    const a = angle(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };

  // axes + labels
  doc.setDrawColor(220, 220, 220);
  doc.setFont("Montserrat", "semibold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  dimOrder.forEach((name, i) => {
    const a = angle(i);
    const [ex, ey] = [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    doc.line(cx, cy, ex, ey);
    const lx = cx + Math.cos(a) * (R + 6);
    const ly = cy + Math.sin(a) * (R + 6) + 1.5;
    doc.text(name, lx, ly, { align: "center" });
  });

  // polygons
  const drawPoly = (getVal: (i: number) => number, color: readonly [number, number, number]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(1);
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) pts.push(point(i, getVal(i)));
    for (let i = 0; i < N; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % N];
      doc.line(x1, y1, x2, y2);
    }
    doc.setFillColor(color[0], color[1], color[2]);
    for (const [x, y] of pts) doc.circle(x, y, 1.2, "F");
  };
  drawPoly((i) => data.dimensions[dimOrder[i]].a, NAVY);
  drawPoly((i) => data.dimensions[dimOrder[i]].b, MUSTARD);

  ctx.y = cy + R + 14;

  // Legend
  doc.setFillColor(...NAVY);
  doc.circle(MARGIN_L + 3, ctx.y, 1.5, "F");
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(data.nameA, MARGIN_L + 7, ctx.y + 1);
  const midX = MARGIN_L + 60;
  doc.setFillColor(...MUSTARD);
  doc.circle(midX, ctx.y, 1.5, "F");
  doc.text(data.nameB, midX + 4, ctx.y + 1);
  ctx.y += 6;

  // Agreement bars — keep all dimension bars together as one block.
  ctx.y += 3;
  const barH = 4;
  const rowH = 8;
  ctx.ensureBlockSpace(dimOrder.length * rowH + 4);
  for (const name of dimOrder) {
    const y = ctx.y;
    doc.setFont("Montserrat", "semibold");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(name, MARGIN_L, y + 3);
    const barX = MARGIN_L + 40;
    const barW = CONTENT_W - 40;
    doc.setFillColor(240, 238, 232);
    doc.roundedRect(barX, y, barW, barH, 1, 1, "F");
    const a = data.dimensions[name].a;
    const b = data.dimensions[name].b;
    const ax = barX + (a / 100) * barW;
    const bx = barX + (b / 100) * barW;
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.5);
    doc.line(Math.min(ax, bx), y + barH / 2, Math.max(ax, bx), y + barH / 2);
    doc.setFillColor(...NAVY);
    doc.circle(ax, y + barH / 2, 1.3, "F");
    doc.setFillColor(...MUSTARD);
    doc.circle(bx, y + barH / 2, 1.3, "F");
    ctx.y += rowH;
  }
}

export async function generatePairedProfilePdf(
  data: PairedPdfData,
  sections: PairedPdfSections,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { registerPdfFonts } = await import("./pdfFonts");
  registerPdfFonts(doc);

  const todayLong = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const modeCap = data.mode.charAt(0).toUpperCase() + data.mode.slice(1);
  await renderCoverPage(doc, {
    eyebrow: "PAIRED PROFILE",
    titleLine1: "Paired",
    titleLine2: "Report",
    trademark: false,
    subtitle:
      "A neuroscience-based look at how two people fit, where they pull apart, and what to do about it, mapped to the BrainWise 5P model.",
    contextPillLabel: `${data.mode.toUpperCase()} CONTEXT`,
    field1: { label: "PAIR", value: `${data.nameA} & ${data.nameB}` },
    field2: { label: "DATE COMPLETED", value: todayLong },
    field3: { label: "RELATIONSHIP CONTEXT", value: modeCap },
    disclaimer:
      data.mode === "romantic"
        ? PAIRED_COVER_DISCLAIMER_ROMANTIC
        : PAIRED_COVER_DISCLAIMER_NONROMANTIC,
    copyright:
      "© {year} BrainWise Enterprises. Confidential and proprietary. Shared with the named recipients for their own reflection only; not to be reproduced or disclosed without written consent. The Personal Threat Profile and 5P model are the property of BrainWise Enterprises.",
  });

  doc.addPage();
  const ctx = createPdfContext(doc);
  const nm = data.nm;
  const s = data.sections;

  // name-keyed facet domain index, used to color facet captions
  renderMode = data.mode ?? null;
  facetDomainByName = new Map();
  for (const f of [...data.fullMap, ...data.strengths, ...data.focusAreas]) {
    const key = normFacetName(f.facetName ?? "");
    if (key && f.domain && !facetDomainByName.has(key)) facetDomainByName.set(key, f.domain);
  }
  const nmBlocks = (v: Parameters<typeof asBlocks>[0]): ColItem[] =>
    asBlocks(v).map((b) => ({ text: nm(b.text), facets: (b.facets ?? []).map(nm) }));


  // 1. pair in three
  if (sections.pairInThree && Array.isArray(s.pair_in_three) && s.pair_in_three.length > 0) {
    ctx.sectionHeading("Your pair in three", 24, "The shape");
    s.pair_in_three.slice(0, 3).forEach((it, i) => {
      ctx.ensureBlockSpace(20);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...ORANGE);
      doc.text(`${i + 1}.`, MARGIN_L, ctx.y);
      doc.setTextColor(...NAVY);
      doc.text(nm(it.headline), MARGIN_L + 6, ctx.y);
      ctx.y += 5;
      ctx.bodyText(nm(it.detail), 6);
      if (it.action) {
        ctx.checkPageBreak(10);
        ctx.y += 1.2;
        doc.setFont("Poppins", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...TEAL);
        doc.text("DO THIS", MARGIN_L + 6, ctx.y);
        ctx.y += 3.4;
        doc.setFont("Montserrat", "semibold");
        doc.setFontSize(9);
        doc.setTextColor(...TEAL);
        const al = doc.splitTextToSize(cleanMarkdown(nm(it.action)), CONTENT_W - 6);
        for (const l of al) {
          ctx.checkPageBreak(5);
          doc.text(l, MARGIN_L + 6, ctx.y);
          ctx.y += 4.5;
        }
      }
      ctx.y += 4;
    });
  }

  // 2. at a glance (radial + agreement bars)
  if (sections.atAGlance && Object.keys(data.dimensions).length > 0) {
    ctx.sectionHeading("At a glance", 100, "The scores");
    drawRadial(ctx, data);
  }

  // 3. shape legend
  if (sections.shapeLegend) {
    ctx.sectionHeading("How to read the shapes", 14, "How to read this");
    // Two-column grid of one-line entries: title, then its description on the
    // same line. A quarter of the space the stacked single column took.
    const legendGutter = 8;
    const legendColW = (CONTENT_W - legendGutter) / 2;
    ctx.ensureBlockSpace(Math.ceil(PAIR_SHAPES.length / 2) * 5.6 + 4);
    let legendY = ctx.y;
    PAIR_SHAPES.forEach((k, i) => {
      const x = i % 2 === 0 ? MARGIN_L : MARGIN_L + legendColW + legendGutter;
      if (i % 2 === 0 && i > 0) legendY += 5.6;
      doc.setFont("Poppins", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text(PAIR_SHAPE_TITLE[k], x, legendY);
      const tw = doc.getTextWidth(PAIR_SHAPE_TITLE[k]);
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BLACK);
      doc.text(`— ${PAIR_SHAPE_DESC[k]}`, x + tw + 2.5, legendY);
    });
    ctx.y = legendY + 6;
  }

  // 4. driving
  if (sections.driving && s.driving_facets) {
    ctx.sectionHeading("Driving facets", 22, "The drivers");
    if (s.driving_facets.opening) paragraphs(ctx, nm(s.driving_facets.opening));
    ctx.y += 2;

    const strengthSrc = s.driving_facets.strengths ?? [];
    data.strengths.forEach((f, i) => {
      const src = strengthSrc[i];
      const acts = src?.actions ?? (src?.action ? [src.action] : []);
      drivingCard(ctx, {
        kind: "strength",
        name: facetLabel(f.facetName),
        why: nm(src?.why ?? ""),
        actions: acts.slice(0, 3).map(nm),
      });
    });
    const focusSrc = s.driving_facets.focus ?? [];
    data.focusAreas.forEach((f, i) => {
      const src = focusSrc[i];
      const acts = src?.actions ?? (src?.action ? [src.action] : []);
      drivingCard(ctx, {
        kind: "focus",
        name: facetLabel(f.facetName),
        why: nm(src?.why ?? ""),
        actions: acts.slice(0, 3).map(nm),
      });
    });
  }

  // 5. driving facet charts
  if (sections.drivingFacetCharts) {
    const set: PairedFacetForPdf[] = [...data.strengths, ...data.focusAreas].filter(
      (f) => f.stats && typeof f.stats.a === "number" && typeof f.stats.b === "number",
    );
    if (set.length > 0) {
      ctx.sectionHeading("Driving facets — distribution", 22, "The drivers");
      for (const f of set) {
        drawPairDistRow(ctx, { label: facetLabel(f.facetName), a: f.stats!.a, b: f.stats!.b });
      }
    }
  }

  // 6. within
  if (sections.within && s.within_person) {
    ctx.sectionHeading("Within each person", 26, "Each of you");
    twoColumn(
      ctx,
      data.firstA,
      nmBlocks(s.within_person.a),
      data.firstB,
      nmBlocks(s.within_person.b),
      { persons: true },
    );
  }

  // 7. needs
  if (sections.needs && s.needs) {
    ctx.sectionHeading("What each of you needs", 26, "The asks");
    twoColumn(
      ctx,
      `What ${data.firstA} needs from ${data.firstB}`,
      nmBlocks(s.needs.a_needs_from_b),
      `What ${data.firstB} needs from ${data.firstA}`,
      nmBlocks(s.needs.b_needs_from_a),
      { bulleted: true, persons: true },
    );
  }


  // 8. communication
  if (sections.communication && s.communication) {
    ctx.sectionHeading("Communication", 22, "The mechanics");
    doc.setFont("Poppins", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    ctx.checkPageBreak(6);
    doc.text("In general", MARGIN_L, ctx.y);
    ctx.y += 5;
    renderBlocks(ctx, nmBlocks(s.communication.general));

    ctx.y += 2;
    ctx.checkPageBreak(6);
    doc.setFont("Poppins", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text("Under pressure", MARGIN_L, ctx.y);
    ctx.y += 5;
    renderBlocks(ctx, nmBlocks(s.communication.under_pressure));

    ctx.y += 3;
    if (Array.isArray(s.communication.avoid_conflict) && s.communication.avoid_conflict.length > 0) {
      ctx.checkPageBreak(6);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text("Avoiding conflict", MARGIN_L, ctx.y);
      ctx.y += 5;
      numberedSteps(ctx, s.communication.avoid_conflict, nm);

    }
  }

  // 9. conflict
  if (sections.conflict && s.conflict) {
    ctx.sectionHeading("Conflict", 22, "The pattern");
    if (s.conflict.summary) paragraphs(ctx, nm(s.conflict.summary));
    ctx.y += 2;
    twoColumn(
      ctx,
      "Mitigate",
      nmBlocks(s.conflict.mitigate),
      "Promote healthy",
      nmBlocks(s.conflict.promote_healthy),
      { bulleted: true },
    );
    if (s.conflict.per_person) {
      ctx.checkPageBreak(6);
      twoColumn(
        ctx,
        `${data.firstA}: read + counter-move`,
        [
          { text: nm(s.conflict.per_person.a.read) },
          {
            text: nm(s.conflict.per_person.a.counter_move),
            facets: (s.conflict.per_person.a.facets ?? []).map(nm),
          },
        ],
        `${data.firstB}: read + counter-move`,
        [
          { text: nm(s.conflict.per_person.b.read) },
          {
            text: nm(s.conflict.per_person.b.counter_move),
            facets: (s.conflict.per_person.b.facets ?? []).map(nm),
          },
        ],
        { persons: true },
      );
    }
    safetyCallout(ctx, "If this feels unsafe", nm(s.conflict.safety ?? ""));
  }


  // 9b. leader actions (work mode only)
  if (
    sections.leaderActions &&
    data.mode === "work" &&
    Array.isArray(s.leader_actions) &&
    s.leader_actions.length > 0
  ) {
    ctx.sectionHeading("For the leader", 22, "For the leader");
    for (let i = 0; i < Math.min(3, s.leader_actions.length); i++) {
      const it = s.leader_actions[i];
      ctx.ensureBlockSpace(20);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...NAVY);
      doc.text(`${i + 1}. ${nm(it.headline ?? "")}`, MARGIN_L, ctx.y);
      ctx.y += 5;
      ctx.bodyText(nm(it.detail ?? ""));
      if (it.action) {
        doc.setFont("Poppins", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...NAVY);
        doc.text(nm(it.action), MARGIN_L, ctx.y);
        ctx.y += 5;
      }
      ctx.y += 2;
    }
  }

  // 10. repair (all modes)
  if (sections.repair && s.repair) {
    ctx.sectionHeading("Repair", 22, "The way back");
    if (s.repair.overview) paragraphs(ctx, nm(s.repair.overview));
    ctx.y += 2;
    twoColumn(ctx, data.firstA, nmBlocks(s.repair.a), data.firstB, nmBlocks(s.repair.b), {
      persons: true,
    });
    if (Array.isArray(s.repair.steps) && s.repair.steps.length > 0) {
      numberedSteps(ctx, s.repair.steps, nm);
    }
    safetyCallout(ctx, "If this feels unsafe", nm(s.repair.safety ?? ""));

    if (s.repair.disclaimer) {
      ctx.y += 2;
      doc.setFont("Montserrat", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      const dl = doc.splitTextToSize(nm(s.repair.disclaimer), CONTENT_W);
      for (const l of dl) {
        ctx.checkPageBreak(4);
        doc.text(l, MARGIN_L, ctx.y);
        ctx.y += 4;
      }
    }
  }

  // 11. intimacy (romantic only)
  if (sections.intimacy && data.mode === "romantic" && s.intimacy) {
    ctx.sectionHeading("Intimacy", 22, "Closeness");
    if (s.intimacy.overview) paragraphs(ctx, nm(s.intimacy.overview));
    ctx.y += 2;
    twoColumn(
      ctx,
      data.firstA,
      nmBlocks(s.intimacy.a),
      data.firstB,
      nmBlocks(s.intimacy.b),
      { persons: true },
    );

    if (s.intimacy.disclaimer) {
      doc.setFont("Montserrat", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      const dl = doc.splitTextToSize(nm(s.intimacy.disclaimer), CONTENT_W);
      for (const l of dl) {
        ctx.checkPageBreak(4);
        doc.text(l, MARGIN_L, ctx.y);
        ctx.y += 4;
      }
    }
  }

  // 12. full map (+ chart mode)
  if (sections.fullMap || sections.fullMapCharts) {
    ctx.sectionHeading("The full map", 20, "The full map");
    const buckets: Record<PairShapeKey, PairedFacetForPdf[]> = {
      farApart: [], bothHigh: [], bothLow: [], bothMedium: [], mild: [],
    };
    for (const f of data.fullMap) buckets[pairShapeKey(f.shape, f.stats?.a, f.stats?.b)].push(f);

    for (const k of PAIR_SHAPES) {
      const items = buckets[k];
      if (items.length === 0) continue;
      ctx.ensureBlockSpace(12);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text(PAIR_SHAPE_TITLE[k], MARGIN_L, ctx.y);
      ctx.y += 5;
      if (sections.fullMapCharts) {
        for (const f of items) {
          drawPairDistRow(ctx, { label: facetLabel(f.facetName), a: f.stats?.a ?? null, b: f.stats?.b ?? null });
        }
      } else {
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...BLACK);
        for (const f of items) {
          ctx.checkPageBreak(5);
          doc.text("• " + facetLabel(cleanMarkdown(f.facetName)), MARGIN_L + 3, ctx.y);
          ctx.y += 4.5;
        }
      }
      ctx.y += 3;
    }
  }

  // 13. coach (privileged) — practitioner-only, always starts on a fresh page
  if (sections.coach && s.coach) {
    ctx.addFooter();
    doc.addPage();
    ctx.y = MARGIN_T;
    ctx.sectionHeading("For the practitioner or admin only", 22, "Practitioner only");

    const facetByItem = new Map<number, string>();
    for (const f of data.fullMap) {
      if (f.itemNumber != null && f.facetName) facetByItem.set(f.itemNumber, f.facetName);
    }

    if (Array.isArray(s.coach.why) && s.coach.why.length > 0) {
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      ctx.checkPageBreak(6);
      doc.text("Why these matter", MARGIN_L, ctx.y);
      ctx.y += 5;

      const LBL_H = 3.2;
      const innerX = MARGIN_L + CARD_RULE_W + CARD_PAD;
      const innerW = CONTENT_W - CARD_RULE_W - CARD_PAD * 2;

      for (const w of s.coach.why) {
        const question = cleanMarkdown(data.itemText.get(w.item) ?? `Item ${w.item}`);
        const facet = facetByItem.get(w.item) ?? `Item ${w.item}`;
        const accent = facetColor(facet);

        // The generator emits one rationale string. splitParas gives the same
        // structure the section already rendered as separate paragraphs: the
        // first is the score read, the rest is the reasoning. With a single
        // paragraph there is no clean split, so it all goes under WHY FLAGGED.
        const paras = splitParas(cleanMarkdown(nm(w.rationale)));
        const read = paras.length > 1 ? paras[0] : "";
        const why = paras.length > 1 ? paras.slice(1).join(" ") : (paras[0] ?? "");

        doc.setFont("Poppins", "bold");
        doc.setFontSize(10);
        const titleL: string[] = doc.splitTextToSize(facetLabel(cleanMarkdown(facet)), innerW);
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(8);
        const qL: string[] = doc.splitTextToSize(question, innerW);
        doc.setFontSize(8.5);
        const readL: string[] = read ? doc.splitTextToSize(read, innerW) : [];
        const whyL: string[] = why ? doc.splitTextToSize(why, innerW) : [];
        const chips = chipLayout(doc, [facet], innerW);

        const cardH =
          CARD_PAD +
          titleL.length * 4.8 +
          1.2 +
          LBL_H + qL.length * 3.7 + 1.6 +
          (readL.length > 0 ? LBL_H + readL.length * LH_BODY + 1.6 : 0) +
          (whyL.length > 0 ? LBL_H + whyL.length * LH_BODY + 1.6 : 0) +
          (chips.h > 0 ? chips.h + 0.5 : 0) +
          CARD_PAD;

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

        label("THE ITEM");
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        for (const l of qL) {
          doc.text(l, innerX, y);
          y += 3.7;
        }
        y += 1.6;

        if (readL.length > 0) {
          label("THE READ");
          doc.setFont("Montserrat", "normal");
          doc.setFontSize(BODY_SIZE);
          doc.setTextColor(...BLACK);
          for (const l of readL) {
            doc.text(l, innerX, y);
            y += LH_BODY;
          }
          y += 1.6;
        }
        if (whyL.length > 0) {
          label("WHY FLAGGED");
          doc.setFont("Montserrat", "normal");
          doc.setFontSize(BODY_SIZE);
          doc.setTextColor(...BLACK);
          for (const l of whyL) {
            doc.text(l, innerX, y);
            y += LH_BODY;
          }
          y += 1.6;
        }
        if (chips.h > 0) drawChipRows(doc, chips.rows, innerX, y - 2.6);

        ctx.y = top + cardH + CARD_GAP;
      }
    }

    if (Array.isArray(s.coach.debrief_prompts) && s.coach.debrief_prompts.length > 0) {
      ctx.y += 7;
      ctx.checkPageBreak(12);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text("Debrief prompts", MARGIN_L, ctx.y);
      ctx.y += 6;

      /* two columns, so a short list does not leave a void on the last page */
      const DISC_R = 2.25;
      const gap = 8;
      const colW = (CONTENT_W - gap) / 2;
      const textOff = DISC_R * 2 + 3;
      const prompts = s.coach.debrief_prompts;
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(BODY_SIZE);
      const lines = prompts.map(
        (p) => doc.splitTextToSize(cleanMarkdown(nm(p)), colW - textOff) as string[],
      );
      for (let i = 0; i < prompts.length; i += 2) {
        const rowH =
          Math.max(
            lines[i].length,
            lines[i + 1]?.length ?? 0,
          ) * LH_BODY + 2.5;
        ctx.reserveBlockOrAllow(Math.max(rowH, DISC_R * 2 + 2));
        const top = ctx.y;
        for (let j = i; j < Math.min(i + 2, prompts.length); j++) {
          const x = j % 2 === 0 ? MARGIN_L : MARGIN_L + colW + gap;
          doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
          doc.circle(x + DISC_R, top + DISC_R, DISC_R, "F");
          doc.setFont("Poppins", "bold");
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          doc.text(String(j + 1), x + DISC_R, top + DISC_R + 1.1, { align: "center" });
          doc.setFont("Montserrat", "normal");
          doc.setFontSize(BODY_SIZE);
          doc.setTextColor(...BLACK);
          let ty = top + 3.2;
          for (const l of lines[j]) {
            doc.text(l, x + textOff, ty);
            ty += LH_BODY;
          }
        }
        ctx.y = top + Math.max(rowH, DISC_R * 2 + 2);
      }
    }
  }


  ctx.addFooter();
  stampPageNumbers(doc);

  const today = new Date().toISOString().slice(0, 10);
  doc.save(`BrainWise-Paired-${data.mode}-${today}.pdf`);
  void GRAY; // silence unused
}
