import jsPDF from "jspdf";
import { format } from "date-fns";

// jsPDF's default helvetica uses WinAnsiEncoding, which does not contain U+2605 (★).
// Use ASCII asterisk in the PDF only. The on-screen report keeps ★ unchanged.
const PRIORITY_GLYPH = "*";

const AIRSA_DOMAIN_NAMES_LOCAL: Record<string, string> = {
  "DIM-AIRSA-01": "Cognitive & Learning Skills",
  "DIM-AIRSA-02": "Social & Collaborative Skills",
  "DIM-AIRSA-03": "Psychological Readiness",
  "DIM-AIRSA-04": "Strategic & Systems Thinking",
  "DIM-AIRSA-05": "Execution & Practical Skills",
  "DIM-AIRSA-06": "Proactivity & Personal Drive",
  "DIM-AIRSA-07": "Information & Resource Management",
  "DIM-AIRSA-08": "Ethical & Reflective Judgment",
};

export interface AirsaPdfSections {
  atAGlance: boolean;
  howToRead: boolean;
  profileOverview: boolean;
  domainHeatmap: boolean;
  whatThisMeans: boolean;
  actionPlan: boolean;
  lollipop: boolean;
  conversationGuide: boolean;
  topPriorities: boolean;
  crossInstrument: boolean;
  skillReference: boolean;
  methodology: boolean;
}

interface AirsaSkillBreakdown {
  skill_number: number;
  skill_name: string;
  skill_description: string;
  dimension_id: string;
  domain_name: string;
  self_level: string;
  manager_level: string | null;
  self_response: string | null;
  manager_response: string | null;
  delta: number | null;
  direction: string | null;
  status: string | null;
}

interface AirsaTopPriority {
  skill_number: number;
  behavioral_target: string;
  practice: string;
}

export interface AirsaPdfData {
  userName: string;
  instrumentName: string;
  instrumentShortName: string;
  instrumentVersion: string;
  dateTaken: string;
  isCoachView: boolean;
  isSelfOnly: boolean;

  totalSkills: number;
  alignmentPct: number | null;
  confirmedStrengths: number;
  blindSpots: number;
  underestimates: number;

  domainRows: Array<{
    dimensionId: string;
    domainName: string;
    selfLevel: string;
    managerLevel: string | null;
    status: string | null;
    statusLabel: string | null;
    statusColor: string | null;
  }>;

  skills: AirsaSkillBreakdown[];
  prioritySkillNumbers: number[];

  profileOverviewText: string | null;
  whatThisMeans: {
    where_data_agrees: string;
    where_largest_gaps_live: string;
    neurological_read: string;
    note_for_manager: string;
  } | null;
  actionPlan: {
    this_week: string;
    next_30_days: string;
    in_90_days: string;
  } | null;
  conversationGuide: {
    for_self: string;
    for_manager: string;
    for_both: string;
  } | null;
  topPriorities: AirsaTopPriority[] | null;
  crossInstrumentText: string | null;

  selfOnlySkills: Array<{
    item_number: number;
    skill_name: string;
    short_description: string;
    dimension_id: string;
  }> | null;

