import jsPDF from "jspdf";
import type { PdfSections } from "@/components/results/ExportPdfModal";

interface DimensionRow {
  name: string;
  score: number;
  band: string;
  color: string;
  pastelColor: string;
  dimensionId: string;
}

interface FacetWithInterpretation {
  itemNumber: number;
  facetName: string;
  itemText: string;
  score: number;
  dimensionId: string;
  interpretation: {
    positive_self: string[];
    negative_self: string[];
    positive_others: string[];
    negative_others: string[];
  } | null;
}

interface AssessmentResponse {
  itemNumber: number;
  facetName: string;
  itemText: string;
  score: number;
  dimensionId: string;
  interpretation?: {
    positive_self: string[];
    negative_self: string[];
    positive_others: string[];
    negative_others: string[];
  } | null;
}

export interface PdfData {
  userName: string;
  instrumentName: string;
  instrumentShortName: string;
  instrumentVersion: string;
  dateTaken: string;
  contextLabel: string;
  dimensions: DimensionRow[];
  statCards: { label: string; value: string }[];
  narrativeSections: {
    profile_overview?: string;
    dimension_highlights?: Record<string, string>;
    cross_assessment?: string;
    personal_summary?: string[];
    action_plan?: Array<{
      title: string;
      rationale: string;
      steps: string[];
      dimension_tags: string[];
    }>;
  } | null;
  elevatedFacets: FacetWithInterpretation[];
  suppressedFacets: FacetWithInterpretation[];
  assessmentResponses: AssessmentResponse[];
  recommendations: string[];
  isSliderInstrument: boolean;
  isPTP: boolean;
  fullFacetData: Array<{
    itemNumber: number;
    facetName: string;
    itemText: string;
    score: number;
    dimensionId: string;
    contextType: string | null;
  }>;
  ptpBrainOverviewVariant: "combined" | "professional" | "personal";
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 15;
const MARGIN_R = 15;
const MARGIN_T = 20;
const MARGIN_B = 25;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const FOOTER_Y = PAGE_H - 12;

// Standardized brand navy used for ALL primary text in this PDF.
const PRIMARY_TEXT_HEX = "#021F36";
const NAVY = [2, 31, 54] as const;
const MUTED = [109, 104, 117] as const;
const BLACK = [30, 30, 30] as const;
const SAND_BG = [249, 247, 241] as const;
const NAVY_CIRCLE = [16, 38, 58] as const;       // #10263A — subtle lighter navy
const SAND_CIRCLE = [251, 224, 200] as const;    // #FBE0C8 — pale peach
const LIGHT_BG = [245, 247, 250] as const;
const GREEN = [34, 139, 34] as const;
const RED = [200, 50, 50] as const;
const ORANGE = [245, 116, 26] as const;
const DISCLAIMER_ICON_BG = [255, 230, 210] as const;

// Minimum vertical space (mm) required at the bottom of a page before
// starting a new paragraph or major heading block. If less than this is
// available, force a page break first to avoid widows/orphans.
const MIN_BLOCK_SPACE = 30;

const PTP_BRAIN_OVERVIEW_FULL = `Your brain is constantly scanning for two things: what threatens you, and what rewards you. It does this whether you're aware of it or not, and the answers shape how you respond, what you notice, and what you avoid.

The Personal Threat Profile maps that scanning across five dimensions. Three are about threat — **Protection** (the need to feel safe and secure), **Participation** (the need to belong and be welcomed), and **Prediction** (the need to understand what's happening and what comes next). Two are about reward — **Purpose** (a sense of meaning) and **Pleasure** (the experience of genuine enjoyment).

One principle is worth holding in mind as you read: your brain only fully engages with reward when it feels sufficiently safe. Until the three threat dimensions are adequately met, Purpose and Pleasure stay largely out of reach.

You took the full Personal Threat Profile, covering all five domains across 89 items. What follows shows you where your sensitivities are highest and lowest. The items where you scored very high or very low are the ones most likely to trigger a stress response, and the ones most likely to shape how you behave under pressure. Pay particular attention to those — they are your major drivers.

This report is the starting point, not the conclusion. It doesn't interpret your results for you. That work is yours, ideally with a coach or someone who knows you well. The sections that follow give you a place to begin.`;

const PTP_BRAIN_OVERVIEW_PERSONAL = `Your brain is constantly scanning for two things: what threatens you, and what rewards you. It does this whether you're aware of it or not, and the answers shape how you respond, what you notice, and what you avoid.

The Personal Threat Profile maps that scanning across five dimensions. Three are about threat — **Protection** (the need to feel safe and secure), **Participation** (the need to belong and be welcomed), and **Prediction** (the need to understand what's happening and what comes next). Two are about reward — **Purpose** (a sense of meaning) and **Pleasure** (the experience of genuine enjoyment).

One principle is worth holding in mind as you read: your brain only fully engages with reward when it feels sufficiently safe. Until the three threat dimensions are adequately met, Purpose and Pleasure stay largely out of reach.

You took the personal context of the Personal Threat Profile, covering all five domains across 42 items focused on your life outside work — relationships, identity, meaning, and the experiences that bring you alive. What follows shows you where your sensitivities are highest and lowest. The items where you scored very high or very low are the ones most likely to trigger a stress response, and the ones most likely to shape how you show up in your personal world. Pay particular attention to those — they are your major drivers.

This report is the starting point, not the conclusion. It doesn't interpret your results for you. That work is yours, ideally with a coach or someone who knows you well. The sections that follow give you a place to begin.`;

const PTP_BRAIN_OVERVIEW_PROFESSIONAL = `Your brain is constantly scanning for two things at work: what threatens you, and what rewards you. It does this whether you're aware of it or not, and the answers shape how you respond to colleagues, how you handle pressure, and how you make decisions under stress.

The full Personal Threat Profile maps that scanning across five dimensions — three threats and two rewards. The professional context you took focuses on the three threat dimensions, the ones most likely to surface in workplace settings: **Protection** (the need to feel safe and secure), **Participation** (the need to belong and be welcomed), and **Prediction** (the need to understand what's happening and what comes next).

One principle is worth holding in mind: your brain can only fully engage at work when it feels sufficiently safe in these three areas. When Protection, Participation, or Prediction is activated, your capacity to do your best work narrows.

You took the professional context of the Personal Threat Profile, covering the three threat domains across 47 items. What follows shows you where your sensitivities are highest and lowest. The items where you scored very high or very low are the ones most likely to trigger a stress response at work, and the ones most likely to shape how you behave under pressure. Pay particular attention to those — they are your major drivers.

This report is the starting point, not the conclusion. It doesn't interpret your results for you. That work is yours, ideally with a coach or someone who knows you well. The sections that follow give you a place to begin.`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function cleanMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

function formatBand(band: string): string {
  return band.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function PTP_DIM_COLOR(dimId: string): string {
  const colors: Record<string, string> = {
    "DIM-PTP-01": PRIMARY_TEXT_HEX,
    "DIM-PTP-02": "#006D77",
    "DIM-PTP-03": "#6D6875",
    "DIM-PTP-04": "#3C096C",
    "DIM-PTP-05": "#2D6A4F",
  };
  return colors[dimId] ?? PRIMARY_TEXT_HEX;
}

export async function generateResultsPdf(data: PdfData, sections: PdfSections, options?: { returnBlob?: boolean }): Promise<void | Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { registerPdfFonts } = await import("./pdfFonts");
  registerPdfFonts(doc);
  let y = MARGIN_T;
  let currentSectionTitle: string = "";
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const addFooter = () => {
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont("Montserrat", "normal");
    doc.text(`Generated by BrainWise | ${today} | Confidential`, PAGE_W / 2, FOOTER_Y, { align: "center" });
    doc.setDrawColor(220, 220, 220);
    doc.line(MARGIN_L, FOOTER_Y - 3, PAGE_W - MARGIN_R, FOOTER_Y - 3);
  };

  // Renders a "<SECTION_TITLE> · CONTINUED" header at the top of any page
  // that continues a section from the previous page. Sits in the top-margin
  // gutter without consuming vertical space. No-op if no section is active.
  const renderContinuationHeader = () => {
    if (currentSectionTitle === "") return;
    doc.setFontSize(7.5);
    doc.setFont("Montserrat", "normal");
    doc.setTextColor(...MUTED);
    doc.text(
      `${currentSectionTitle.toUpperCase()} · CONTINUED`,
      MARGIN_L,
      MARGIN_T - 5
    );
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN_B) {
      addFooter();
      doc.addPage();
      y = MARGIN_T;
      renderContinuationHeader();
    }
  };

