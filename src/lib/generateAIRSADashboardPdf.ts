import jsPDF from "jspdf";

// jsPDF helvetica uses WinAnsiEncoding — no U+25B2 ▲ / U+25C6 ◆ / U+2605 ★.
// Substitute ASCII glyphs in the PDF only; on-screen rendering keeps Unicode.
const TOP_GROWTH_GLYPH = "^";
const TOP_STRENGTH_GLYPH = "+";
const PRIORITY_GLYPH = "*";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 15;
const MARGIN_R = 15;
const MARGIN_T = 20;
const MARGIN_B = 25;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const FOOTER_Y = PAGE_H - 12;
const MIN_BLOCK_SPACE = 30;

const NAVY: [number, number, number]    = [2, 31, 54];
const ORANGE: [number, number, number]  = [245, 116, 26];
const TEAL: [number, number, number]    = [0, 109, 119];
const GREEN: [number, number, number]   = [45, 106, 79];
const PURPLE: [number, number, number]  = [60, 9, 108];
const MUSTARD: [number, number, number] = [122, 88, 0];
const GRAY: [number, number, number]    = [109, 104, 117];
const PLUM_DEEP: [number, number, number] = [90, 26, 74];
const SAND_BG: [number, number, number] = [249, 247, 241];
const BORDER: [number, number, number]  = [220, 220, 220];
const BLACK: [number, number, number]   = [30, 30, 30];
const MUTED: [number, number, number]   = [109, 104, 117];
const WHITE: [number, number, number]   = [255, 255, 255];

const RISK_HIGH_FILL: [number, number, number] = [254, 240, 231];
const RISK_HIGH_BORDER: [number, number, number] = [245, 116, 26];

const DOMAIN_COLORS: Record<string, string> = {
  "DIM-AIRSA-01": "#021F36",
  "DIM-AIRSA-02": "#006D77",
  "DIM-AIRSA-03": "#3C096C",
  "DIM-AIRSA-04": "#7a5800",
  "DIM-AIRSA-05": "#2D6A4F",
  "DIM-AIRSA-06": "#F5741A",
  "DIM-AIRSA-07": "#6D6875",
  "DIM-AIRSA-08": "#5A1A4A",
};

const DOMAIN_NAMES: Record<string, string> = {
  "DIM-AIRSA-01": "Cognitive & Learning Skills",
  "DIM-AIRSA-02": "Social & Collaborative Skills",
  "DIM-AIRSA-03": "Psychological Readiness",
  "DIM-AIRSA-04": "Strategic & Systems Thinking",
  "DIM-AIRSA-05": "Execution & Practical Skills",
  "DIM-AIRSA-06": "Proactivity & Personal Drive",
  "DIM-AIRSA-07": "Information & Resource Management",
  "DIM-AIRSA-08": "Ethical & Reflective Judgment",
};

const DOMAIN_SHORT_NAMES: Record<string, string> = {
  "DIM-AIRSA-01": "Cognitive",
  "DIM-AIRSA-02": "Social",
  "DIM-AIRSA-03": "Psych Readiness",
  "DIM-AIRSA-04": "Strategic",
  "DIM-AIRSA-05": "Execution",
  "DIM-AIRSA-06": "Proactivity",
  "DIM-AIRSA-07": "Info Mgmt",
  "DIM-AIRSA-08": "Ethical",
};