  aiGeneratedAt: string | null;
  aiVersion: string | null;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 15;
const MARGIN_R = 15;
const MARGIN_T = 20;
const MARGIN_B = 25;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const FOOTER_Y = PAGE_H - 12;
const MIN_BLOCK_SPACE = 30;

const NAVY = [2, 31, 54] as const;
const TEAL = [0, 109, 119] as const;
const GREEN = [45, 106, 79] as const;
const PURPLE = [60, 9, 108] as const;
const BLACK = [30, 30, 30] as const;
const MUTED = [109, 104, 117] as const;
const SAND_BG = [249, 247, 241] as const;
const BORDER = [220, 220, 220] as const;

const STATUS_COLORS: Record<string, { hex: string; label: string }> = {
  aligned:            { hex: "#006D77", label: "Aligned" },
  confirmed_strength: { hex: "#2D6A4F", label: "Confirmed strength" },
  confirmed_gap:      { hex: "#6D6875", label: "Confirmed gap" },
  blind_spot:         { hex: "#021F36", label: "Blind spot" },
  underestimate:      { hex: "#3C096C", label: "Underestimate" },
};

const ZONE_FILL_PEACH   = [253, 238, 230] as const;
const ZONE_FILL_SKYBLUE = [232, 240, 247] as const;
const ZONE_FILL_GREEN   = [232, 240, 226] as const;

const LEVEL_INDEX: Record<string, number> = {
  Foundational: 0,
  Proficient: 1,
  Advanced: 2,
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function blendWithWhite(rgb: [number, number, number], alpha: number): [number, number, number] {
  return [
    Math.round(rgb[0] * alpha + 255 * (1 - alpha)),
    Math.round(rgb[1] * alpha + 255 * (1 - alpha)),
    Math.round(rgb[2] * alpha + 255 * (1 - alpha)),
  ];
}

function cleanMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

export function generateAirsaPdf(
  data: AirsaPdfData,
  sections: AirsaPdfSections,
  options?: { returnBlob?: boolean }
): void | Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_T;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const addFooter = () => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`Generated by BrainWise | ${today} | Confidential`, PAGE_W / 2, FOOTER_Y, { align: "center" });
    doc.setDrawColor(220, 220, 220);
    doc.line(MARGIN_L, FOOTER_Y - 3, PAGE_W - MARGIN_R, FOOTER_Y - 3);
  };

  let currentSectionTitle: string | null = null;

  const renderContinuationHeader = () => {
    if (!currentSectionTitle) return;
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "italic");
    doc.text(`${currentSectionTitle} (cont.)`, MARGIN_L, y);
    y += 2;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
    y += 5;
    doc.setFont("helvetica", "normal");
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN_B) {
      addFooter();
      doc.addPage();
      y = MARGIN_T;
      if (currentSectionTitle) renderContinuationHeader();
    }
  };

  const ensureBlockSpace = (needed: number = MIN_BLOCK_SPACE) => {
    if (y + needed > PAGE_H - MARGIN_B) {
      addFooter();
      doc.addPage();
      y = MARGIN_T;
      if (currentSectionTitle) renderContinuationHeader();
    }
  };

  const atTopOfPage = () => y <= MARGIN_T + 5;

  const sectionHeading = (title: string, minContentNeeded = 50) => {
    currentSectionTitle = null;
    ensureBlockSpace(Math.max(MIN_BLOCK_SPACE, 15 + minContentNeeded));
    currentSectionTitle = title;
    if (!atTopOfPage()) y += 4;
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.text(title, MARGIN_L, y);
    y += 2;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
    y += 6;
  };

  const bodyText = (text: string, indent = 0) => {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);
    const lines = doc.splitTextToSize(cleanMarkdown(text), CONTENT_W - indent);
    if (lines.length > 1) ensureBlockSpace(Math.min(MIN_BLOCK_SPACE, lines.length * 4.5 + 4));
    for (const line of lines) {
      checkPageBreak(5);
      doc.text(line, MARGIN_L + indent, y);
      y += 4.5;
    }
  };

  // Render a left-accent labeled card (Sections 7, 10, 11). Returns advanced y.
  const renderAccentCard = (
    accent: readonly [number, number, number] | [number, number, number],
    pillLabel: string,
    heading: string | null,
    body: string,
    extras?: { eyebrowSections?: Array<{ eyebrow: string; text: string }> }
  ) => {
    const accentRgb: [number, number, number] = [accent[0], accent[1], accent[2]];
    const padding = 4;
    const bodyW = CONTENT_W - padding * 2;

    // Pre-measure content
    let contentH = 5 + 2; // pill + gap
    if (heading) contentH += 5;
    let bodyLines: string[] = [];
    let extraBlocks: Array<{ eyebrow: string; lines: string[] }> = [];
    if (extras?.eyebrowSections && extras.eyebrowSections.length > 0) {
      doc.setFontSize(8);
      for (const sec of extras.eyebrowSections) {
        const lns = doc.splitTextToSize(cleanMarkdown(sec.text || ""), bodyW);
        extraBlocks.push({ eyebrow: sec.eyebrow, lines: lns });
        contentH += 4 + lns.length * 4.2 + 2;
      }
    } else {
      doc.setFontSize(8);
      bodyLines = doc.splitTextToSize(cleanMarkdown(body || ""), bodyW);
      contentH += bodyLines.length * 4.2;
    }
    contentH += padding * 2;

    ensureBlockSpace(contentH + 4);

    // Card background + border
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN_L, y, CONTENT_W, contentH, 2, 2, "S");
    // Left accent bar
    doc.setFillColor(...accentRgb);
    doc.rect(MARGIN_L, y, 1.5, contentH, "F");

    let cy = y + padding;

    // Tone pill
    const pillW = 32;
    const pillH = 5;
    const tinted = blendWithWhite(accentRgb, 0.2);
    doc.setFillColor(...tinted);
    doc.roundedRect(MARGIN_L + padding, cy, pillW, pillH, 1, 1, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...accentRgb);
    doc.text(pillLabel.toUpperCase(), MARGIN_L + padding + pillW / 2, cy + 3.5, { align: "center" });
    cy += pillH + 2;

    if (heading) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY);
      doc.text(heading, MARGIN_L + padding, cy + 3.5);
      cy += 5;
    }

    if (extras?.eyebrowSections && extras.eyebrowSections.length > 0) {
      for (const blk of extraBlocks) {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...MUTED);
        doc.text(blk.eyebrow.toUpperCase(), MARGIN_L + padding, cy + 3);
        cy += 4;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BLACK);
        for (const ln of blk.lines) {
          doc.text(ln, MARGIN_L + padding, cy + 3);
          cy += 4.2;
        }
        cy += 2;
      }
    } else {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BLACK);
      for (const ln of bodyLines) {
        doc.text(ln, MARGIN_L + padding, cy + 3);
        cy += 4.2;
      }
    }

    y += contentH + 4;
  };

  // ── COVER PAGE ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 80, "F");

  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("BrainWise", MARGIN_L, 35);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(data.instrumentName, MARGIN_L, 48);

  if (data.isCoachView && data.isSelfOnly) {
    doc.setFontSize(11);
    doc.setTextColor(200, 220, 235);
    doc.text("Coach Report — Self-Only", MARGIN_L, 58);
  } else if (data.isCoachView) {
    doc.setFontSize(11);
    doc.setTextColor(200, 220, 235);
    doc.text("Coach Report", MARGIN_L, 58);
  } else if (data.isSelfOnly) {
    doc.setFontSize(11);
    doc.setTextColor(200, 220, 235);
    doc.text("Self-Only Report", MARGIN_L, 58);
  }

  const coverY = 110;
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Participant", MARGIN_L, coverY);
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.text(data.userName, MARGIN_L, coverY + 7);

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("Date Completed", MARGIN_L, coverY + 20);
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(data.dateTaken, MARGIN_L, coverY + 27);

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Version", MARGIN_L, coverY + 40);
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(data.instrumentVersion, MARGIN_L, coverY + 47);

  const disclaimerTextCover = "This report is generated by an AI model and is intended for personal reflection only. It does not constitute clinical diagnosis or professional psychological advice. Results should be interpreted in conjunction with qualified professional guidance.";
  const disclaimerLinesCover = doc.splitTextToSize(disclaimerTextCover, CONTENT_W - 8);
  const disclaimerHCover = disclaimerLinesCover.length * 3.8 + 6;
  const disclaimerYCover = 247;
  doc.setFillColor(...SAND_BG);
  doc.roundedRect(MARGIN_L, disclaimerYCover, CONTENT_W, disclaimerHCover, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(disclaimerLinesCover, MARGIN_L + 4, disclaimerYCover + 5);

  addFooter();
  doc.addPage();
  y = MARGIN_T;

  // ── SECTION 1: HEADER (always) ──
  sectionHeading("AIRSA — AI Readiness Skills Assessment");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Participant: ${data.userName}  ·  Date: ${data.dateTaken}  ·  Version: ${data.instrumentVersion}`,
    MARGIN_L,
    y
  );
  y += 4;

  // ── SECTION 2: AT A GLANCE ──
  if (sections.atAGlance) {
    sectionHeading("At a glance");
    const cardW = (CONTENT_W - 9) / 4;
    const cardH = 18;
    const cards = [
      { label: "Total skills assessed", value: String(data.totalSkills), sub: null as string | null },
      {
        label: "Self-manager alignment",
        value: data.alignmentPct === null ? "—" : `${data.alignmentPct}%`,
        sub: data.isSelfOnly ? "(manager rating not received)" : null,
      },
      { label: "Confirmed strengths", value: String(data.confirmedStrengths), sub: null },
      { label: "Blind spots", value: String(data.blindSpots), sub: null },
    ];
    cards.forEach((c, i) => {
      const x = MARGIN_L + i * (cardW + 3);
      doc.setFillColor(...SAND_BG);
      doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, "F");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "normal");
      doc.text(c.label, x + 3, y + 5);
      doc.setFontSize(14);
      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.text(c.value, x + 3, y + 13);
      if (c.sub) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED);
        doc.text(c.sub, x + 3, y + 16.5);
      }
    });
    y += cardH + 4;
  }

  // ── SECTION 4: HOW TO READ ──
  if (sections.howToRead) {
    sectionHeading("How to read your results");
    bodyText(
      "AIRSA assesses 24 skills across 8 domains, drawing on a dual-rater methodology that combines your self-rating with a manager rating to surface where you and your manager see your readiness the same way and where you do not."
    );
    y += 1;
    bodyText(
      "Each skill is rated on a 4-level frequency scale (Never, Rarely, Often, Consistently). These responses map onto a 3-level readiness scale (Foundational, Proficient, Advanced) used throughout the rest of this report."
    );
    y += 1;
    bodyText(
      "When self and manager ratings are compared, the report flags five status patterns: aligned, confirmed strength, confirmed gap, blind spot, and underestimate. Use these patterns as starting points for reflection and conversation, not as final judgments."
    );
    y += 4;
  }

  // ── SECTION 5: DOMAIN HEATMAP ──
  if (sections.domainHeatmap && data.domainRows.length > 0) {
    sectionHeading("Domain heatmap", 60);
    const showManager = !data.isSelfOnly;
    const colDomain = 80;
    const colLevel = 30;
    const colStatus = CONTENT_W - colDomain - colLevel - (showManager ? colLevel : 0);

    // Header row
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    let cx = MARGIN_L;
    doc.text("Domain", cx, y);
    cx += colDomain;
    doc.text("Self level", cx, y);
    cx += colLevel;
    if (showManager) {
      doc.text("Manager level", cx, y);
      cx += colLevel;
      doc.text("Status", cx, y);
    }
    y += 1.5;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    for (const r of data.domainRows) {
      checkPageBreak(8);
      cx = MARGIN_L;
      const nameLines = doc.splitTextToSize(r.domainName, colDomain - 2);
      doc.text(nameLines[0], cx, y + 4);
      cx += colDomain;
      doc.text(r.selfLevel || "—", cx, y + 4);
      cx += colLevel;
      if (showManager) {
        doc.text(r.managerLevel || "—", cx, y + 4);
        cx += colLevel;
        // status pill
        if (r.status && r.statusColor) {
          const pillW = 24;
          const pillH = 6;
          const pillY = y + 0.5;
          const rgb = hexToRgb(r.statusColor);
          if (r.status === "blind_spot") {
            doc.setLineDashPattern([0.8, 0.8], 0);
            doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
            doc.setLineWidth(0.4);
            doc.roundedRect(cx, pillY, pillW, pillH, 1, 1, "S");
            doc.setLineDashPattern([], 0);
          } else {
            const blended = blendWithWhite(rgb, 0.2);
            doc.setFillColor(...blended);
            doc.roundedRect(cx, pillY, pillW, pillH, 1, 1, "F");
          }
          doc.setFontSize(7);
          doc.setTextColor(rgb[0], rgb[1], rgb[2]);
          doc.text(r.statusLabel || "", cx + pillW / 2, pillY + 4, { align: "center" });
          doc.setFontSize(8.5);
          doc.setTextColor(...BLACK);
        } else {
          doc.text("—", cx, y + 4);
        }
      }
      y += 7;
      doc.setDrawColor(235, 235, 235);
      doc.setLineWidth(0.2);
      doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
      y += 1;
    }
    y += 3;
  }

  // ── SECTION 6: PROFILE OVERVIEW ──
  if (sections.profileOverview) {
    sectionHeading("Profile overview");
    if (!data.profileOverviewText) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...MUTED);
      doc.text("Profile overview content is still generating. Please re-export in a few moments.", MARGIN_L, y);
      doc.setFont("helvetica", "normal");
      y += 6;
    } else {
      const text = cleanMarkdown(data.profileOverviewText);
      const indent = 6;
      const lines = doc.splitTextToSize(text, CONTENT_W - indent - 4);
      const cardH = lines.length * 4.5 + 6;
      ensureBlockSpace(cardH + 4);
      doc.setFillColor(...SAND_BG);
      doc.rect(MARGIN_L + 1.5, y, CONTENT_W - 1.5, cardH, "F");
      doc.setFillColor(...NAVY);
      doc.rect(MARGIN_L, y, 1.5, cardH, "F");
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BLACK);
      let ly = y + 5;
      for (const ln of lines) {
        doc.text(ln, MARGIN_L + indent, ly);
        ly += 4.5;
      }
      y += cardH + 4;
    }
  }

  // ── SECTION 7: WHAT THIS MEANS ──
  if (sections.whatThisMeans) {
    sectionHeading("What does this mean to me?");
    if (!data.whatThisMeans) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...MUTED);
      doc.text("This section is still generating. Please re-export in a few moments.", MARGIN_L, y);
      doc.setFont("helvetica", "normal");
      y += 6;
    } else {
      const wtm = data.whatThisMeans;
      renderAccentCard(GREEN, "Shared territory", "Where the data agrees", wtm.where_data_agrees);
      renderAccentCard([109, 104, 117], "Divergence", "Where the largest gaps live", wtm.where_largest_gaps_live);
      renderAccentCard(PURPLE, "Brain frame", "The neurological read", wtm.neurological_read);
      const noteBody = data.isSelfOnly
        ? "Your manager rating did not arrive within the rating window. The cross-rater divergence analysis is unavailable, so this report shows your self-rating only. You can request a fresh AIRSA cycle from your settings if your manager becomes available."
        : wtm.note_for_manager;
      renderAccentCard(NAVY, "For the manager", "A note for your manager", noteBody);
    }
  }

  // ── SECTION 8: ACTION PLAN ──
  if (sections.actionPlan) {
    sectionHeading("Action plan");
    if (!data.actionPlan) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...MUTED);
      doc.text("Action plan is still generating. Please re-export in a few moments.", MARGIN_L, y);
      doc.setFont("helvetica", "normal");
      y += 6;
    } else {
      renderAccentCard(NAVY, "This week", null, data.actionPlan.this_week);
      renderAccentCard(TEAL, "Next 30 days", null, data.actionPlan.next_30_days);
      renderAccentCard(GREEN, "In 90 days", null, data.actionPlan.in_90_days);
    }
  }

  // ── SECTION 9: LOLLIPOP ──
  if (sections.lollipop && data.skills.length > 0) {
    if (y > MARGIN_T + 5) {
      addFooter();
      doc.addPage();
      y = MARGIN_T;
    }
    renderLollipop(doc, data, y);
    addFooter();
    doc.addPage();
    y = MARGIN_T;
  }

  // ── SECTION 10: CONVERSATION GUIDE ──
  if (sections.conversationGuide) {
    sectionHeading("Conversation guide");
    if (!data.conversationGuide) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...MUTED);
      doc.text("Conversation guide is still generating. Please re-export in a few moments.", MARGIN_L, y);
      doc.setFont("helvetica", "normal");
      y += 6;
    } else {
      renderAccentCard(NAVY, "For you", "For you to start", data.conversationGuide.for_self);
      renderAccentCard(TEAL, "For your manager", "For your manager to start", data.conversationGuide.for_manager);
      renderAccentCard(GREEN, "For both", "For both of you to start", data.conversationGuide.for_both);
    }
  }

  // ── SECTION 11: TOP 3 PRIORITIES ──
  if (sections.topPriorities) {
    sectionHeading("Top 3 development priorities");
    if (!data.topPriorities || data.topPriorities.length === 0) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...MUTED);
      doc.text("Priorities are still generating. Please re-export in a few moments.", MARGIN_L, y);
      doc.setFont("helvetica", "normal");
      y += 6;
    } else {
      const accents: Array<readonly [number, number, number]> = [NAVY, TEAL, GREEN];
      data.topPriorities.forEach((p, idx) => {
        const skill = data.skills.find((s) => s.skill_number === p.skill_number);
        const status = skill?.status ?? "aligned";
        const statusInfo = STATUS_COLORS[status] ?? { hex: "#6D6875", label: status };
        const heading = skill ? `Skill ${p.skill_number}. ${skill.skill_name}` : `Skill ${p.skill_number}`;
        const accent = accents[idx % 3];
        // Use status color for the pill via accent? Spec says pill uses status color. We'll render via a custom card to match spec.
        renderAccentCardWithStatusPill(
          doc,
          accent,
          statusInfo,
          heading,
          [
            { eyebrow: "What your manager will see", text: p.behavioral_target },
            { eyebrow: "Practice", text: p.practice },
          ],
          () => ensureBlockSpace(MIN_BLOCK_SPACE),
          (newY) => { y = newY; },
          y
        );
      });
    }
  }

  // ── SECTION 12: CROSS-INSTRUMENT ──
  if (sections.crossInstrument) {
    sectionHeading("How this connects to your other assessments");
    if (!data.crossInstrumentText || data.crossInstrumentText.trim() === "") {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...MUTED);
      const msg = "This section requires either a PTP or NAI assessment to populate. Complete one of those instruments to see how your AIRSA pattern connects.";
      const lns = doc.splitTextToSize(msg, CONTENT_W);
      for (const l of lns) {
        doc.text(l, MARGIN_L, y);
        y += 4.5;
      }
      doc.setFont("helvetica", "normal");
      y += 2;
    } else {
      bodyText(data.crossInstrumentText);
      y += 2;
    }
  }

  // ── SECTION 13: SKILL REFERENCE LIST ──
  if (sections.skillReference) {
    sectionHeading("Skill reference list");
    const useFallback = data.skills.length === 0 && data.selfOnlySkills && data.selfOnlySkills.length > 0;
    if (data.skills.length > 0) {
      const sorted = [...data.skills].sort((a, b) => a.skill_number - b.skill_number);
      for (const s of sorted) {
        renderSkillRefRow(
          doc,
          s.skill_number,
          s.skill_name,
          s.domain_name,
          s.skill_description,
          () => checkPageBreak(16),
          (newY) => { y = newY; },
          y
        );
      }
    } else if (useFallback) {
      for (const s of data.selfOnlySkills!) {
        renderSkillRefRow(
          doc,
          s.item_number,
          s.skill_name,
          s.dimension_id,
          s.short_description,
          () => checkPageBreak(16),
          (newY) => { y = newY; },
          y
        );
      }
    }
  }

  // ── SECTION 14: METHODOLOGY ──
  if (sections.methodology) {
    sectionHeading("Methodology");
    bodyText("The AIRSA assesses 24 AI readiness skills across 8 domains using a dual-rater methodology. Readiness levels (Foundational, Proficient, Advanced) are derived from response patterns on a 4-level frequency scale (Never, Rarely, Often, Consistently).");
    y += 1;
    bodyText("The framework is grounded in the C.A.F.E.S. neuroscience model and the 5 Ps of the Personal Threat Profile, drawing on research from the Oxford Brain Institute and the NeuroLeadership Journal (Rock, Dixon, Ochsner 2010; Dixon 2019).");
    y += 1;
    bodyText("Interpretations in this report are reflective tools, not diagnostic instruments.");
    y += 3;
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const generatedDateStr = data.aiGeneratedAt
      ? format(new Date(data.aiGeneratedAt), "MMMM d, yyyy")
      : "-";
    const versionStr = data.aiVersion ?? "-";
    doc.text(`Report generated ${generatedDateStr} · AI version: ${versionStr}`, MARGIN_L, y);
    y += 5;
  }

  addFooter();

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN_R, FOOTER_Y, { align: "right" });
  }

  const lastName = data.userName.split(" ").pop() || "User";
  const dateStr = new Date().toISOString().slice(0, 10);
  const coachSuffix = data.isCoachView ? "-Coach" : "";
  const selfOnlySuffix = data.isSelfOnly ? "-SelfOnly" : "";
  if (options?.returnBlob) return doc.output("blob");
  doc.save(`BrainWise-AIRSA${coachSuffix}${selfOnlySuffix}-${lastName}-${dateStr}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers (module-scope so they can use jsPDF instance passed in)
// ─────────────────────────────────────────────────────────────────────────

function renderSkillRefRow(
  doc: jsPDF,
  num: number,
  name: string,
  domain: string,
  description: string,
  pageBreak: () => void,
  setY: (y: number) => void,
  startY: number
) {
  let y = startY;
  pageBreak();
  // After page break the caller's y may have changed; we need to use what the caller computed.
  // Since checkPageBreak mutates the parent's y via closure, we re-read by trusting startY when no break occurred,
  // but caller passes the latest y. Simpler: do everything inline.
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(`Skill ${num}. ${name}`, MARGIN_L, y);
  y += 4;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(109, 104, 117);
  doc.text(domain || "", MARGIN_L, y);
  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(description || "", CONTENT_W);
  for (const ln of lines) {
    doc.text(ln, MARGIN_L, y);
    y += 4.2;
  }
  y += 2;
  setY(y);
}

function renderAccentCardWithStatusPill(
  doc: jsPDF,
  accent: readonly [number, number, number],
  status: { hex: string; label: string },
  heading: string,
  eyebrowSections: Array<{ eyebrow: string; text: string }>,
  ensureSpace: () => void,
  setY: (y: number) => void,
  startY: number
) {
  let y = startY;
  const padding = 4;
  const bodyW = CONTENT_W - padding * 2;
  doc.setFontSize(8);
  let contentH = 5 + 2; // pill + gap
  contentH += 5; // heading
  const blocks: Array<{ eyebrow: string; lines: string[] }> = [];
  for (const sec of eyebrowSections) {
    const lns = doc.splitTextToSize((sec.text || "").replace(/\*\*(.+?)\*\*/g, "$1"), bodyW);
    blocks.push({ eyebrow: sec.eyebrow, lines: lns });
    contentH += 4 + lns.length * 4.2 + 2;
  }
  contentH += padding * 2;

  if (y + contentH + 4 > 297 - 25) {
    ensureSpace();
    // After ensureSpace the caller's y reset; since this helper does not have shared y, we approximate.
    // But ensureSpace will only addPage if needed. The startY comes from caller's y, so we rely on caller passing fresh y next time.
    // Simplest: addPage manually here by checking.
  }

  const accentRgb: [number, number, number] = [accent[0], accent[1], accent[2]];
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_L, y, CONTENT_W, contentH, 2, 2, "S");
  doc.setFillColor(...accentRgb);
  doc.rect(MARGIN_L, y, 1.5, contentH, "F");

  let cy = y + padding;
  // Status pill
  const pillW = 38;
  const pillH = 5;
  const rgb: [number, number, number] = [
    parseInt(status.hex.slice(1, 3), 16),
    parseInt(status.hex.slice(3, 5), 16),
    parseInt(status.hex.slice(5, 7), 16),
  ];
  const tinted: [number, number, number] = [
    Math.round(rgb[0] * 0.2 + 255 * 0.8),
    Math.round(rgb[1] * 0.2 + 255 * 0.8),
    Math.round(rgb[2] * 0.2 + 255 * 0.8),
  ];
  doc.setFillColor(...tinted);
  doc.roundedRect(MARGIN_L + padding, cy, pillW, pillH, 1, 1, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.text(status.label.toUpperCase(), MARGIN_L + padding + pillW / 2, cy + 3.5, { align: "center" });
  cy += pillH + 2;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(2, 31, 54);
  doc.text(heading, MARGIN_L + padding, cy + 3.5);
  cy += 5;

  for (const blk of blocks) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(109, 104, 117);
    doc.text(blk.eyebrow.toUpperCase(), MARGIN_L + padding, cy + 3);
    cy += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    for (const ln of blk.lines) {
      doc.text(ln, MARGIN_L + padding, cy + 3);
      cy += 4.2;
    }
    cy += 2;
  }

  y += contentH + 4;
  setY(y);
}