  // Ensure at least MIN_BLOCK_SPACE mm of room remains before starting a
  // paragraph or major heading block. Prevents single-line widows at the
  // bottom of a page.
  const ensureBlockSpace = (needed: number = MIN_BLOCK_SPACE) => {
    if (y + needed > PAGE_H - MARGIN_B) {
      addFooter();
      doc.addPage();
      y = MARGIN_T;
      renderContinuationHeader();
    }
  };

  const atTopOfPage = () => y <= MARGIN_T + 5;

  const sectionHeading = (title: string, firstContentHeight?: number) => {
    // Suppress the continuation header during the heading's own page-break
    // reservation: the new page is about to render a full section heading,
    // not a continuation of the prior section.
    currentSectionTitle = "";
    // When firstContentHeight is provided, reserve heading + first content
    // together so the heading doesn't orphan at the bottom of a page.
    const headingBlockH = 10;
    const reserveH = firstContentHeight != null
      ? Math.max(MIN_BLOCK_SPACE, headingBlockH + firstContentHeight)
      : MIN_BLOCK_SPACE;
    ensureBlockSpace(reserveH);
    currentSectionTitle = title;
    if (!atTopOfPage()) y += 4;
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.setFont("Poppins", "bold");
    doc.text(title, MARGIN_L, y);
    y += 2;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
    y += 6;
  };

  const bodyText = (text: string, indent = 0) => {
    doc.setFontSize(8.5);
    doc.setFont("Montserrat", "normal");
    doc.setTextColor(...BLACK);
    const lines = doc.splitTextToSize(cleanMarkdown(text), CONTENT_W - indent);
    // Widow protection: if not enough room for at least 3 lines (~14mm),
    // jump to next page before starting the paragraph.
    if (lines.length > 1) ensureBlockSpace(Math.min(MIN_BLOCK_SPACE, lines.length * 4.5 + 4));
    for (const line of lines) {
      checkPageBreak(5);
      doc.text(line, MARGIN_L + indent, y);
      y += 4.5;
    }
  };

  // ── COVER PAGE ──
  // Fetch logo as base64 data URL so jsPDF can embed it
  const logoDataUrl = await (async () => {
    try {
      const res = await fetch("/logo-orange-white.png");
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  })();

  // Top half: navy block
  const NAVY_BLOCK_H = 150;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, NAVY_BLOCK_H, "F");

  // Decorative background circles — navy block (drawn behind all foreground content)
  doc.setFillColor(...NAVY_CIRCLE);
  doc.circle(195, 25, 28, "F");
  doc.circle(220, 80, 22, "F");
  doc.circle(165, 45, 10, "F");
  doc.circle(200, 130, 18, "F");
  doc.circle(140, 15, 8, "F");
  doc.circle(175, 105, 6, "F");