const STATUS_COLORS: Record<string, { hex: string; label: string }> = {
  aligned:            { hex: "#006D77", label: "Aligned" },
  confirmed_strength: { hex: "#2D6A4F", label: "Confirmed strength" },
  confirmed_gap:      { hex: "#6D6875", label: "Confirmed gap" },
  blind_spot:         { hex: "#021F36", label: "Blind spot" },
  underestimate:      { hex: "#3C096C", label: "Underestimate" },
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function cleanMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

export interface AIRSADashboardPdfSections {
  overview: boolean;
  domains: boolean;
  skillInventory: boolean;
  managerCalibration: boolean;
  trends: boolean;
}

export interface AIRSADashboardPdfSkill {
  skill_number: number;
  skill_name: string;
  dimension_id: string;
  domain_name: string;
  modal_self_level: "Foundational" | "Proficient" | "Advanced";
  modal_manager_level: "Foundational" | "Proficient" | "Advanced";
  tci: number;
  blind_spot_pct: number;
  underestimate_pct: number;
  confirmed_strength_pct: number;
  n: number;
  cps_growth: number;
  cps_strength: number;
  suppressed: boolean;
  per_department_breakdown: Record<string, {
    n: number;
    suppressed?: boolean;
    modal_status?: string;
    tci?: number;
  }>;
}

export interface AIRSADashboardPdfDomain {
  domain_name: string;
  tci: number;
  blind_spot_pct: number;
  underestimate_pct: number;
  confirmed_strength_pct: number;
  n: number;
  cps_growth: number;
  cps_strength: number;
  suppressed: boolean;
}

export interface AIRSADashboardPdfManager {
  supervisor_id: string;
  supervisor_name: string;
  n_reports: number;
  n_skill_pairs: number;
  tci: number;
  blind_spot_pct: number;
  underestimate_pct: number;
}

export interface AIRSADashboardPdfRankedSkill {
  skill_number: number;
  skill_name: string;
  dimension_id: string;
  cps_growth?: number;
  cps_strength?: number;
}

export interface AIRSADashboardPdfRankedDomain {
  dimension_id: string;
  domain_name: string;
  cps_growth?: number;
  cps_strength?: number;
}

export interface AIRSADashboardPdfData {
  sliceLabel: string;
  generatedAt: string;
  participantCount: number;
  tciOverall: number | null;
  alignmentRate: number | null;
  blindSpotRate: number | null;
  underestimateRate: number | null;
  latestNarrativeGeneratedAt: string | null;

  narrative: {
    summary: string | null;
    business_meaning: string | null;
    benefits: string | null;
    risks: string | null;
    next_steps: string | null;
    reassessment_note: string | null;
    top_interventions: Array<{ title: string; rationale: string }>;
    risk_flags: Array<{
      id: string;
      level: "high" | "warn";
      title: string;
      summary: string;
      detail: string;
    }>;
  } | null;

  rankings: {
    growthSkills: AIRSADashboardPdfRankedSkill[];
    growthDomains: AIRSADashboardPdfRankedDomain[];
    strengthSkills: AIRSADashboardPdfRankedSkill[];
    strengthDomains: AIRSADashboardPdfRankedDomain[];
  };

  calibrationMap: {
    departments: string[];
    skills: AIRSADashboardPdfSkill[];
    topGrowthSkillNumbers: number[];
    topStrengthSkillNumbers: number[];
  };

  domains: Array<{
    dimensionId: string;
    domain: AIRSADashboardPdfDomain;
  }>;

  skills: AIRSADashboardPdfSkill[];

  managerCalibration: {
    top: AIRSADashboardPdfManager[];
    bottom: AIRSADashboardPdfManager[];
  };

  narrativeHistory: Array<{
    generated_at: string;
    index_score: number | null;
    participant_count: number;
  }>;

  exportSections: AIRSADashboardPdfSections;
}

export function generateAIRSADashboardPdf(data: AIRSADashboardPdfData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_T;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const dateStr = new Date().toISOString().split("T")[0];

  const setFill = (rgb: [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setText = (rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb: [number, number, number]) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

  const addFooter = () => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setText(MUTED);
    doc.text(
      `BrainWise · AIRSA Company Dashboard · Confidential · ${today}`,
      PAGE_W / 2,
      FOOTER_Y,
      { align: "center" },
    );
    setDraw(BORDER);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, FOOTER_Y - 3, PAGE_W - MARGIN_R, FOOTER_Y - 3);
  };

  let currentSectionTitle: string | null = null;

  const renderContinuationHeader = () => {
    if (!currentSectionTitle) return;
    doc.setFontSize(10);
    setText(MUTED);
    doc.setFont("helvetica", "italic");
    doc.text(`${currentSectionTitle} (cont.)`, MARGIN_L, y);
    y += 2;
    setDraw(BORDER);
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
    setText(NAVY);
    doc.setFont("helvetica", "bold");
    doc.text(title, MARGIN_L, y);
    y += 2;
    setDraw(NAVY);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
    y += 6;
  };

  const bodyText = (text: string, indent = 0) => {
    const rawLines = text.split("\n");
    const baseX = MARGIN_L + indent;
    const baseW = CONTENT_W - indent;
    const bulletIndent = 4;
    const bulletSpacing = 1;

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (trimmed.length === 0) {
        y += 2;
        continue;
      }

      const bulletMatch = /^[-*]\s+(.+)$/.exec(trimmed);
      const numberMatch = /^(\d+\.)\s+(.+)$/.exec(trimmed);

      let prefix = "";
      let body = trimmed;
      let isListItem = false;
      let lineX = baseX;
      let wrapX = baseX;
      let lineW = baseW;

      if (bulletMatch) {
        prefix = "- ";
        body = bulletMatch[1];
        isListItem = true;
        lineX = baseX + bulletIndent;
        wrapX = baseX + bulletIndent + 3;
        lineW = baseW - bulletIndent - 3;
      } else if (numberMatch) {
        prefix = numberMatch[1] + " ";
        body = numberMatch[2];
        isListItem = true;
        lineX = baseX + bulletIndent;
        wrapX = baseX + bulletIndent + doc.getTextWidth("0. ") + 1;
        lineW = baseW - bulletIndent - 8;
      }

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      setText(BLACK);

      const wrappedBody = doc.splitTextToSize(cleanMarkdown(body), lineW) as string[];

      if (isListItem) y += bulletSpacing;
      if (wrappedBody.length > 1) {
        ensureBlockSpace(Math.min(MIN_BLOCK_SPACE, wrappedBody.length * 4.5 + 4));
      }

      for (let i = 0; i < wrappedBody.length; i++) {
        checkPageBreak(5);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        setText(BLACK);
        if (i === 0 && isListItem) {
          doc.text(prefix + wrappedBody[i], lineX, y);
        } else if (i === 0) {
          doc.text(wrappedBody[i], baseX, y);
        } else {
          doc.text(wrappedBody[i], isListItem ? wrapX : baseX, y);
        }
        y += 4.5;
      }
    }
  };

  const truncate = (text: string, maxW: number, fontSize: number, style: "normal" | "bold" | "italic" = "normal"): string => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", style);
    if (doc.getTextWidth(text) <= maxW) return text;
    let s = text;
    while (s.length > 1 && doc.getTextWidth(s + "…") > maxW) s = s.slice(0, -1);
    return s + "…";
  };

  setFill(NAVY);
  doc.rect(0, 0, PAGE_W, 72, "F");

  setText(WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("BrainWise", MARGIN_L, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("AIRSA · AI Readiness Skill Assessment Dashboard", MARGIN_L, 42);

  doc.setFontSize(10);
  setText([200, 220, 235]);
  doc.text("Company Dashboard", MARGIN_L, 53);

  if (data.tciOverall !== null) {
    setText(WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text(data.tciOverall.toFixed(1), PAGE_W - MARGIN_R, 34, { align: "right" });

    setText([200, 220, 235]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Talent Calibration Index", PAGE_W - MARGIN_R, 42, { align: "right" });
  }

  const renderField = (xc: number, yc: number, label: string, value: string) => {
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(label.toUpperCase(), xc, yc);
    setText(BLACK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(truncate(value, 90, 10.5, "bold"), xc, yc + 6);
  };

  renderField(MARGIN_L, 88, "Organization slice", data.sliceLabel);
  renderField(MARGIN_L + 100, 88, "Pairs assessed", String(data.participantCount));
  renderField(MARGIN_L, 108, "Generated", today);
  renderField(
    MARGIN_L + 100,
    108,
    "AI generated",
    data.latestNarrativeGeneratedAt
      ? new Date(data.latestNarrativeGeneratedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "—",
  );

  const cardW = (CONTENT_W - 9) / 4;
  const cardH = 18;
  const cardY = 125;
  const cards: Array<{ label: string; value: string; sub: string }> = [
    { label: "TCI", value: data.tciOverall !== null ? data.tciOverall.toFixed(1) : "—", sub: "out of 100" },
    { label: "Alignment", value: data.alignmentRate !== null ? data.alignmentRate.toFixed(1) + "%" : "—", sub: "self = manager" },
    { label: "Blind spot", value: data.blindSpotRate !== null ? data.blindSpotRate.toFixed(1) + "%" : "—", sub: "self > manager" },
    { label: "Underestimate", value: data.underestimateRate !== null ? data.underestimateRate.toFixed(1) + "%" : "—", sub: "self < manager" },
  ];
  cards.forEach((c, i) => {
    const cx = MARGIN_L + i * (cardW + 3);
    setFill([245, 247, 250]);
    doc.roundedRect(cx, cardY, cardW, cardH, 1.5, 1.5, "F");
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(c.label.toUpperCase(), cx + 3, cardY + 4.5);
    setText(NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(c.value, cx + 3, cardY + 11);
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(c.sub, cx + 3, cardY + 16);
  });

  const dy = PAGE_H - 50;
  setFill(SAND_BG);
  doc.roundedRect(MARGIN_L, dy, CONTENT_W, 28, 2, 2, "F");
  setText(MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const disclaimer = "This report is generated by BrainWise's AI interpretation engine. Data is aggregated across employee-manager pairs with a minimum of 5. For authorized HR and leadership use only. Confidential.";
  const dlines = doc.splitTextToSize(disclaimer, CONTENT_W - 8) as string[];
  let dty = dy + 6;
  for (const ln of dlines) {
    doc.text(ln, MARGIN_L + 4, dty);
    dty += 4;
  }

  addFooter();

  if (data.exportSections.overview) {
    doc.addPage();
    y = MARGIN_T;
    sectionHeading("Overview");

    if (data.narrative) {
      const cardPadding = 4;
      ensureBlockSpace(40);
      const cardStartY = y;
      const accentW = 1.5;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const headingText = "AI Workforce Calibration Summary";
      
      let summaryLines: string[] = [];
      if (data.narrative.summary) {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        summaryLines = doc.splitTextToSize(cleanMarkdown(data.narrative.summary), CONTENT_W - cardPadding * 2 - accentW - 2) as string[];
      }
      const tops = data.narrative.top_interventions ?? [];

      let estH = cardPadding * 2 + 6;
      estH += summaryLines.length * 4.5 + 4;
      if (tops.length > 0) {
        estH += 6;
        for (const t of tops) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          const rationaleLines = doc.splitTextToSize(` — ${cleanMarkdown(t.rationale)}`, CONTENT_W - cardPadding * 2 - accentW - 12) as string[];
          estH += 4 + rationaleLines.length * 4 + 2;
        }
      }

      ensureBlockSpace(estH + 4);
      const startY = y;

      setFill(SAND_BG);
      doc.roundedRect(MARGIN_L, startY, CONTENT_W, estH, 2, 2, "F");
      setFill(NAVY);
      doc.rect(MARGIN_L, startY, accentW, estH, "F");

      let cy = startY + cardPadding + 4;
      setText(NAVY);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(headingText, MARGIN_L + accentW + 3, cy);
      cy += 5;

      if (summaryLines.length > 0) {
        setText(BLACK);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        for (const ln of summaryLines) {
          doc.text(ln, MARGIN_L + accentW + 3, cy);
          cy += 4.5;
        }
        cy += 2;
      }

      if (tops.length > 0) {
        setText(NAVY);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("TOP 3 RECOMMENDED ACTIONS", MARGIN_L + accentW + 3, cy);
        cy += 5;
        tops.forEach((t, i) => {
          setText(ORANGE);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text(`${i + 1}.`, MARGIN_L + accentW + 3, cy);
          setText(NAVY);
          doc.text(cleanMarkdown(t.title), MARGIN_L + accentW + 3 + 7, cy);
          cy += 4;
          setText(MUTED);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          const rlines = doc.splitTextToSize(`— ${cleanMarkdown(t.rationale)}`, CONTENT_W - cardPadding * 2 - accentW - 12) as string[];
          for (const r of rlines) {
            doc.text(r, MARGIN_L + accentW + 3 + 7, cy);
            cy += 4;
          }
          cy += 2;
        });
      }

      y = startY + estH + 6;
    }

    if (data.narrative) {
      const subs: Array<[string, string | null]> = [
        ["BUSINESS MEANING", data.narrative.business_meaning],
        ["BENEFITS TO CAPITALIZE", data.narrative.benefits],
        ["RISKS IF PATTERNS PERSIST", data.narrative.risks],
        ["NEXT STEPS", data.narrative.next_steps],
        ["REASSESSMENT GUIDANCE", data.narrative.reassessment_note],
      ];
      for (const [eyebrow, text] of subs) {
        if (!text) continue;
        ensureBlockSpace(15);
        setText(NAVY);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(eyebrow, MARGIN_L, y);
        y += 4;
        bodyText(text);
        y += 4;
      }
    }

    {
      ensureBlockSpace(60);
      const colW = (CONTENT_W - 6) / 2;
      const leftX = MARGIN_L;
      const rightX = MARGIN_L + colW + 6;

      const computeHeight = (skills: AIRSADashboardPdfRankedSkill[], domains: AIRSADashboardPdfRankedDomain[]): number => {
        let h = 6 + 6 + 5 + 4;
        if (skills.length > 0) h += 5 + skills.length * 4.5;
        if (domains.length > 0) h += 5 + domains.length * 4.5;
        return h + 4;
      };
      const lh = computeHeight(data.rankings.growthSkills, data.rankings.growthDomains);
      const rh = computeHeight(data.rankings.strengthSkills, data.rankings.strengthDomains);
      const panelH = Math.max(lh, rh, 40);

      const drawPanel = (
        x: number,
        title: string,
        subtitle: string,
        accent: [number, number, number],
        skills: AIRSADashboardPdfRankedSkill[],
        domains: AIRSADashboardPdfRankedDomain[],
        metricKey: "cps_growth" | "cps_strength",
      ) => {
        setFill(WHITE);
        setDraw(BORDER);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, y, colW, panelH, 2, 2, "FD");

        let py = y + 6;
        setText(NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(title, x + 4, py);
        py += 2;
        setDraw(accent);
        doc.setLineWidth(0.7);
        doc.line(x + 4, py, x + colW - 4, py);
        py += 4;

        setText(MUTED);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.text(subtitle, x + 4, py);
        py += 5;

        const drawList = (
          eyebrow: string,
          items: Array<{ skill_number?: number; skill_name?: string; dimension_id?: string; domain_name?: string; cps_growth?: number; cps_strength?: number }>,
          isSkill: boolean,
        ) => {
          setText(MUTED);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.text(eyebrow, x + 4, py);
          py += 4;
          for (const it of items) {
            const metric = (it as any)[metricKey] ?? 0;
            const metricStr = metricKey === "cps_strength" ? metric.toFixed(1) + "%" : metric.toFixed(2);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            const metricW = doc.getTextWidth(metricStr);
            const labelMaxW = colW - 8 - metricW - 4;
            const labelText = isSkill
              ? `Skill ${it.skill_number}. ${it.skill_name}`
              : (it.domain_name ?? "");
            setText(BLACK);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            const truncated = truncate(labelText, labelMaxW, 8, "normal");
            doc.text(truncated, x + 4, py);
            setText(accent);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text(metricStr, x + colW - 4, py, { align: "right" });
            py += 4.5;
          }
        };

        if (skills.length > 0) drawList("SKILLS", skills, true);
        if (domains.length > 0) drawList("DOMAINS", domains, false);
      };

      drawPanel(leftX, "Greatest Growth Opportunities", "Composite priority score · 0-2 scale, higher = more urgent", ORANGE,
        data.rankings.growthSkills, data.rankings.growthDomains, "cps_growth");
      drawPanel(rightX, "Strengths to Capitalize", "% of pairs at confirmed strength · both rated Advanced", GREEN,
        data.rankings.strengthSkills, data.rankings.strengthDomains, "cps_strength");

      y += panelH + 6;
    }

    {
      const allDepts = data.calibrationMap.departments;
      const N = Math.min(allDepts.length, 8);
      const depts = allDepts.slice(0, N);
      const truncated = allDepts.length > 8;

      sectionHeading("Calibration Map", 80);

      setText(MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      const subtitle = `24 skills × ${allDepts.length} department${allDepts.length === 1 ? "" : "s"}. Cell color shows the modal calibration status. ${TOP_GROWTH_GLYPH} marks top 2 growth priorities · ${TOP_STRENGTH_GLYPH} marks top 2 confirmed strengths.`;
      const slines = doc.splitTextToSize(subtitle, CONTENT_W) as string[];
      for (const ln of slines) {
        doc.text(ln, MARGIN_L, y);
        y += 4.5;
      }
      y += 2;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      let lx = MARGIN_L;
      const legendItems: Array<{ key: string; label: string }> = [
        { key: "aligned", label: "Aligned" },
        { key: "confirmed_strength", label: "Confirmed strength" },
        { key: "confirmed_gap", label: "Confirmed gap" },
        { key: "blind_spot", label: "Blind spot" },
        { key: "underestimate", label: "Underestimate" },
        { key: "_suppressed", label: "n<5 suppressed" },
      ];
      for (const li of legendItems) {
        if (li.key === "blind_spot") {
          setDraw(NAVY);
          doc.setLineWidth(0.4);
          doc.setLineDashPattern([1, 1], 0);
          doc.rect(lx, y - 3, 3, 3, "S");
          doc.setLineDashPattern([], 0);
        } else if (li.key === "_suppressed") {
          setFill([200, 200, 200]);
          setDraw(BORDER);
          doc.setLineWidth(0.3);
          doc.rect(lx, y - 3, 3, 3, "FD");
        } else {
          const rgb = hexToRgb(STATUS_COLORS[li.key].hex);
          setFill(rgb);
          doc.rect(lx, y - 3, 3, 3, "F");
        }
        setText(BLACK);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(li.label, lx + 4, y);
        lx += doc.getTextWidth(li.label) + 10;
        if (lx > MARGIN_L + CONTENT_W - 30 && li !== legendItems[legendItems.length - 1]) {
          y += 5;
          lx = MARGIN_L;
        }
      }
      y += 6;

      const skillColW = 60;
      const deptColW = N > 0 ? (CONTENT_W - skillColW) / N : 0;
      const cellH = 5;
      const headerH = 6;

      const drawHeaderRow = () => {
        checkPageBreak(headerH + cellH);
        setFill(SAND_BG);
        doc.rect(MARGIN_L, y, CONTENT_W, headerH, "F");
        setText(NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text("Skill", MARGIN_L + 2, y + 4);
        for (let i = 0; i < N; i++) {
          const deptName = truncate(depts[i], deptColW - 2, 7, "bold");
          const dx = MARGIN_L + skillColW + i * deptColW + deptColW / 2;
          doc.text(deptName, dx, y + 4, { align: "center" });
        }
        y += headerH;
      };

      drawHeaderRow();

      const sortedSkills = [...data.calibrationMap.skills].sort((a, b) => a.skill_number - b.skill_number);
      const topGrowth = new Set(data.calibrationMap.topGrowthSkillNumbers);
      const topStrength = new Set(data.calibrationMap.topStrengthSkillNumbers);

      for (const skill of sortedSkills) {
        if (y + cellH > PAGE_H - MARGIN_B) {
          addFooter();
          doc.addPage();
          y = MARGIN_T;
          if (currentSectionTitle) renderContinuationHeader();
          drawHeaderRow();
        }

        setFill([250, 250, 252]);
        doc.rect(MARGIN_L, y, skillColW, cellH, "F");
        const domHex = DOMAIN_COLORS[skill.dimension_id] ?? "#6D6875";
        setFill(hexToRgb(domHex));
        doc.rect(MARGIN_L, y, 1.5, cellH, "F");

        setText(BLACK);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        let glyphSuffix = "";
        if (topGrowth.has(skill.skill_number)) glyphSuffix += " " + TOP_GROWTH_GLYPH;
        if (topStrength.has(skill.skill_number)) glyphSuffix += " " + TOP_STRENGTH_GLYPH;
        const baseLabel = `${skill.skill_number}. ${skill.skill_name}`;
        const maxLabelW = skillColW - 4 - 2 - (glyphSuffix ? 6 : 0);
        const skillLabel = truncate(baseLabel, maxLabelW, 7.5, "normal");
        doc.text(skillLabel, MARGIN_L + 3, y + 3.5);

        if (glyphSuffix) {
          let gx = MARGIN_L + skillColW - 2;
          if (topStrength.has(skill.skill_number)) {
            setText(GREEN);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text(TOP_STRENGTH_GLYPH, gx, y + 3.5, { align: "right" });
            gx -= 4;
          }
          if (topGrowth.has(skill.skill_number)) {
            setText(ORANGE);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text(TOP_GROWTH_GLYPH, gx, y + 3.5, { align: "right" });
          }
        }

        for (let i = 0; i < N; i++) {
          const dept = depts[i];
          const cell = skill.per_department_breakdown?.[dept];
          const cx = MARGIN_L + skillColW + i * deptColW;

          if (!cell || cell.suppressed || (cell.n != null && cell.n < 5)) {
            setFill([240, 240, 240]);
            setDraw(BORDER);
            doc.setLineWidth(0.3);
            doc.rect(cx, y, deptColW, cellH, "FD");
            setText(MUTED);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.text("n<5", cx + deptColW / 2, y + 3.3, { align: "center" });
          } else {
            const status = cell.modal_status ?? "aligned";
            const statusInfo = STATUS_COLORS[status] ?? STATUS_COLORS.aligned;
            const rgb = hexToRgb(statusInfo.hex);
            const tciVal = cell.tci != null ? cell.tci.toFixed(0) : "—";

            if (status === "blind_spot") {
              setDraw(rgb);
              doc.setLineWidth(0.5);
              doc.setLineDashPattern([1.2, 1.2], 0);
              doc.rect(cx, y, deptColW, cellH, "S");
              doc.setLineDashPattern([], 0);
              setText(rgb);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.text(tciVal, cx + deptColW / 2, y + 3.5, { align: "center" });
            } else {
              setFill(rgb);
              doc.rect(cx, y, deptColW, cellH, "F");
              setText(WHITE);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.text(tciVal, cx + deptColW / 2, y + 3.5, { align: "center" });
            }
          }
        }

        y += cellH;
      }

      if (truncated) {
        y += 2;
        setText(MUTED);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.text(
          `Showing 8 of ${allDepts.length} departments. Filter dashboard by department to see remaining.`,
          MARGIN_L,
          y,
        );
        y += 5;
      }
      y += 4;
    }

    if (data.narrative && data.narrative.risk_flags && data.narrative.risk_flags.length > 0) {
      sectionHeading("Risk Flags", 30);
      for (const flag of data.narrative.risk_flags) {
        const isHigh = flag.level === "high";
        const padding = 4;
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        const summaryLines = doc.splitTextToSize(cleanMarkdown(flag.summary ?? ""), CONTENT_W - padding * 2 - 6 - 24) as string[];
        const detailLines = flag.detail
          ? (doc.setFontSize(8), doc.splitTextToSize(cleanMarkdown(flag.detail), CONTENT_W - padding * 2 - 6) as string[])
          : [];
        const cardH = padding * 2 + 6 + summaryLines.length * 4 + (detailLines.length > 0 ? detailLines.length * 4 + 2 : 0);
        ensureBlockSpace(cardH + 3);

        const startY = y;
        if (isHigh) {
          setFill(RISK_HIGH_FILL);
          doc.roundedRect(MARGIN_L, startY, CONTENT_W, cardH, 1.5, 1.5, "F");
          setDraw(ORANGE);
          doc.setLineWidth(0.3);
          doc.roundedRect(MARGIN_L, startY, CONTENT_W, cardH, 1.5, 1.5, "S");
        } else {
          setFill(WHITE);
          doc.roundedRect(MARGIN_L, startY, CONTENT_W, cardH, 1.5, 1.5, "F");
          setDraw(RISK_HIGH_FILL);
          doc.setLineWidth(0.3);
          doc.roundedRect(MARGIN_L, startY, CONTENT_W, cardH, 1.5, 1.5, "S");
        }
        setFill(ORANGE);
        doc.rect(MARGIN_L, startY, 1.5, cardH, "F");

        const badgeText = isHigh ? "HIGH" : "WARN";
        const badgeW = 12;
        const badgeH = 5;
        const badgeX = MARGIN_L + 4;
        const badgeY = startY + padding;
        if (isHigh) {
          setFill(ORANGE);
          doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 0.8, 0.8, "F");
          setText(WHITE);
        } else {
          setFill(RISK_HIGH_FILL);
          doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 0.8, 0.8, "F");
          setText(ORANGE);
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.text(badgeText, badgeX + badgeW / 2, badgeY + 3.5, { align: "center" });

        setText(NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(cleanMarkdown(flag.title ?? ""), badgeX + badgeW + 3, badgeY + 3.5);

        let cy = badgeY + badgeH + 3;
        setText(BLACK);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        for (const ln of summaryLines) {
          doc.text(ln, MARGIN_L + 6, cy);
          cy += 4;
        }
        if (detailLines.length > 0) {
          cy += 1;
          setText(MUTED);
          doc.setFontSize(8);
          for (const ln of detailLines) {
            doc.text(ln, MARGIN_L + 6, cy);
            cy += 4;
          }
        }

        y = startY + cardH + 3;
      }
    }
  }

  if (data.exportSections.domains) {
    doc.addPage();
    y = MARGIN_T;
    sectionHeading("Domains");

    setText(MUTED);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const intro = "Eight AIRSA domains, ordered by growth priority. Each card shows the calibration distribution across the 5 statuses for that domain.";
    const introLines = doc.splitTextToSize(intro, CONTENT_W) as string[];
    for (const ln of introLines) { doc.text(ln, MARGIN_L, y); y += 4.5; }
    y += 2;

    for (const { dimensionId, domain } of data.domains) {
      const colorHex = DOMAIN_COLORS[dimensionId] ?? "#6D6875";
      const domRgb = hexToRgb(colorHex);

      if (domain.suppressed) {
        const cardH = 14;
        ensureBlockSpace(cardH + 4);
        setFill(WHITE);
        setDraw(BORDER);
        doc.setLineWidth(0.5);
        doc.roundedRect(MARGIN_L, y, CONTENT_W, cardH, 2, 2, "FD");
        setFill(domRgb);
        doc.circle(MARGIN_L + 6, y + cardH / 2, 1.5, "F");
        setText(domRgb);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(domain.domain_name ?? DOMAIN_NAMES[dimensionId] ?? dimensionId, MARGIN_L + 11, y + cardH / 2 + 1);
        setText(MUTED);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.text("n<5 — suppressed for privacy", PAGE_W - MARGIN_R - 4, y + cardH / 2 + 1, { align: "right" });
        y += cardH + 4;
        continue;
      }

      const cardH = 32;
      ensureBlockSpace(cardH + 4);
      const startY = y;
      setFill(WHITE);
      setDraw(BORDER);
      doc.setLineWidth(0.5);
      doc.roundedRect(MARGIN_L, startY, CONTENT_W, cardH, 2, 2, "FD");

      setFill(domRgb);
      doc.circle(MARGIN_L + 6, startY + 7, 1.6, "F");
      setText(domRgb);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const domName = domain.domain_name ?? DOMAIN_NAMES[dimensionId] ?? dimensionId;
      doc.text(domName, MARGIN_L + 11, startY + 8);

      setText(domRgb);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      const tciStr = domain.tci != null ? domain.tci.toFixed(1) : "—";
      doc.text(tciStr, PAGE_W - MARGIN_R - 4, startY + 9, { align: "right" });
      const tciW = doc.getTextWidth(tciStr);
      setText(MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(` · n=${domain.n}`, PAGE_W - MARGIN_R - 4 - tciW - 2, startY + 9, { align: "right" });

      const chipY = startY + 13;
      let chipX = MARGIN_L + 11;
      const renderChip = (label: string, fillRgb: [number, number, number], textRgb: [number, number, number]) => {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        const w = doc.getTextWidth(label) + 5;
        setFill(fillRgb);
        doc.roundedRect(chipX, chipY - 3, w, 5, 1.5, 1.5, "F");
        setText(textRgb);
        doc.setFont("helvetica", "bold");
        doc.text(label, chipX + 2.5, chipY);
        chipX += w + 3;
      };
      renderChip(`Growth CPS ${(domain.cps_growth ?? 0).toFixed(2)}`, RISK_HIGH_FILL, ORANGE);
      renderChip(`Strength ${(domain.cps_strength ?? 0).toFixed(1)}%`, [232, 240, 226], GREEN);

      const barY = startY + 18;
      const barX = MARGIN_L + 4;
      const barW = CONTENT_W - 8;
      const barH = 4;
      const cs = domain.confirmed_strength_pct ?? 0;
      const bs = domain.blind_spot_pct ?? 0;
      const us = domain.underestimate_pct ?? 0;
      const other = Math.max(0, 100 - cs - bs - us);
      const segs: Array<[number, [number, number, number]]> = [
        [cs, GREEN],
        [other, TEAL],
        [bs, NAVY],
        [us, PURPLE],
      ];
      let bx = barX;
      setFill([240, 240, 240]);
      doc.rect(barX, barY, barW, barH, "F");
      for (const [pct, rgb] of segs) {
        const w = (pct / 100) * barW;
        if (w > 0) {
          setFill(rgb);
          doc.rect(bx, barY, w, barH, "F");
          bx += w;
        }
      }

      const legY = startY + 27;
      const legColW = (CONTENT_W - 8) / 4;
      const legendData: Array<[string, [number, number, number]]> = [
        [`Confirmed ${cs.toFixed(0)}%`, GREEN],
        [`Other ${other.toFixed(0)}%`, MUTED],
        [`Blind ${bs.toFixed(0)}%`, NAVY],
        [`Under ${us.toFixed(0)}%`, PURPLE],
      ];
      legendData.forEach(([lbl, rgb], i) => {
        setText(rgb);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(lbl, MARGIN_L + 4 + i * legColW, legY);
      });

      y = startY + cardH + 4;
    }
  }

  if (data.exportSections.skillInventory) {
    doc.addPage();
    y = MARGIN_T;
    sectionHeading("Skill Inventory");

    setText(MUTED);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("All 24 AIRSA skills with TCI and calibration metrics.", MARGIN_L, y);
    y += 6;

    const cols = [
      { key: "skill_number",       label: "#",          w: 8,  align: "right" as const },
      { key: "skill_name",         label: "Skill",      w: 56, align: "left" as const },
      { key: "domain_name",        label: "Domain",     w: 28, align: "left" as const },
      { key: "tci",                label: "TCI",        w: 14, align: "right" as const },
      { key: "cps_growth",         label: "Growth CPS", w: 18, align: "right" as const },
      { key: "cps_strength",       label: "Strength %", w: 18, align: "right" as const },
      { key: "blind_spot_pct",     label: "Blind %",    w: 14, align: "right" as const },
      { key: "underestimate_pct",  label: "Under %",    w: 14, align: "right" as const },
      { key: "n",                  label: "n",          w: 10, align: "right" as const },
    ];
    const rowH = 6;

    const drawHeaderRow = () => {
      setFill(SAND_BG);
      doc.rect(MARGIN_L, y, CONTENT_W, rowH, "F");
      setText(NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      let cx = MARGIN_L;
      for (const c of cols) {
        const tx = c.align === "right" ? cx + c.w - 2 : cx + 2;
        doc.text(c.label, tx, y + 4.2, c.align === "right" ? { align: "right" } : undefined);
        cx += c.w;
      }
      y += rowH;
    };

    drawHeaderRow();

    const sorted = [...data.skills].sort((a, b) => a.skill_number - b.skill_number);
    sorted.forEach((s, i) => {
      if (y + rowH > PAGE_H - MARGIN_B) {
        addFooter();
        doc.addPage();
        y = MARGIN_T;
        if (currentSectionTitle) renderContinuationHeader();
        drawHeaderRow();
      }
      if (i % 2 === 1) {
        setFill([250, 250, 252]);
        doc.rect(MARGIN_L, y, CONTENT_W, rowH, "F");
      }
      let cx = MARGIN_L;
      const cell = (text: string, w: number, align: "left" | "right", color: [number, number, number], style: "normal" | "bold" = "normal", fontSize = 8) => {
        setText(color);
        doc.setFont("helvetica", style);
        doc.setFontSize(fontSize);
        const maxW = w - 4;
        const t = truncate(text, maxW, fontSize, style);
        const tx = align === "right" ? cx + w - 2 : cx + 2;
        doc.text(t, tx, y + 4.1, align === "right" ? { align: "right" } : undefined);
        cx += w;
      };

      const domHex = DOMAIN_COLORS[s.dimension_id] ?? "#6D6875";
      const domRgb = hexToRgb(domHex);

      cell(String(s.skill_number), cols[0].w, "right", MUTED);
      cell(s.skill_name, cols[1].w, "left", BLACK);
      cell(DOMAIN_SHORT_NAMES[s.dimension_id] ?? s.domain_name ?? "", cols[2].w, "left", domRgb, "bold");
      cell((s.tci ?? 0).toFixed(1), cols[3].w, "right", NAVY, "bold");
      cell((s.cps_growth ?? 0).toFixed(2), cols[4].w, "right", ORANGE);
      cell((s.cps_strength ?? 0).toFixed(1) + "%", cols[5].w, "right", GREEN);
      cell((s.blind_spot_pct ?? 0).toFixed(1) + "%", cols[6].w, "right", NAVY);
      cell((s.underestimate_pct ?? 0).toFixed(1) + "%", cols[7].w, "right", PURPLE);
      cell(String(s.n ?? 0), cols[8].w, "right", MUTED);

      y += rowH;
    });
  }

  if (data.exportSections.managerCalibration) {
    doc.addPage();
    y = MARGIN_T;
    sectionHeading("Manager Calibration");

    if (data.managerCalibration.top.length === 0 && data.managerCalibration.bottom.length === 0) {
      setText(MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("No supervisors meet the 3-reports privacy threshold for this slice.", MARGIN_L, y);
    } else {
      const cardW = (CONTENT_W - 6) / 2;
      const cardH = 26;

      const tciZoneRgb = (tci: number): [number, number, number] => {
        if (tci >= 50) return GREEN;
        if (tci >= 35) return ORANGE;
        return NAVY;
      };

      const renderManagerCard = (m: AIRSADashboardPdfManager, x: number) => {
        setFill(WHITE);
        setDraw(BORDER);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");

        const padding = 4;
        setText(NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        const nameMaxW = cardW - padding * 2;
        doc.text(truncate(m.supervisor_name, nameMaxW, 11, "bold"), x + padding, y + 7);

        const zone = tciZoneRgb(m.tci ?? 0);
        setText(zone);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        const tciStr = (m.tci ?? 0).toFixed(1);
        doc.text(tciStr, x + padding, y + 16);
        const tciW = doc.getTextWidth(tciStr);
        setText(MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(` ${m.n_reports} reports · ${m.n_skill_pairs} pairs`, x + padding + tciW + 1, y + 16);

        const delta = (m.blind_spot_pct ?? 0) - (m.underestimate_pct ?? 0);
        let asymLabel = "Balanced";
        let asymColor: [number, number, number] = GREEN;
        if (delta > 5) { asymLabel = "Over-rates reports"; asymColor = NAVY; }
        else if (delta < -5) { asymLabel = "Under-rates reports"; asymColor = PURPLE; }
        setText(asymColor);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(asymLabel, x + cardW - padding, y + 16, { align: "right" });

        setText(MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Blind spot ${(m.blind_spot_pct ?? 0).toFixed(0)}%`, x + padding, y + cardH - padding);
        doc.text(`Underestimate ${(m.underestimate_pct ?? 0).toFixed(0)}%`, x + cardW - padding, y + cardH - padding, { align: "right" });
      };

      const renderManagerSection = (title: string, list: AIRSADashboardPdfManager[]) => {
        if (list.length === 0) return;
        ensureBlockSpace(15 + cardH);
        setText(NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(title, MARGIN_L, y);
        y += 2;
        setDraw(NAVY);
        doc.setLineWidth(0.4);
        doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
        y += 5;

        for (let i = 0; i < list.length; i += 2) {
          ensureBlockSpace(cardH + 4);
          const left = list[i];
          const right = list[i + 1];
          renderManagerCard(left, MARGIN_L);
          if (right) renderManagerCard(right, MARGIN_L + cardW + 6);
          y += cardH + 4;
        }
        y += 2;
      };

      renderManagerSection(`Top ${data.managerCalibration.top.length} best calibrated`, data.managerCalibration.top);
      if (data.managerCalibration.bottom.length > 0) {
        y += 4;
        renderManagerSection(`Bottom ${data.managerCalibration.bottom.length} requiring attention`, data.managerCalibration.bottom);
      }
    }
  }

  if (data.exportSections.trends) {
    doc.addPage();
    y = MARGIN_T;
    sectionHeading("Trends");

    if (data.narrativeHistory.length === 0) {
      setText(MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("No AI narratives generated yet for this slice. Generate one to start tracking TCI over time.", MARGIN_L, y);
    } else {
      if (data.narrativeHistory.length === 1) {
        setText(MUTED);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.text("Only one AI narrative generated for this slice. Generate a second to see TCI trend.", MARGIN_L, y);
        y += 6;
      }

      const cols = [
        { key: "generated", label: "Generated", w: 60 },
        { key: "tci",       label: "TCI",       w: 30 },
        { key: "n",         label: "Pairs (n)", w: 30 },
      ];
      const rowH = 7;
      const tableW = cols.reduce((acc, c) => acc + c.w, 0);

      const drawHeader = () => {
        setFill(SAND_BG);
        doc.rect(MARGIN_L, y, tableW, rowH, "F");
        setText(NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        let cx = MARGIN_L;
        for (const c of cols) {
          doc.text(c.label, cx + 2, y + 4.8);
          cx += c.w;
        }
        y += rowH;
      };
      drawHeader();

      const sorted = [...data.narrativeHistory].sort((a, b) =>
        new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
      );

      sorted.forEach((h, i) => {
        if (y + rowH > PAGE_H - MARGIN_B) {
          addFooter();
          doc.addPage();
          y = MARGIN_T;
          if (currentSectionTitle) renderContinuationHeader();
          drawHeader();
        }
        let cx = MARGIN_L;
        const dateStr = new Date(h.generated_at).toLocaleDateString();

        setText(BLACK);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(dateStr, cx + 2, y + 4.8);
        if (i === 0) {
          const dw = doc.getTextWidth(dateStr);
          const badgeX = cx + 2 + dw + 2;
          setFill(TEAL);
          doc.roundedRect(badgeX, y + 1.5, 12, 5, 1, 1, "F");
          setText(WHITE);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6);
          doc.text("LATEST", badgeX + 6, y + 4.8, { align: "center" });
        }
        cx += cols[0].w;

        setText(GREEN);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(h.index_score != null ? h.index_score.toFixed(1) : "—", cx + 2, y + 4.8);
        cx += cols[1].w;

        setText(MUTED);
        doc.setFont("helvetica", "normal");
        doc.text(String(h.participant_count), cx + 2, y + 4.8);

        y += rowH;
      });

      y += 4;
      setText(MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("Trend data reflects all AI interpretation generations for this slice. Higher TCI = better calibrated workforce.", MARGIN_L, y);
    }
  }

  addFooter();
  doc.save(`BrainWise-AIRSA-CompanyDashboard-${dateStr}.pdf`);
}