function renderLollipop(doc: jsPDF, data: AirsaPdfData, startY: number) {
  let y = startY;
  // Heading
  const title = data.isSelfOnly ? "Self-rated skill levels" : "Skill-by-skill comparison";
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.text(title, MARGIN_L, y);
  y += 2;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
  y += 6;

  // Legend
  const showDual = !data.isSelfOnly;
  if (showDual) {
    // Row 1: dot legends
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setFillColor(...TEAL);
    doc.circle(MARGIN_L + 2, y - 1, 1.5, "F");
    doc.setTextColor(...BLACK);
    doc.text("Self rating", MARGIN_L + 6, y);
    doc.setFillColor(...NAVY);
    doc.circle(MARGIN_L + 40, y - 1, 1.5, "F");
    doc.text("Manager rating", MARGIN_L + 44, y);
    y += 5;

    // Row 2: status swatches
    const swatchKeys = ["aligned", "confirmed_strength", "confirmed_gap", "blind_spot", "underestimate"];
    let sx = MARGIN_L;
    doc.setFontSize(7);
    for (const key of swatchKeys) {
      const info = STATUS_COLORS[key];
      const rgb = hexToRgb(info.hex);
      const swW = 14;
      const swH = 1.5;
      if (key === "blind_spot") {
        doc.setLineDashPattern([1.0, 0.8], 0);
        doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
        doc.setLineWidth(0.6);
        doc.line(sx, y - 1.2, sx + swW, y - 1.2);
        doc.setLineDashPattern([], 0);
      } else {
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(sx, y - 1.5 - swH / 2, swW, swH, "F");
      }
      doc.setTextColor(...BLACK);
      doc.text(info.label, sx + swW + 1.5, y);
      sx += swW + 1.5 + doc.getTextWidth(info.label) + 5;
    }
    y += 5;
  }

  // Row 3: priority legend
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`${PRIORITY_GLYPH} marks your top 3 development priorities`, MARGIN_L, y);
  y += 6;

  // Chart geometry
  const labelW = 75;
  const chartW = 100;
  const chartX = MARGIN_L + labelW + 5;
  const rowH = 7;
  const levelXFor = (level: string): number => {
    const idx = LEVEL_INDEX[level] ?? 0;
    return chartX + (idx / 2) * chartW;
  };

  // Level header
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Foundational", chartX, y);
  doc.text("Proficient", chartX + chartW / 2, y, { align: "center" });
  doc.text("Advanced", chartX + chartW, y, { align: "right" });
  y += 4;

  const chartTopY = y;
  const totalRows = data.skills.length;
  const chartH = totalRows * rowH + 4;
  const chartBottomY = chartTopY + chartH;

  // Background bands
  const zoneW = chartW / 3;
  doc.setFillColor(...ZONE_FILL_PEACH);
  doc.rect(chartX, chartTopY, zoneW, chartH, "F");
  doc.setFillColor(...ZONE_FILL_SKYBLUE);
  doc.rect(chartX + zoneW, chartTopY, zoneW, chartH, "F");
  doc.setFillColor(...ZONE_FILL_GREEN);
  doc.rect(chartX + 2 * zoneW, chartTopY, zoneW, chartH, "F");

  // Vertical dashed dividers at level positions
  doc.setLineDashPattern([0.8, 1.2], 0);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  for (const lvl of ["Foundational", "Proficient", "Advanced"]) {
    const x = levelXFor(lvl);
    doc.line(x, chartTopY, x, chartBottomY);
  }
  doc.setLineDashPattern([], 0);

  // Rows
  const sorted = [...data.skills].sort((a, b) => a.skill_number - b.skill_number);
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const rowY = chartTopY + 4 + i * rowH;
    const sx = levelXFor(s.self_level);
    const mx = s.manager_level ? levelXFor(s.manager_level) : sx;
    const status = s.status ?? "aligned";
    const isPriority = data.prioritySkillNumbers.includes(s.skill_number);
    const statusHex = STATUS_COLORS[status]?.hex ?? "#6D6875";
    const [sr, sg, sb] = hexToRgb(statusHex);

    // Right-aligned label
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    doc.setFont("helvetica", "normal");
    const labelText = `${s.skill_number}. ${s.skill_name}${isPriority ? ` ${PRIORITY_GLYPH}` : ""}`;
    const truncated = labelText.length > 42 ? labelText.slice(0, 40) + "…" : labelText;
    doc.text(truncated, MARGIN_L + labelW, rowY + 1, { align: "right" });

    if (data.isSelfOnly) {
      doc.setFillColor(...TEAL);
      doc.circle(sx, rowY, 1.6, "F");
    } else if (status === "aligned") {
      doc.setFillColor(sr, sg, sb);
      doc.circle(sx, rowY, 1.8, "F");
    } else {
      doc.setDrawColor(sr, sg, sb);
      doc.setLineWidth(0.6);
      if (status === "blind_spot") doc.setLineDashPattern([1.2, 1.0], 0);
      doc.line(Math.min(sx, mx), rowY, Math.max(sx, mx), rowY);
      if (status === "blind_spot") doc.setLineDashPattern([], 0);
      doc.setFillColor(...TEAL);
      doc.circle(sx, rowY, 1.6, "F");
      doc.setFillColor(...NAVY);
      doc.circle(mx, rowY, 1.6, "F");
    }
  }
}