  // Logo (raster, fetched at runtime). If the fetch failed, fall back to text wordmark.
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", MARGIN_L, 18, 50, 0, undefined, "FAST");
  } else {
    doc.setFont("Poppins", "extrabold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("BrainWise Enterprises", MARGIN_L, 35);
  }

  // "ASSESSMENT REPORT" eyebrow
  doc.setFont("Montserrat", "semibold");
  doc.setFontSize(10);
  doc.setTextColor(...ORANGE);
  doc.setCharSpace(1.5);
  doc.text("ASSESSMENT REPORT", MARGIN_L, 72);
  doc.setCharSpace(0);

  // Headline "Personal Threat Profile™" — Poppins ExtraBold, white, large
  doc.setFont("Poppins", "extrabold");
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text("Personal Threat", MARGIN_L, 88);
  doc.text("Profile", MARGIN_L, 105);
  const profileWidth = doc.getTextWidth("Profile");
  doc.setTextColor(...ORANGE);
  doc.setFontSize(20);
  doc.text("™", MARGIN_L + profileWidth + 1, 98);
  doc.setTextColor(255, 255, 255);

  // Description paragraph
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(10);
  doc.setTextColor(220, 230, 240);
  const descText = "A neuroscience-based profile of how you respond to pressure, uncertainty, and change — mapped to the BrainWise 5P model.";
  const descLines = doc.splitTextToSize(descText, CONTENT_W - 60);
  doc.text(descLines, MARGIN_L, 120);

  // Context pill
  const contextLabel = (data.contextLabel || "Full").toUpperCase() + " CONTEXT";
  doc.setFont("Montserrat", "semibold");
  doc.setFontSize(9);
  const pillTextWidth = doc.getTextWidth(contextLabel);
  const pillW = pillTextWidth + 18;
  const pillH = 9;
  const pillY = 138;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.5);
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN_L, pillY, pillW, pillH, pillH / 2, pillH / 2, "FD");
  doc.setFillColor(...ORANGE);
  doc.circle(MARGIN_L + 5, pillY + pillH / 2, 1.3, "F");
  doc.setTextColor(...ORANGE);
  doc.text(contextLabel, MARGIN_L + 10, pillY + pillH / 2 + 1.2);

  // Bottom half: sand background
  doc.setFillColor(...SAND_BG);
  doc.rect(0, NAVY_BLOCK_H, PAGE_W, PAGE_H - NAVY_BLOCK_H, "F");

  // Decorative background circles — sand block (drawn behind all foreground content)
  doc.setFillColor(...SAND_CIRCLE);
  doc.circle(-5, 175, 22, "F");
  doc.circle(15, 235, 16, "F");
  doc.circle(40, 200, 8, "F");
  doc.circle(8, 270, 12, "F");
  doc.circle(60, 250, 6, "F");


  // Field row 1: Participant + Date Completed
  const fieldY = NAVY_BLOCK_H + 14;
  const fieldColW = (CONTENT_W - 10) / 2;

  doc.setFont("Montserrat", "semibold");
  doc.setFontSize(8);
  doc.setTextColor(...ORANGE);
  doc.setCharSpace(1);
  doc.text("PARTICIPANT", MARGIN_L, fieldY);
  doc.text("DATE COMPLETED", MARGIN_L + fieldColW + 10, fieldY);
  doc.setCharSpace(0);

  doc.setFont("Poppins", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(data.userName, MARGIN_L, fieldY + 9);
  doc.text(data.dateTaken, MARGIN_L + fieldColW + 10, fieldY + 9);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, fieldY + 13, MARGIN_L + fieldColW, fieldY + 13);
  doc.line(MARGIN_L + fieldColW + 10, fieldY + 13, MARGIN_L + CONTENT_W, fieldY + 13);

  // Field row 2: Instrument Version
  const versionY = fieldY + 28;
  doc.setFont("Montserrat", "semibold");
  doc.setFontSize(8);
  doc.setTextColor(...ORANGE);
  doc.setCharSpace(1);
  doc.text("INSTRUMENT VERSION", MARGIN_L, versionY);
  doc.setCharSpace(0);

  doc.setFont("Poppins", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(data.instrumentVersion, MARGIN_L, versionY + 9);
  doc.line(MARGIN_L, versionY + 13, MARGIN_L + CONTENT_W, versionY + 13);

  // Disclaimer card
  const disclaimerY = versionY + 28;
  const disclaimerText = "This report is generated by an AI model and is intended for personal reflection only. It does not constitute a clinical diagnosis or professional psychological advice. Results should be interpreted in conjunction with qualified professional guidance.";
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  const disclaimerLines = doc.splitTextToSize(disclaimerText, CONTENT_W - 20);
  const disclaimerH = disclaimerLines.length * 4.5 + 18;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(225, 220, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_L, disclaimerY, CONTENT_W, disclaimerH, 3, 3, "FD");

  doc.setFillColor(...DISCLAIMER_ICON_BG);
  doc.circle(MARGIN_L + 9, disclaimerY + 9, 4, "F");
  doc.setFont("Poppins", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ORANGE);
  doc.text("i", MARGIN_L + 9, disclaimerY + 10.5, { align: "center" });

  doc.setFont("Montserrat", "semibold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.setCharSpace(0.5);
  doc.text("IMPORTANT — PLEASE READ", MARGIN_L + 16, disclaimerY + 10);
  doc.setCharSpace(0);

  doc.setFont("Montserrat", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(disclaimerLines, MARGIN_L + 6, disclaimerY + 18);

  // Footer
  const footerCoverY = PAGE_H - 22;
  doc.setFont("Montserrat", "semibold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.setCharSpace(0.8);
  doc.text("GENERATED BY BRAINWISE ENTERPRISES, LLC", MARGIN_L, footerCoverY);
  doc.setCharSpace(0);

  doc.setFont("Montserrat", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const dateRight = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
  doc.text(dateRight, PAGE_W - MARGIN_R, footerCoverY, { align: "right" });

  doc.setFont("Montserrat", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  const copyText = `© ${new Date().getFullYear()} BrainWise Enterprises. Confidential and proprietary. Shared with the named recipient for evaluation only; not to be reproduced or disclosed without written consent. The Personal Threat Profile™ and 5P model are the property of BrainWise Enterprises.`;
  const copyLines = doc.splitTextToSize(copyText, CONTENT_W);
  doc.text(copyLines, MARGIN_L, footerCoverY + 5);

  doc.addPage();
  y = MARGIN_T;

  // ── PTP AND BRAIN OVERVIEW ──
  if (sections.ptpBrainOverview) {
    sectionHeading("PTP and Brain Overview");

    // Pick the right variant
    const variant = data.ptpBrainOverviewVariant;
    const overviewText =
      variant === "professional"
        ? PTP_BRAIN_OVERVIEW_PROFESSIONAL
        : variant === "personal"
        ? PTP_BRAIN_OVERVIEW_PERSONAL
        : PTP_BRAIN_OVERVIEW_FULL;

    // Render as multi-paragraph body text. Bold markers (**...**) are stripped
    // by cleanMarkdown for now — inline bold rendering is deferred to a later pass.
    const paragraphs = overviewText.split("\n\n").filter((p) => p.trim().length > 0);
    for (let i = 0; i < paragraphs.length; i++) {
      bodyText(paragraphs[i]);
      if (i < paragraphs.length - 1) y += 2;
    }
  }

  // ── PROFILE OVERVIEW ──
  if (sections.profileOverview) {
    sectionHeading("Profile Overview");

    const cardW = (CONTENT_W - 6) / 3;
    data.statCards.forEach((card, i) => {
      const x = MARGIN_L + i * (cardW + 3);
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(x, y, cardW, 14, 1.5, 1.5, "F");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(card.label, x + 3, y + 5);
      doc.setFontSize(9);
      doc.setTextColor(...BLACK);
      doc.setFont("Montserrat", "semibold");
      const maxValW = cardW - 6;
      let truncVal = card.value;
      while (doc.getTextWidth(truncVal) > maxValW && truncVal.length > 5) {
        truncVal = truncVal.slice(0, -2);
      }
      if (truncVal !== card.value) truncVal += "…";
      doc.text(truncVal, x + 3, y + 11);
      doc.setFont("Montserrat", "normal");
    });
    y += 20;

    if (data.isPTP && data.dimensions.length > 0) {
      checkPageBreak(40);
      const dimCardW = (CONTENT_W - (data.dimensions.length - 1) * 3) / data.dimensions.length;
      data.dimensions.forEach((dim, i) => {
        const x = MARGIN_L + i * (dimCardW + 3);
        const rgb = hexToRgb(dim.color);
        const pastelRgb = hexToRgb(dim.pastelColor);
        doc.setFillColor(pastelRgb[0], pastelRgb[1], pastelRgb[2]);
        doc.roundedRect(x, y, dimCardW, 30, 2, 2, "F");
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.circle(x + dimCardW / 2, y + 5, 2, "F");
        doc.setFontSize(7);
        doc.setTextColor(...BLACK);
        doc.setFont("Montserrat", "semibold");
        const nameLines = doc.splitTextToSize(dim.name, dimCardW - 4);
        doc.text(nameLines[0], x + dimCardW / 2, y + 11, { align: "center" });
        if (nameLines[1]) doc.text(nameLines[1], x + dimCardW / 2, y + 15, { align: "center" });
        doc.setFontSize(14);
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        doc.setFont("Poppins", "bold");
        doc.text(String(dim.score), x + dimCardW / 2, y + 23, { align: "center" });
        doc.setFontSize(6.5);
        doc.setTextColor(...MUTED);
        doc.setFont("Montserrat", "normal");
        doc.text(formatBand(dim.band), x + dimCardW / 2, y + 28, { align: "center" });
      });
      y += 36;
    }
  }

  // ── PROFILE OVERVIEW NARRATIVE ──
  if (sections.profileOverviewNarrative && data.narrativeSections?.profile_overview) {
    sectionHeading("Profile Overview Narrative");
    bodyText(data.narrativeSections.profile_overview);
    y += 4;
  }

  // ── WHAT DOES THIS MEAN TO ME? ──
  if (
    sections.whatThisMeans &&
    Array.isArray(data.narrativeSections?.personal_summary) &&
    data.narrativeSections!.personal_summary!.length > 0
  ) {
    const items = data.narrativeSections!.personal_summary!;
    sectionHeading("What does this mean to me?");

    const badgeRadius = 4;
    const badgeColumn = badgeRadius * 2 + 4;
    const textX = MARGIN_L + badgeColumn;
    const textW = CONTENT_W - badgeColumn;

    for (let i = 0; i < items.length; i++) {
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(cleanMarkdown(items[i]), textW);
      const blockHeight = lines.length * 4.5 + 4;
      checkPageBreak(blockHeight);

      const badgeCenterY = y + badgeRadius;
      doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.circle(MARGIN_L + badgeRadius, badgeCenterY, badgeRadius, "F");
      doc.setFont("Montserrat", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(String(i + 1), MARGIN_L + badgeRadius, badgeCenterY + 1.3, { align: "center" });

      doc.setFont("Montserrat", "normal");
      doc.setFontSize(10);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.text(lines, textX, y + badgeRadius + 1);

      y += blockHeight;
    }
    y += 4;
  }

  // ── ACTION PLAN ──
  if (
    sections.actionPlan &&
    Array.isArray(data.narrativeSections?.action_plan) &&
    data.narrativeSections!.action_plan!.length > 0
  ) {
    const items = data.narrativeSections!.action_plan!;
    const dimNameById = new Map(data.dimensions.map((d) => [d.dimensionId, d.name]));

    // Pre-compute first item's cardHeight for orphan-prevention.
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(9);
    const firstItem = items[0];
    const firstRationaleLines = doc.splitTextToSize(cleanMarkdown(firstItem.rationale ?? ""), CONTENT_W - 8);
    const firstRationaleHeight = firstRationaleLines.length * 4.2 + 2;
    const firstStepsArr = Array.isArray(firstItem.steps) ? firstItem.steps : [];
    const firstStepsHeight = firstStepsArr.reduce((acc, step) => {
      const stepLines = doc.splitTextToSize(cleanMarkdown(step), CONTENT_W - 16);
      return acc + stepLines.length * 4.2 + 1;
    }, 4);
    const firstPillsHeight = (Array.isArray(firstItem.dimension_tags) && firstItem.dimension_tags.length > 0) ? 7 : 0;
    const firstCardHeight = 8 + 6 + firstPillsHeight + firstRationaleHeight + firstStepsHeight + 6;

    sectionHeading("Action Plan", firstCardHeight);


    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      doc.setFont("Montserrat", "normal");
      doc.setFontSize(9);
      const rationaleLines = doc.splitTextToSize(cleanMarkdown(item.rationale ?? ""), CONTENT_W - 8);
      const rationaleHeight = rationaleLines.length * 4.2 + 2;
      const stepsArr = Array.isArray(item.steps) ? item.steps : [];
      const stepsHeight = stepsArr.reduce((acc, step) => {
        const stepLines = doc.splitTextToSize(cleanMarkdown(step), CONTENT_W - 16);
        return acc + stepLines.length * 4.2 + 1;
      }, 4);
      const pillsHeight = (Array.isArray(item.dimension_tags) && item.dimension_tags.length > 0) ? 7 : 0;
      const titleHeight = 6;
      const cardHeight = 8 + titleHeight + pillsHeight + rationaleHeight + stepsHeight + 6;

      checkPageBreak(cardHeight + 4);

      const cardTop = y;

      doc.setFillColor(SAND_BG[0], SAND_BG[1], SAND_BG[2]);
      doc.setDrawColor(225, 220, 210);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN_L, cardTop, CONTENT_W, cardHeight, 2, 2, "FD");

      let innerY = cardTop + 6;
      const innerX = MARGIN_L + 4;
      const innerW = CONTENT_W - 8;

      // Dimension pills
      if (Array.isArray(item.dimension_tags) && item.dimension_tags.length > 0) {
        let pillX = innerX;
        doc.setFont("Montserrat", "semibold");
        doc.setFontSize(7);
        for (const tag of item.dimension_tags) {
          const tagText = (dimNameById.get(tag) ?? tag).toUpperCase();
          const tagWidth = doc.getTextWidth(tagText) + 6;
          const dimHex = PTP_DIM_COLOR(tag);
          const [r, g, b] = hexToRgb(dimHex);
          doc.setFillColor(r, g, b);
          doc.roundedRect(pillX, innerY - 4, tagWidth, 5, 2.5, 2.5, "F");
          doc.setTextColor(255, 255, 255);
          doc.text(tagText, pillX + tagWidth / 2, innerY - 0.5, { align: "center" });
          pillX += tagWidth + 3;
        }
        innerY += 3;
      }

      // Title
      doc.setFont("Poppins", "bold");
      doc.setFontSize(11);
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text(cleanMarkdown(item.title ?? ""), innerX, innerY);
      innerY += 5.5;

      // Rationale
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(9);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.text(rationaleLines, innerX, innerY);
      innerY += rationaleLines.length * 4.2 + 3;

      // Steps
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(9);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      for (let s = 0; s < stepsArr.length; s++) {
        const stepLines = doc.splitTextToSize(cleanMarkdown(stepsArr[s]), innerW - 8);
        doc.setFont("Montserrat", "semibold");
        doc.text(`${s + 1}.`, innerX, innerY);
        doc.setFont("Montserrat", "normal");
        doc.text(stepLines, innerX + 6, innerY);
        innerY += stepLines.length * 4.2 + 1;
      }

      y = cardTop + cardHeight + 4;
    }
  }



  // ── DIMENSION HIGHLIGHTS ──
  if (sections.dimensionHighlights && data.narrativeSections?.dimension_highlights) {
    // Pre-compute first non-empty card's height for orphan-prevention.
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(8);
    let firstCardH: number | undefined;
    for (const dim of data.dimensions) {
      const text = data.narrativeSections.dimension_highlights[dim.dimensionId];
      if (!text) continue;
      const textLines = doc.splitTextToSize(cleanMarkdown(text), CONTENT_W - 12);
      firstCardH = textLines.length * 4.5 + 14;
      break;
    }
    sectionHeading("Dimension Highlights", firstCardH);
    for (const dim of data.dimensions) {
      const text = data.narrativeSections.dimension_highlights[dim.dimensionId];
      if (!text) continue;
      const rgb = hexToRgb(dim.color);
      const pastelRgb = hexToRgb(dim.pastelColor);
      const textLines = doc.splitTextToSize(cleanMarkdown(text), CONTENT_W - 12);
      const cardH = textLines.length * 4.5 + 14;
      checkPageBreak(cardH + 4);
      doc.setFillColor(pastelRgb[0], pastelRgb[1], pastelRgb[2]);
      doc.roundedRect(MARGIN_L, y, CONTENT_W, cardH, 2, 2, "F");
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(MARGIN_L, y, 3, cardH, "F");
      doc.setFontSize(9);
      doc.setFont("Poppins", "semibold");
      doc.setTextColor(...BLACK);
      doc.text(`${dim.name} — ${dim.score}`, MARGIN_L + 7.5, y + 7);
      doc.setFontSize(8);
      doc.setFont("Montserrat", "normal");
      doc.setTextColor(...MUTED);
      doc.text(textLines, MARGIN_L + 7.5, y + 13);
      y += cardH + 4;
    }
    y += 2;
  }

  // ── DRIVING FACET SCORES ──
  if (sections.drivingFacetScores && (data.elevatedFacets.length > 0 || data.suppressedFacets.length > 0)) {
    sectionHeading("Driving Facet Scores", 18);

    const renderFacetScoreTable = (title: string, facets: FacetWithInterpretation[]) => {
      checkPageBreak(12 + facets.length * 7);
      doc.setFontSize(9);
      doc.setFont("Poppins", "semibold");
      doc.setTextColor(...BLACK);
      doc.text(title, MARGIN_L, y);
      y += 5;
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text("Facet", MARGIN_L, y);
      doc.text("Score", MARGIN_L + CONTENT_W * 0.82, y);
      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
      y += 4;
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(8);
      const facetNameMaxW = CONTENT_W * 0.82 - 10;
      for (let i = 0; i < facets.length; i++) {
        checkPageBreak(7);
        const f = facets[i];
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 252);
          doc.rect(MARGIN_L, y - 1, CONTENT_W, 6, "F");
        }
        const rgb = hexToRgb(PTP_DIM_COLOR(f.dimensionId));
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.circle(MARGIN_L + 2, y - 1, 1.5, "F");
        const fullName = f.facetName || f.itemText || "—";
        let truncName = fullName;
        while (doc.getTextWidth(truncName) > facetNameMaxW && truncName.length > 5) {
          truncName = truncName.slice(0, -2);
        }
        if (truncName !== fullName) truncName += "…";
        doc.setTextColor(...BLACK);
        doc.text(truncName, MARGIN_L + 6, y);
        doc.text(String(f.score), MARGIN_L + CONTENT_W * 0.82, y);
        y += 6;
      }
      y += 6;
    };

    if (data.elevatedFacets.length > 0) renderFacetScoreTable("Elevated Facets", data.elevatedFacets);
    if (data.suppressedFacets.length > 0) renderFacetScoreTable("Suppressed Facets", data.suppressedFacets);
  }

  // ── DRIVING FACET INSIGHTS (shared renderer, used by Elevated + Suppressed blocks) ──
  const renderFacetInsights = (title: string, facets: FacetWithInterpretation[]) => {
    if (!facets.length) return;
    // title param retained for caller compatibility; the inner sub-heading is no
    // longer rendered — the section heading already conveys this context.
    void title;
    checkPageBreak(40);

    for (const f of facets) {
      const rgb = hexToRgb(PTP_DIM_COLOR(f.dimensionId));

      // Estimate total height of this facet block before rendering
      const selfItemsEst = [
        ...(f.interpretation?.positive_self ?? []),
        ...(f.interpretation?.negative_self ?? []),
      ];
      const othersItemsEst = [
        ...(f.interpretation?.positive_others ?? []),
        ...(f.interpretation?.negative_others ?? []),
      ];
      const impactRowsEst = Math.max(selfItemsEst.length, othersItemsEst.length);
      const estimatedBlockH = 15 + 5 + impactRowsEst * 12 + 6;
      ensureBlockSpace(Math.max(MIN_BLOCK_SPACE, Math.min(estimatedBlockH, 80)));
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(MARGIN_L, y, 1.5, 12, "F");
      doc.setFontSize(9);
      doc.setFont("Poppins", "semibold");
      doc.setTextColor(...BLACK);
      doc.text(f.facetName, MARGIN_L + 5, y + 5);
      doc.setFontSize(7.5);
      doc.setFont("Montserrat", "normal");
      doc.setTextColor(...MUTED);
      const qLines = doc.splitTextToSize(f.itemText, CONTENT_W - 20);
      doc.text(qLines[0] ?? "", MARGIN_L + 5, y + 10);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(MARGIN_L + CONTENT_W - 12, y + 2, 12, 8, 1, 1, "F");
      doc.setFontSize(8);
      doc.setFont("Montserrat", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(String(f.score), MARGIN_L + CONTENT_W - 6, y + 7, { align: "center" });
      y += 15;

      // Null-interpretation guard: render card only, skip impact lists silently.
      if (!f.interpretation) {
        y += 6;
        continue;
      }

      const colW = (CONTENT_W - 4) / 2;

      // Estimate total height of all impact rows for this facet
      const selfItemsAll = [
        ...f.interpretation.positive_self.map(t => t),
        ...f.interpretation.negative_self.map(t => t),
      ];
      const othersItemsAll = [
        ...f.interpretation.positive_others.map(t => t),
        ...f.interpretation.negative_others.map(t => t),
      ];
      const maxRowsAll = Math.max(selfItemsAll.length, othersItemsAll.length);
      const estimatedImpactH = 5 + maxRowsAll * 14;
      checkPageBreak(estimatedImpactH);

      doc.setFontSize(7.5);
      doc.setFont("Montserrat", "semibold");
      doc.setTextColor(...NAVY);
      doc.text("Impact on self", MARGIN_L, y);
      doc.text("Impact on others", MARGIN_L + colW + 4, y);
      y += 5;

      const selfItems = [
        ...f.interpretation.positive_self.map((t) => ({ text: t, positive: true })),
        ...f.interpretation.negative_self.map((t) => ({ text: t, positive: false })),
      ];
      const othersItems = [
        ...f.interpretation.positive_others.map((t) => ({ text: t, positive: true })),
        ...f.interpretation.negative_others.map((t) => ({ text: t, positive: false })),
      ];
      const maxItems = Math.max(selfItems.length, othersItems.length);

      for (let i = 0; i < maxItems; i++) {
        const selfItem = selfItems[i];
        const othersItem = othersItems[i];
        const selfLines = selfItem ? doc.splitTextToSize(cleanMarkdown(selfItem.text), colW - 6) : [];
        const othersLines = othersItem ? doc.splitTextToSize(cleanMarkdown(othersItem.text), colW - 6) : [];
        const rowH = Math.max(selfLines.length, othersLines.length) * 4 + 3;
        checkPageBreak(rowH + 2);

        if (selfItem) {
          doc.setFontSize(8);
          doc.setFont("Montserrat", "bold");
          doc.setTextColor(selfItem.positive ? GREEN[0] : RED[0], selfItem.positive ? GREEN[1] : RED[1], selfItem.positive ? GREEN[2] : RED[2]);
          doc.text(selfItem.positive ? "+" : "-", MARGIN_L, y + 3);
          doc.setFont("Montserrat", "normal");
          doc.setTextColor(...BLACK);
          doc.text(selfLines, MARGIN_L + 5, y + 3);
        }

        if (othersItem) {
          doc.setFontSize(8);
          doc.setFont("Montserrat", "bold");
          doc.setTextColor(othersItem.positive ? GREEN[0] : RED[0], othersItem.positive ? GREEN[1] : RED[1], othersItem.positive ? GREEN[2] : RED[2]);
          doc.text(othersItem.positive ? "+" : "-", MARGIN_L + colW + 4, y + 3);
          doc.setFont("Montserrat", "normal");
          doc.setTextColor(...BLACK);
          doc.text(othersLines, MARGIN_L + colW + 9, y + 3);
        }

        y += rowH;
      }
      y += 6;
    }
  };

  // ── DRIVING FACET INSIGHTS — ELEVATED ──
  if (sections.drivingFacetInsightsElevated && data.elevatedFacets.length > 0) {
    addFooter();
    doc.addPage();
    y = MARGIN_T;
    sectionHeading("Driving Facet Insights — Elevated");
    renderFacetInsights("Elevated Facets", data.elevatedFacets);
  }

  // ── DRIVING FACET INSIGHTS — SUPPRESSED ──
  if (sections.drivingFacetInsightsSuppressed && data.suppressedFacets.length > 0) {
    addFooter();
    doc.addPage();
    y = MARGIN_T;
    sectionHeading("Driving Facet Insights — Suppressed");
    renderFacetInsights("Suppressed Facets", data.suppressedFacets);
  }

  // ── CROSS-ASSESSMENT CONNECTIONS ──
  if (sections.crossAssessmentConnections && data.narrativeSections?.cross_assessment) {
    sectionHeading("Cross-Assessment Connections");
    bodyText(data.narrativeSections.cross_assessment);
    y += 4;
  }

  // ── FULL FACET CHARTS ──
  if (sections.fullFacetCharts && data.fullFacetData.length > 0) {
    const isProfessional = data.ptpBrainOverviewVariant === "professional";

    const renderFacetBarChart = (
      chartTitle: string,
      facets: typeof data.fullFacetData,
    ) => {
      if (facets.length === 0) return;

      addFooter();
      doc.addPage();
      y = MARGIN_T;
      sectionHeading(`Full Facet Charts — ${chartTitle}`);

      const sorted = [...facets].sort((a, b) => b.score - a.score);

      const chartStartY = y + 2;
      const chartEndY = PAGE_H - MARGIN_B - 8;
      const availableHeight = chartEndY - chartStartY;
      const rowCount = sorted.length;
      const rowHeight = Math.max(3.2, Math.min(7, availableHeight / rowCount));

      const facetNameWidth = 75;
      const barStartX = MARGIN_L + facetNameWidth + 2;
      const scoreLabelWidth = 8;
      const barMaxWidth = CONTENT_W - facetNameWidth - 2 - scoreLabelWidth - 2;

      // Grid lines at 0/25/50/75/100
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      for (let pct = 0; pct <= 100; pct += 25) {
        const x = barStartX + (pct / 100) * barMaxWidth;
        doc.line(x, chartStartY, x, chartEndY);
      }

      // Scale labels
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      for (let pct = 0; pct <= 100; pct += 25) {
        const x = barStartX + (pct / 100) * barMaxWidth;
        doc.text(String(pct), x, chartStartY - 1, { align: "center" });
      }

      for (let i = 0; i < sorted.length; i++) {
        const f = sorted[i];
        const rowY = chartStartY + i * rowHeight + rowHeight / 2;
        const fontSize = Math.min(8, Math.max(5.5, rowHeight - 1.5));

        // Facet name — pixel-width truncation
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(fontSize);
        doc.setTextColor(...NAVY);
        const fullName = f.facetName || f.itemText || "—";
        let displayName = fullName;
        while (
          doc.getTextWidth(displayName) > facetNameWidth - 1 &&
          displayName.length > 5
        ) {
          displayName = displayName.slice(0, -2);
        }
        if (displayName !== fullName) displayName += "…";
        doc.text(displayName, barStartX - 2, rowY + fontSize / 4, { align: "right" });

        // Bar
        const [r, g, b] = hexToRgb(PTP_DIM_COLOR(f.dimensionId));
        doc.setFillColor(r, g, b);
        const barWidth = (f.score / 100) * barMaxWidth;
        const barY = rowY - rowHeight / 2 + 0.5;
        const barH = rowHeight - 1;
        doc.rect(barStartX, barY, Math.max(0.5, barWidth), barH, "F");

        // Score label — 1mm right of actual bar end
        doc.setFont("Poppins", "bold");
        doc.setFontSize(fontSize);
        doc.setTextColor(...NAVY);
        doc.text(String(f.score), barStartX + barWidth + 1, rowY + fontSize / 4);
      }
    };

    renderFacetBarChart("All Facets", data.fullFacetData);

    if (!isProfessional) {
      const threatDims = new Set(["DIM-PTP-01", "DIM-PTP-02", "DIM-PTP-03"]);
      const rewardDims = new Set(["DIM-PTP-04", "DIM-PTP-05"]);
      const threatFacets = data.fullFacetData.filter((f) => threatDims.has(f.dimensionId));
      const rewardFacets = data.fullFacetData.filter((f) => rewardDims.has(f.dimensionId));
      renderFacetBarChart("Threat Facets", threatFacets);
      renderFacetBarChart("Reward Facets", rewardFacets);
    }
  }


  // ── ASSESSMENT RESPONSES ──
  if (sections.assessmentResponses && data.assessmentResponses.length > 0) {
    sectionHeading("Assessment Responses");
    const contextNote = data.contextLabel
      ? `${data.assessmentResponses.length} responses — ${data.contextLabel} context`
      : `${data.assessmentResponses.length} responses`;
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(contextNote, MARGIN_L, y);
    y += 6;

    for (const r of data.assessmentResponses) {
      const rgb = hexToRgb(PTP_DIM_COLOR(r.dimensionId));
      const labelText = `Q${r.itemNumber} — ${r.facetName}`;
      const questionLines = doc.splitTextToSize(r.itemText, CONTENT_W - 20);
      const rowH = questionLines.length * 4 + 8;
      checkPageBreak(rowH + 2);

      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(MARGIN_L, y, 1.5, rowH, "F");

      doc.setFontSize(8);
      doc.setFont("Montserrat", "semibold");
      doc.setTextColor(...BLACK);
      doc.text(labelText, MARGIN_L + 5, y + 5);

      doc.setFontSize(7.5);
      doc.setFont("Montserrat", "normal");
      doc.setTextColor(...MUTED);
      doc.text(questionLines, MARGIN_L + 5, y + 10);

      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(MARGIN_L + CONTENT_W - 12, y + rowH / 2 - 4, 12, 8, 1, 1, "F");
      doc.setFontSize(8);
      doc.setFont("Montserrat", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(String(r.score), MARGIN_L + CONTENT_W - 6, y + rowH / 2 + 1, { align: "center" });

      doc.setDrawColor(230, 230, 230);
      doc.line(MARGIN_L, y + rowH, MARGIN_L + CONTENT_W, y + rowH);
      y += rowH + 1;

      // C2: Optional inline facet insights expansion (PTP only; gated by per-row interpretation)
      if (sections.assessmentResponsesIncludeInsights && r.interpretation) {
        const interp = r.interpretation;
        const hasContent =
          interp.positive_self.length > 0 ||
          interp.negative_self.length > 0 ||
          interp.positive_others.length > 0 ||
          interp.negative_others.length > 0;

        if (hasContent) {
          y += 1;

          const colGap = 4;
          const colW = (CONTENT_W - colGap) / 2;
          const leftX = MARGIN_L;
          const rightX = MARGIN_L + colW + colGap;
          const textIndent = 5;

          // Set the font once — used by splitTextToSize measurements below
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);

          const drawCheck = (cx: number, cy: number) => {
            doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
            doc.circle(cx, cy, 1.6, "F");
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.5);
            doc.line(cx - 0.9, cy + 0.1, cx - 0.2, cy + 0.8);
            doc.line(cx - 0.2, cy + 0.8, cx + 1.0, cy - 0.6);
          };
          const drawCross = (cx: number, cy: number) => {
            doc.setFillColor(RED[0], RED[1], RED[2]);
            doc.circle(cx, cy, 1.6, "F");
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.5);
            doc.line(cx - 0.8, cy - 0.8, cx + 0.8, cy + 0.8);
            doc.line(cx - 0.8, cy + 0.8, cx + 0.8, cy - 0.8);
          };

          type BulletRow = { isPositive: boolean; lines: string[]; height: number };

          const buildColumn = (positives: string[], negatives: string[], width: number): BulletRow[] => {
            const rows: BulletRow[] = [];
            for (const item of positives) {
              const lines = doc.splitTextToSize(cleanMarkdown(item), width - textIndent) as string[];
              rows.push({ isPositive: true, lines, height: lines.length * 3.5 + 1 });
            }
            for (const item of negatives) {
              const lines = doc.splitTextToSize(cleanMarkdown(item), width - textIndent) as string[];
              rows.push({ isPositive: false, lines, height: lines.length * 3.5 + 1 });
            }
            return rows;
          };

          const leftRows = buildColumn(interp.positive_self, interp.negative_self, colW);
          const rightRows = buildColumn(interp.positive_others, interp.negative_others, colW);

          const totalRows = Math.max(leftRows.length, rightRows.length);

          // Headers — page-break together with first row so they don't orphan
          const firstRowMaxH = Math.max(leftRows[0]?.height ?? 0, rightRows[0]?.height ?? 0);
          checkPageBreak(4 + firstRowMaxH);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
          doc.text("Impact on self", leftX, y);
          doc.text("Impact on others", rightX, y);
          y += 4;

          // Render rows in lockstep
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

          for (let i = 0; i < totalRows; i++) {
            const left = leftRows[i];
            const right = rightRows[i];
            const rowH = Math.max(left?.height ?? 0, right?.height ?? 0);

            checkPageBreak(rowH);

            if (left) {
              if (left.isPositive) drawCheck(leftX + 1.5, y + 1.5);
              else drawCross(leftX + 1.5, y + 1.5);
              doc.text(left.lines, leftX + textIndent, y + 2);
            }

            if (right) {
              if (right.isPositive) drawCheck(rightX + 1.5, y + 1.5);
              else drawCross(rightX + 1.5, y + 1.5);
              doc.text(right.lines, rightX + textIndent, y + 2);
            }

            y += rowH;
          }

          y += 2;
        }
      }
    }
  }

  addFooter();

  // Stamp "Page X of Y" on every content page (skip the cover at page 1).
  const totalPages = doc.getNumberOfPages();
  const contentTotalPages = totalPages - 1;
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`Page ${p - 1} of ${contentTotalPages}`, PAGE_W - MARGIN_R, FOOTER_Y, { align: "right" });
  }

  const lastName = data.userName.split(" ").pop() || "User";
  const dateStr = new Date().toISOString().slice(0, 10);
  const contextSuffix = data.contextLabel ? `-${data.contextLabel}` : "";
  if (options?.returnBlob) {
    return doc.output("blob");
  }
  doc.save(`BrainWise-${data.instrumentShortName}${contextSuffix}-${lastName}-${dateStr}.pdf`);
}
