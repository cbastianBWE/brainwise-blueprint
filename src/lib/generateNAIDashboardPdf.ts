import jsPDF from "jspdf";

// ============================================================
// Types
// ============================================================

export interface NAIDashboardPdfSections {
  overview: boolean;
  dimensions: boolean;
  interpretation: boolean;
  leaderPerspective: boolean;
  trends: boolean;
  interventions: boolean;
  crossInstrument: boolean;
}

export interface NAIDashboardPdfData {
  sliceLabel: string;
  generatedAt: string;
  participantCount: number;
  indexScore: number | null;
  latestNarrativeGeneratedAt: string | null;

  dims: Record<string, {
    avg_score: number;
    pct_at_75_plus: number;
    pct_high: number;
    pct_elevated: number;
    pct_low: number;
  }>;

  usage: {
    active_users: number;
    seat_count: number;
    completions_30d: Record<string, number>;
    completion_rate: { completed: number; eligible: number; pct: number };
    ai_usage: { chat_used: number; chat_allowance: number; ai_chat_enabled: boolean } | null;
    dept_participation: Array<{
      department_name: string;
      completed: number;
      eligible: number;
      pct: number;
    }>;
  } | null;

  riskFlags: Array<{
    id: string;
    level: string;
    title: string;
    summary: string;
    detail: string;
  }>;

  latestNarrative: {
    narrative_text: {
      business_meaning?: string;
      benefits?: string;
      risks?: string;
      next_steps?: string;
      reassessment_note?: string;
    };
  } | null;

  interventions: Array<{
    title: string;
    description: string;
    target_dimensions: string[];
    priority: string;
    time_horizon: string;
    intervention_type: string;
  }>;

  narrativeHistory: Array<{
    generated_at: string;
    index_score: number | null;
    dimension_scores?: Record<string, { avg_score: number }>;
    participant_count: number;
  }>;

  ptpAggregate: {
    suppressed: boolean;
    dimensions?: Record<string, { avg_score: number }>;
  } | null;

  coElevationPatterns: Array<{
    naiDimId: string;
    naiDimName: string;
    ptpDimId: string;
    ptpDimName: string;
    naiScore: number;
    ptpScore: number;
    label: string;
    description: string;
  }>;

  crossInstrumentRow: {
    id: string;
    primary_narrative_id: string;
    summary: string | null;
    generated_at: string;
    recommendations: Array<{
      id: string;
      title: string;
      rationale: string;
      steps: string[];
      priority: 'high' | 'medium' | 'low';
      time_horizon: 'immediate' | '30-day' | '90-day';
      anchor_co_elevation: string | null;
    }>;
  } | null;

  deltaResult: {
    suppressed: boolean;
    self_participant_count: number;
    epn_participant_count: number;
    delta?: Record<string, {
      epn_mean: number | null;
      self_mean: number | null;
      delta: number | null;
    }>;
  } | null;

  deltaNarrative: {
    generated_at: string;
    narrative_text: {
      summary?: string;
      alignment_overview?: string;
      key_gaps?: Array<{ title: string; description: string }>;
      recommendations?: Array<{
        title: string;
        rationale: string;
        steps?: string[];
        priority: string;
        time_horizon: string;
        intervention_type?: string;
      }>;
    };
  } | null;

  exportSections: NAIDashboardPdfSections;
}

// ============================================================
// Constants
// ============================================================

const NAVY: [number, number, number] = [2, 31, 54];
const ORANGE: [number, number, number] = [245, 116, 26];
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 14;
const MARGIN_R = 14;
const MARGIN_B = 18;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

const DIM_NAMES: Record<string, string> = {
  "DIM-NAI-01": "Certainty",
  "DIM-NAI-02": "Agency",
  "DIM-NAI-03": "Fairness",
  "DIM-NAI-04": "Ego Stability",
  "DIM-NAI-05": "Saturation",
};

const DIM_COLORS: Record<string, string> = {
  "DIM-NAI-01": "#021F36",
  "DIM-NAI-02": "#F5741A",
  "DIM-NAI-03": "#006D77",
  "DIM-NAI-04": "#3C096C",
  "DIM-NAI-05": "#7a5800",
};

const DIM_WEIGHTS: Record<string, number> = {
  "DIM-NAI-03": 0.28,
  "DIM-NAI-04": 0.25,
  "DIM-NAI-02": 0.22,
  "DIM-NAI-01": 0.15,
  "DIM-NAI-05": 0.10,
};

const DIMS_BY_WEIGHT = ["DIM-NAI-03", "DIM-NAI-04", "DIM-NAI-02", "DIM-NAI-01", "DIM-NAI-05"];

const PTP_DIM_NAMES: Record<string, string> = {
  "DIM-PTP-01": "Protection",
  "DIM-PTP-02": "Participation",
  "DIM-PTP-03": "Prediction",
  "DIM-PTP-04": "Purpose",
  "DIM-PTP-05": "Pleasure",
};
const PTP_DIM_COLORS: Record<string, string> = {
  "DIM-PTP-01": "#021F36",
  "DIM-PTP-02": "#006D77",
  "DIM-PTP-03": "#6D6875",
  "DIM-PTP-04": "#3C096C",
  "DIM-PTP-05": "#2D6A4F",
};
const PTP_TRI_W: Record<string, number> = {
  "DIM-PTP-01": 0.25,
  "DIM-PTP-02": 0.30,
  "DIM-PTP-03": 0.45,
};
const PTP_RSI_W: Record<string, number> = {
  "DIM-PTP-04": 0.60,
  "DIM-PTP-05": 0.40,
};
const PTP_ORDER = ["DIM-PTP-01", "DIM-PTP-02", "DIM-PTP-03", "DIM-PTP-04", "DIM-PTP-05"];

// ============================================================
// Helpers
// ============================================================

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function activationLabel(score: number): { label: string; bg: string; color: string } {
  if (score >= 76) return { label: "High", bg: "#faece7", color: "#993c1d" };
  if (score >= 50) return { label: "Elevated", bg: "#faeeda", color: "#633806" };
  return { label: "Low", bg: "#e1f5ee", color: "#0f6e56" };
}

// ============================================================
// Main
// ============================================================

export function generateNAIDashboardPdf(data: NAIDashboardPdfData): void {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = PAGE_W;
  const PH = PAGE_H;
  const ML = MARGIN_L;
  const MR = MARGIN_R;
  const CW = CONTENT_W;
  const MB = MARGIN_B;
  let y = 0;
  let pageNum = 1;

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const dateStr = new Date().toISOString().split("T")[0];

  const {
    sliceLabel,
    indexScore,
    participantCount,
    latestNarrativeGeneratedAt,
    dims,
    usage,
    riskFlags,
    latestNarrative,
    interventions,
    narrativeHistory,
    ptpAggregate,
    coElevationPatterns,
    crossInstrumentRow,
    deltaResult,
    deltaNarrative,
    exportSections,
  } = data;

  const splitText = (text: string, maxW: number, size: number, style: string) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", style);
    return pdf.splitTextToSize(text, maxW);
  };

  const addFooter = () => {
    pdf.setFontSize(7);
    pdf.setTextColor(160, 160, 160);
    pdf.setFont("helvetica", "normal");
    pdf.text(`BrainWise · NAI Company Dashboard · Confidential · Page ${pageNum}`, PW / 2, PH - 5, { align: "center" });
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.2);
    pdf.line(ML, PH - 8, PW - MR, PH - 8);
  };

  const newPage = (label?: string) => {
    addFooter();
    pdf.addPage();
    pageNum++;
    y = 14;
    if (label) {
      pdf.setFillColor(249, 247, 241);
      pdf.rect(ML, y, CW, 7, "F");
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(2, 31, 54);
      pdf.text(label, ML + 3, y + 5);
      y += 11;
    }
  };

  const checkY = (needed: number, label?: string) => {
    if (y + needed > PH - MB) newPage(label);
  };

  // ── COVER ────────────────────────────────────────────────────────────
  pdf.setFillColor(2, 31, 54);
  pdf.rect(0, 0, PW, 72, "F");

  pdf.setFontSize(26); pdf.setFont("helvetica", "bold"); pdf.setTextColor(255, 255, 255);
  pdf.text("BrainWise", ML, 30);
  pdf.setFontSize(12); pdf.setFont("helvetica", "normal");
  pdf.text("NAI · AI Adoption Readiness Dashboard", ML, 42);
  pdf.setFontSize(10); pdf.setTextColor(200, 220, 235);
  pdf.text("Company Dashboard", ML, 53);

  if (indexScore !== null) {
    pdf.setFontSize(28); pdf.setFont("helvetica", "bold"); pdf.setTextColor(255, 255, 255);
    pdf.text(String(indexScore), PW - ML, 34, { align: "right" });
    pdf.setFontSize(7); pdf.setFont("helvetica", "normal"); pdf.setTextColor(200, 220, 235);
    pdf.text("AI Readiness Index", PW - ML, 42, { align: "right" });
  }

  let fy = 82;
  const fldLabel = (lbl: string, val: string, fx: number, ffy: number) => {
    pdf.setFontSize(7.5); pdf.setTextColor(130, 120, 130); pdf.setFont("helvetica", "normal");
    pdf.text(lbl, fx, ffy);
    pdf.setFontSize(10.5); pdf.setTextColor(20, 20, 20); pdf.setFont("helvetica", "bold");
    pdf.text(val, fx, ffy + 6);
  };
  fldLabel("Organization slice", sliceLabel, ML, fy);
  fldLabel("Participants", String(participantCount), ML + 100, fy);
  fy += 20;
  fldLabel("Generated", today, ML, fy);
  if (latestNarrativeGeneratedAt) {
    fldLabel("AI interpretation date", new Date(latestNarrativeGeneratedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), ML + 100, fy);
  }
  fy += 20;

  if (Object.keys(dims).length > 0) {
    pdf.setFontSize(7); pdf.setTextColor(130, 120, 130); pdf.setFont("helvetica", "normal");
    pdf.text("C.A.F.E.S. DIMENSION SCORES", ML, fy);
    fy += 5;
    DIMS_BY_WEIGHT.forEach((dimId) => {
      const dim = dims[dimId]; if (!dim) return;
      const act = activationLabel(dim.avg_score);
      const [r, g, b] = hexRgb(DIM_COLORS[dimId]);
      pdf.setFillColor(r, g, b); pdf.circle(ML + 2, fy - 1.2, 1.8, "F");
      pdf.setFontSize(8); pdf.setFont("helvetica", "bold"); pdf.setTextColor(r, g, b);
      pdf.text(`${DIM_NAMES[dimId]} (${Math.round(DIM_WEIGHTS[dimId] * 100)}%)`, ML + 6, fy);
      pdf.setFont("helvetica", "normal"); pdf.setTextColor(20, 20, 20);
      pdf.text(String(Math.round(dim.avg_score)), ML + 75, fy);
      pdf.setFontSize(7); pdf.setTextColor(130, 120, 130);
      pdf.text(act.label, ML + 86, fy);
      fy += 7;
    });
  }

  const discText = "This report is generated by BrainWise's AI interpretation engine. Data is aggregated across participants with a minimum of 5. For authorized HR and leadership use only. Confidential.";
  const discLines = splitText(discText, CW - 8, 7, "normal");
  const discH = discLines.length * 3.5 + 6;
  const discY = PH - 50;
  pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, discY, CW, discH, 2, 2, "F");
  pdf.setFontSize(7); pdf.setTextColor(130, 120, 130); pdf.setFont("helvetica", "normal");
  pdf.text(discLines, ML + 4, discY + 4.5);
  addFooter();

  // ── OVERVIEW ─────────────────────────────────────────────────────────
  if (exportSections.overview) {
    pdf.addPage(); pageNum++; y = 14;
    pdf.setFillColor(249, 247, 241); pdf.rect(ML, y, CW, 7, "F");
    pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
    pdf.text("OVERVIEW", ML + 3, y + 5); y += 11;

    const methBody = "The AI Readiness Index (0–100) is calculated as 100 minus the weighted average of the five C.A.F.E.S. friction scores. Higher = more ready. Dimensions are weighted by their impact on sustained AI adoption behavior per 2025 NLI research.";
    const methLines = splitText(methBody, CW - 10, 7.5, "normal");
    const barsH = DIMS_BY_WEIGHT.length * 4.5;
    const methH = 5 + 4.5 + methLines.length * 4 + 3 + barsH + 3;
    pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, y, CW, methH, 2, 2, "F");
    pdf.setFillColor(2, 31, 54); pdf.rect(ML, y, 1.5, methH, "F");
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
    pdf.text("About the AI Readiness Index · weighted methodology", ML + 5, y + 5);
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(50, 50, 50);
    pdf.text(methLines, ML + 5, y + 10);
    let bsy = y + 10 + methLines.length * 4 + 2;
    DIMS_BY_WEIGHT.forEach((dimId) => {
      const [r, g, b] = hexRgb(DIM_COLORS[dimId]);
      pdf.setFontSize(6); pdf.setFont("helvetica", "bold"); pdf.setTextColor(r, g, b);
      pdf.text(`${DIM_NAMES[dimId]} ${Math.round(DIM_WEIGHTS[dimId] * 100)}%`, ML + 5, bsy);
      pdf.setFillColor(r, g, b);
      pdf.rect(ML + 50, bsy - 2.2, (DIM_WEIGHTS[dimId] / 0.28) * 38, 2.2, "F");
      bsy += 4.5;
    });
    y += methH + 5;

    if (usage) {
      checkY(18);
      const cards = [
        { label: "ACTIVE USERS", value: `${usage.active_users}/${usage.seat_count}`, sub: `${Math.round((usage.active_users / Math.max(usage.seat_count, 1)) * 100)}% of seats` },
        { label: "COMPLETIONS (30D)", value: String(usage.completions_30d?.["INST-002"] ?? 0), sub: "NAI assessments" },
        { label: "COMPLETION RATE", value: `${Math.round(usage.completion_rate?.pct ?? 0)}%`, sub: `${usage.completion_rate?.completed ?? 0} of ${usage.completion_rate?.eligible ?? 0} users` },
        { label: "AI CHAT USAGE", value: `${usage.ai_usage?.chat_used ?? 0}/${usage.ai_usage?.chat_allowance ?? 0}`, sub: usage.ai_usage?.ai_chat_enabled ? "messages this month" : "not enabled" },
      ];
      const cw = (CW - 9) / 4;
      cards.forEach((c, i) => {
        const cx2 = ML + i * (cw + 3);
        pdf.setFillColor(245, 247, 250); pdf.roundedRect(cx2, y, cw, 16, 1.5, 1.5, "F");
        pdf.setFontSize(6); pdf.setFont("helvetica", "normal"); pdf.setTextColor(130, 120, 130);
        pdf.text(c.label, cx2 + 3, y + 4.5);
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
        pdf.text(c.value, cx2 + 3, y + 10.5);
        pdf.setFontSize(6.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(130, 120, 130);
        pdf.text(c.sub, cx2 + 3, y + 15);
      });
      y += 20;
    }

    if (riskFlags.length > 0) {
      checkY(12);
      y += 2;
      pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
      pdf.text(`Risk Flags · generated ${latestNarrativeGeneratedAt ? new Date(latestNarrativeGeneratedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}`, ML, y);
      y += 1.5;
      pdf.setDrawColor(2, 31, 54); pdf.setLineWidth(0.4);
      pdf.line(ML, y, ML + CW, y); y += 5;

      riskFlags.forEach(flag => {
        const borderColor: [number, number, number] = flag.level === "high" ? [163, 45, 45] : [200, 100, 20];
        const lvlLines = splitText(flag.level === "high" ? "HIGH RISK" : "WARNING", CW - 8, 6.5, "bold");
        const titleLns = splitText(flag.title, CW - 8, 8.5, "bold");
        const summLns = splitText(flag.summary, CW - 8, 7.5, "normal");
        const detLns = splitText(flag.detail, CW - 8, 7.5, "normal");
        const cardH = 4 + lvlLines.length * 4 + titleLns.length * 4.5 + 2 + summLns.length * 4 + 2 + detLns.length * 4 + 4;
        checkY(cardH + 4);
        pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, y, CW, cardH, 2, 2, "F");
        pdf.setFillColor(borderColor[0], borderColor[1], borderColor[2]); pdf.rect(ML, y, 2, cardH, "F");
        let cy2 = y + 4;
        pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(borderColor[0], borderColor[1], borderColor[2]);
        pdf.text(flag.level === "high" ? "HIGH RISK" : "WARNING", ML + 5, cy2); cy2 += lvlLines.length * 4;
        pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
        pdf.text(titleLns, ML + 5, cy2); cy2 += titleLns.length * 4.5 + 2;
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(50, 50, 50);
        pdf.text(summLns, ML + 5, cy2); cy2 += summLns.length * 4 + 2;
        pdf.setTextColor(70, 70, 70);
        pdf.text(detLns, ML + 5, cy2);
        y += cardH + 4;
      });
    }

    if (Object.keys(dims).length > 0) {
      checkY(14);
      y += 2;
      pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
      pdf.text("C.A.F.E.S. Dimension Summary", ML, y);
      y += 1.5;
      pdf.setDrawColor(2, 31, 54); pdf.setLineWidth(0.4); pdf.line(ML, y, ML + CW, y); y += 4;
      pdf.setFillColor(237, 233, 223); pdf.rect(ML, y, CW, 6, "F");
      pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(109, 104, 117);
      pdf.text("DIMENSION", ML + 2, y + 4); pdf.text("SCORE", ML + 72, y + 4);
      pdf.text("ACTIVATION", ML + 90, y + 4); pdf.text("AT 75+", ML + 122, y + 4);
      pdf.text("LOW %", ML + 138, y + 4); pdf.text("ELEV %", ML + 155, y + 4);
      y += 6;
      DIMS_BY_WEIGHT.forEach((dimId, i) => {
        const dim = dims[dimId]; if (!dim) return;
        const act = activationLabel(dim.avg_score);
        const [r, g, b] = hexRgb(DIM_COLORS[dimId]);
        if (i % 2 === 0) { pdf.setFillColor(250, 250, 252); pdf.rect(ML, y, CW, 7, "F"); }
        pdf.setFillColor(r, g, b); pdf.circle(ML + 3, y + 3.5, 1.8, "F");
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(r, g, b);
        pdf.text(DIM_NAMES[dimId], ML + 8, y + 4.5);
        pdf.setTextColor(2, 31, 54);
        pdf.text(String(Math.round(dim.avg_score)), ML + 72, y + 4.5);
        const actCol: [number, number, number] = act.label === "High" ? [163, 45, 45] : act.label === "Elevated" ? [99, 56, 6] : [15, 110, 86];
        pdf.setFontSize(7); pdf.setFont("helvetica", "normal"); pdf.setTextColor(actCol[0], actCol[1], actCol[2]);
        pdf.text(act.label, ML + 90, y + 4.5);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`${Math.round(dim.pct_at_75_plus)}%`, ML + 122, y + 4.5);
        pdf.text(`${Math.round(dim.pct_low)}%`, ML + 138, y + 4.5);
        pdf.text(`${Math.round(dim.pct_elevated)}%`, ML + 155, y + 4.5);
        y += 7;
      });
      y += 4;
    }

    if (usage?.dept_participation && usage.dept_participation.length > 0) {
      checkY(14);
      y += 2;
      pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
      pdf.text("Participation by Department", ML, y);
      y += 1.5;
      pdf.setDrawColor(2, 31, 54); pdf.setLineWidth(0.4); pdf.line(ML, y, ML + CW, y); y += 4;
      pdf.setFillColor(237, 233, 223); pdf.rect(ML, y, CW, 6, "F");
      pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(109, 104, 117);
      pdf.text("DEPARTMENT", ML + 2, y + 4); pdf.text("COMPLETED", ML + 75, y + 4); pdf.text("RATE", ML + 105, y + 4);
      y += 6;
      [...usage.dept_participation].sort((a, b) => b.pct - a.pct).forEach((dept, i) => {
        if (i % 2 === 0) { pdf.setFillColor(250, 250, 252); pdf.rect(ML, y, CW, 7, "F"); }
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(30, 30, 30);
        pdf.text(dept.department_name, ML + 2, y + 4.5);
        pdf.text(`${dept.completed}/${dept.eligible}`, ML + 75, y + 4.5);
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
        pdf.text(`${Math.round(dept.pct)}%`, ML + 105, y + 4.5);
        pdf.setFillColor(225, 225, 225); pdf.rect(ML + 118, y + 2, 58, 3.5, "F");
        pdf.setFillColor(0, 109, 119); pdf.rect(ML + 118, y + 2, Math.min(58, dept.pct / 100 * 58), 3.5, "F");
        y += 7;
      });
      y += 4;
    }
  }

  // ── DIMENSIONS ───────────────────────────────────────────────────────
  if (exportSections.dimensions) {
    newPage("DIMENSIONS");
    const descW = CW - 10;

    DIMS_BY_WEIGHT.forEach(dimId => {
      const dim = dims[dimId]; if (!dim) return;
      const act = activationLabel(dim.avg_score);
      const [r, g, b] = hexRgb(DIM_COLORS[dimId]);
      const dimInterventions = interventions.filter(iv => iv.target_dimensions?.includes(dimId));

      const interpText = `${DIM_NAMES[dimId]} carries a ${Math.round(DIM_WEIGHTS[dimId] * 100)}% weight in the readiness index. Score of ${Math.round(dim.avg_score)} — ${act.label.toLowerCase()} activation.${dim.avg_score >= 60 ? " This is the most operationally significant finding in this slice." : dim.avg_score < 50 ? " This is currently an organizational asset — protect it." : " Monitor for upward movement."}`;
      const interpLns = splitText(interpText, descW, 7.5, "normal");

      let cardH = 22;
      cardH += interpLns.length * 4;
      if (dimInterventions.length > 0) {
        cardH += 8;
        dimInterventions.forEach(iv => {
          const tl = splitText(iv.title, descW - 45, 7.5, "bold");
          const dl = splitText(iv.description, descW, 7.5, "normal");
          cardH += 6 + tl.length * 4.5 + dl.length * 4 + 4;
        });
      }
      cardH += 4;

      checkY(cardH + 5, "DIMENSIONS (cont.)");

      pdf.setFillColor(249, 247, 241);
      pdf.roundedRect(ML, y, CW, cardH, 2, 2, "F");
      pdf.setFillColor(r, g, b); pdf.rect(ML, y, 2, cardH, "F");

      pdf.setFillColor(r, g, b); pdf.circle(ML + 6, y + 6, 2.5, "F");
      pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(r, g, b);
      pdf.text(DIM_NAMES[dimId], ML + 11, y + 7);
      const nw = pdf.getTextWidth(DIM_NAMES[dimId]);
      pdf.setFontSize(7); pdf.setFont("helvetica", "normal"); pdf.setTextColor(245, 116, 26);
      pdf.text(`Weight ${Math.round(DIM_WEIGHTS[dimId] * 100)}%`, ML + 11 + nw + 3, y + 7);

      pdf.setFontSize(15); pdf.setFont("helvetica", "bold"); pdf.setTextColor(r, g, b);
      pdf.text(String(Math.round(dim.avg_score)), ML + CW - 18, y + 8, { align: "right" });
      const actCol: [number, number, number] = act.label === "High" ? [163, 45, 45] : act.label === "Elevated" ? [99, 56, 6] : [15, 110, 86];
      pdf.setFontSize(7); pdf.setFont("helvetica", "normal"); pdf.setTextColor(actCol[0], actCol[1], actCol[2]);
      pdf.text(act.label, ML + CW - 4, y + 8, { align: "right" });

      const barY = y + 13;
      const barW = CW - 10;
      pdf.setFillColor(225, 241, 238); pdf.rect(ML + 5, barY, barW * (dim.pct_low / 100), 3, "F");
      pdf.setFillColor(250, 238, 218); pdf.rect(ML + 5 + barW * (dim.pct_low / 100), barY, barW * (dim.pct_elevated / 100), 3, "F");
      pdf.setFillColor(250, 236, 231); pdf.rect(ML + 5 + barW * ((dim.pct_low + dim.pct_elevated) / 100), barY, barW * (dim.pct_high / 100), 3, "F");
      pdf.setFontSize(6); pdf.setTextColor(130, 120, 130); pdf.setFont("helvetica", "normal");
      pdf.text(`Low ${Math.round(dim.pct_low)}%`, ML + 5, barY + 7);
      pdf.text(`Elevated ${Math.round(dim.pct_elevated)}%`, ML + CW / 2, barY + 7, { align: "center" });
      pdf.text(`High ${Math.round(dim.pct_high)}%`, ML + CW - 5, barY + 7, { align: "right" });

      let cy2 = barY + 11;
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
      pdf.text(interpLns, ML + 5, cy2);
      cy2 += interpLns.length * 4 + 2;

      if (dimInterventions.length > 0) {
        pdf.setFontSize(7); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
        pdf.text("Interventions targeting this dimension", ML + 5, cy2);
        cy2 += 6;
        dimInterventions.forEach(iv => {
          const innerTextW = CW - 16;
          const tl = splitText(iv.title, innerTextW - 45, 7.5, "bold");
          const dl = splitText(iv.description, innerTextW, 7.5, "normal");
          const ivH = 4.5 + tl.length * 4.5 + 2 + dl.length * 4 + 5;
          pdf.setFillColor(237, 233, 223); pdf.roundedRect(ML + 5, cy2, CW - 10, ivH, 1.5, 1.5, "F");
          pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
          pdf.text(tl, ML + 8, cy2 + 4.5);
          const pCol: [number, number, number] = iv.priority === "high" ? [153, 60, 29] : iv.priority === "medium" ? [99, 56, 6] : [15, 110, 86];
          pdf.setFontSize(6.5); pdf.setFont("helvetica", "normal");
          pdf.setTextColor(pCol[0], pCol[1], pCol[2]); pdf.text(iv.priority, ML + CW - 8, cy2 + 4.5, { align: "right" });
          pdf.setTextColor(60, 9, 108); pdf.text(iv.time_horizon, ML + CW - 22, cy2 + 4.5, { align: "right" });
          pdf.setTextColor(2, 31, 54); pdf.text(iv.intervention_type, ML + CW - 42, cy2 + 4.5, { align: "right" });
          pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(70, 70, 70);
          pdf.text(dl, ML + 8, cy2 + 4.5 + tl.length * 4.5 + 2);
          cy2 += ivH + 2;
        });
      }
      y += cardH + 5;
    });
  }

  // ── AI INTERPRETATION ────────────────────────────────────────────────
  if (exportSections.interpretation && latestNarrative) {
    newPage("AI INTERPRETATION");

    if (Object.keys(dims).length > 0) {
      checkY(24);
      const dw = (CW - 16) / 5;
      DIMS_BY_WEIGHT.forEach((dimId, i) => {
        const dim = dims[dimId]; if (!dim) return;
        const act = activationLabel(dim.avg_score);
        const [r, g, b] = hexRgb(DIM_COLORS[dimId]);
        const actBg: [number, number, number] = act.label === "High" ? [250, 236, 231] : act.label === "Elevated" ? [250, 238, 218] : [225, 245, 238];
        const cx2 = ML + i * (dw + 4);
        pdf.setFillColor(actBg[0], actBg[1], actBg[2]); pdf.roundedRect(cx2, y, dw, 20, 2, 2, "F");
        pdf.setFontSize(6); pdf.setFont("helvetica", "bold"); pdf.setTextColor(r, g, b);
        pdf.text(DIM_NAMES[dimId], cx2 + dw / 2, y + 5, { align: "center" });
        pdf.setFontSize(13); pdf.setFont("helvetica", "bold");
        pdf.text(String(Math.round(dim.avg_score)), cx2 + dw / 2, y + 13, { align: "center" });
        pdf.setFontSize(6); pdf.setFont("helvetica", "normal");
        pdf.text(act.label, cx2 + dw / 2, y + 18.5, { align: "center" });
      });
      y += 24;
      pdf.setFontSize(6.5); pdf.setTextColor(130, 120, 130); pdf.setFont("helvetica", "normal");
      pdf.text("Ordered by index weight: Fairness 28% · Ego Stability 25% · Agency 22% · Certainty 15% · Saturation 10%", ML + CW / 2, y, { align: "center" });
      y += 6;
    }

    const narSections = [
      { key: "business_meaning", label: "WHAT THIS MEANS FOR YOUR BUSINESS" },
      { key: "benefits", label: "POTENTIAL BENEFITS VISIBLE IN THE DATA" },
      { key: "risks", label: "POTENTIAL RISKS IF UNADDRESSED" },
      { key: "next_steps", label: "RECOMMENDED NEXT STEPS" },
    ] as const;

    narSections.forEach(s => {
      const text = latestNarrative.narrative_text[s.key];
      if (!text) return;
      const lines = splitText(text, CW - 12, 8, "normal");
      const cardH = 10 + lines.length * 4.2 + 4;
      checkY(cardH + 4, "AI INTERPRETATION (cont.)");
      pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, y, CW, cardH, 2, 2, "F");
      pdf.setFillColor(245, 116, 26); pdf.rect(ML, y, 2, cardH, "F");
      pdf.setFontSize(7); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
      pdf.text(s.label, ML + 5, y + 6);
      pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(40, 40, 40);
      pdf.text(lines, ML + 5, y + 11);
      y += cardH + 4;
    });

    if (latestNarrative.narrative_text.reassessment_note) {
      const rLines = splitText(`Reassessment: ${latestNarrative.narrative_text.reassessment_note}`, CW - 8, 7.5, "normal");
      const rH = rLines.length * 4 + 6;
      checkY(rH + 4, "AI INTERPRETATION (cont.)");
      pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, y, CW, rH, 2, 2, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(80, 80, 80);
      pdf.text(rLines, ML + 4, y + 5);
      y += rH + 6;
    }
  }

  // ── INTERVENTIONS ────────────────────────────────────────────────────
  if (exportSections.interventions && interventions.length > 0) {
    newPage("INTERVENTIONS");
    pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
    pdf.text("Structured Interventions", ML, y);
    y += 1.5;
    pdf.setDrawColor(2, 31, 54); pdf.setLineWidth(0.4); pdf.line(ML, y, ML + CW, y); y += 5;

    interventions.forEach(iv => {
      const tLines = splitText(iv.title, CW - 55, 8, "bold");
      const dLines = splitText(iv.description, CW - 8, 7.5, "normal");
      const targText = `Targets: ${iv.target_dimensions?.map(d => DIM_NAMES[d] ?? d).join(" · ")}`;
      const ivH = 5 + tLines.length * 4.5 + dLines.length * 4 + 5 + 4;
      checkY(ivH + 4, "INTERVENTIONS (cont.)");
      pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, y, CW, ivH, 2, 2, "F");
      pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3);
      pdf.roundedRect(ML, y, CW, ivH, 2, 2, "S");
      pdf.setFontSize(8); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
      pdf.text(tLines, ML + 4, y + 5);
      const pCol: [number, number, number] = iv.priority === "high" ? [153, 60, 29] : iv.priority === "medium" ? [99, 56, 6] : [15, 110, 86];
      pdf.setFontSize(6.5); pdf.setFont("helvetica", "normal");
      pdf.setTextColor(pCol[0], pCol[1], pCol[2]); pdf.text(iv.priority, ML + CW - 4, y + 5, { align: "right" });
      pdf.setTextColor(60, 9, 108); pdf.text(iv.time_horizon, ML + CW - 20, y + 5, { align: "right" });
      pdf.setTextColor(50, 50, 50); pdf.text(iv.intervention_type, ML + CW - 40, y + 5, { align: "right" });
      let iy = y + 5 + tLines.length * 4.5;
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
      pdf.text(dLines, ML + 4, iy);
      iy += dLines.length * 4 + 3;
      pdf.setFontSize(6.5); pdf.setTextColor(130, 120, 130);
      pdf.text(targText, ML + 4, iy);
      y += ivH + 4;
    });
  }

  // ── TRENDS ───────────────────────────────────────────────────────────
  if (exportSections.trends && narrativeHistory.length > 0) {
    newPage("TRENDS");
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(80, 80, 80);
    pdf.text("Trend data across AI interpretation generations. Lower dimension scores = improving readiness.", ML, y); y += 7;

    const colGen = ML + 2;
    const colIdx = ML + 52;
    const colDims = [74, 94, 112, 130, 148];
    const colN = ML + CW - 2;

    checkY(7);
    pdf.setFillColor(237, 233, 223); pdf.rect(ML, y, CW, 6, "F");
    pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(109, 104, 117);
    pdf.text("GENERATED", colGen, y + 4);
    pdf.text("INDEX", colIdx, y + 4);
    DIMS_BY_WEIGHT.forEach((dimId, i) => {
      const [r, g, b] = hexRgb(DIM_COLORS[dimId]);
      pdf.setTextColor(r, g, b);
      pdf.text(DIM_NAMES[dimId].substring(0, 3).toUpperCase(), colDims[i], y + 4);
    });
    pdf.setTextColor(109, 104, 117);
    pdf.text("n", colN, y + 4, { align: "right" });
    y += 6;

    narrativeHistory.forEach((h, i) => {
      checkY(7, "TRENDS (cont.)");
      if (i % 2 === 0) { pdf.setFillColor(250, 250, 252); pdf.rect(ML, y, CW, 7, "F"); }
      if (i === 0) {
        pdf.setFillColor(0, 109, 119); pdf.roundedRect(colGen, y + 1.5, 11, 4, 1, 1, "F");
        pdf.setFontSize(5.5); pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold");
        pdf.text("Latest", colGen + 5.5, y + 4.5, { align: "center" });
      }
      pdf.setFontSize(7.5); pdf.setFont("helvetica", i === 0 ? "bold" : "normal"); pdf.setTextColor(30, 30, 30);
      const genDate = new Date(h.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      pdf.text(genDate, i === 0 ? colGen + 14 : colGen, y + 5);
      pdf.setFont("helvetica", "bold"); pdf.setTextColor(0, 109, 119);
      pdf.text(h.index_score?.toFixed(1) ?? "—", colIdx, y + 5);
      const dimScores = h.dimension_scores ?? {};
      DIMS_BY_WEIGHT.forEach((dimId, j) => {
        const score = dimScores[dimId]?.avg_score;
        const [r, g, b] = hexRgb(DIM_COLORS[dimId]);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(score !== undefined ? r : 160, score !== undefined ? g : 160, score !== undefined ? b : 160);
        pdf.text(score !== undefined ? String(Math.round(score)) : "—", colDims[j], y + 5);
      });
      pdf.setFont("helvetica", "normal"); pdf.setTextColor(130, 120, 130);
      pdf.text(String(h.participant_count), colN, y + 5, { align: "right" });
      y += 7;
    });
    y += 4;

    checkY(8);
    let lx = ML;
    DIMS_BY_WEIGHT.forEach(dimId => {
      const [r, g, b] = hexRgb(DIM_COLORS[dimId]);
      pdf.setFillColor(r, g, b); pdf.rect(lx, y, 8, 2, "F");
      pdf.setFontSize(6.5); pdf.setTextColor(80, 80, 80); pdf.setFont("helvetica", "normal");
      pdf.text(`${DIM_NAMES[dimId]} (${Math.round(DIM_WEIGHTS[dimId] * 100)}%)`, lx + 10, y + 2);
      lx += 36;
    });
    y += 7;
  }

  // ── CROSS-INSTRUMENT ─────────────────────────────────────────────────
  if (exportSections.crossInstrument) {
    newPage("CROSS-INSTRUMENT");

    const ciIntro = "Cross-instrument analysis requires participants to have completed both NAI and PTP. Patterns reveal whether AI adoption barriers are specific to AI context or rooted in deeper threat-response patterns.";
    const ciLines = splitText(ciIntro, CW, 7.5, "normal");
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(80, 80, 80);
    pdf.text(ciLines, ML, y); y += ciLines.length * 4 + 6;

    if (Object.keys(dims).length > 0) {
      const panelW = (CW - 6) / 2;
      checkY(56);
      pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, y, panelW, 52, 2, 2, "F");
      pdf.setFontSize(7); pdf.setFont("helvetica", "bold"); pdf.setTextColor(130, 120, 130);
      pdf.text("NAI · C.A.F.E.S. (BY WEIGHT)", ML + 4, y + 6);
      let dy2 = y + 12;
      DIMS_BY_WEIGHT.forEach(dimId => {
        const dim = dims[dimId]; if (!dim) return;
        const act = activationLabel(dim.avg_score);
        const [r, g, b] = hexRgb(DIM_COLORS[dimId]);
        const actCol: [number, number, number] = act.label === "High" ? [163, 45, 45] : act.label === "Elevated" ? [99, 56, 6] : [15, 110, 86];
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(r, g, b);
        pdf.text(DIM_NAMES[dimId], ML + 4, dy2);
        pdf.setTextColor(2, 31, 54);
        pdf.text(String(Math.round(dim.avg_score)), ML + panelW - 20, dy2);
        pdf.setFontSize(6.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(actCol[0], actCol[1], actCol[2]);
        pdf.text(act.label, ML + panelW - 4, dy2, { align: "right" });
        dy2 += 6.5;
      });
      pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3);
      pdf.line(ML + 4, dy2 + 1, ML + panelW - 4, dy2 + 1);
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
      pdf.text(`AI Readiness Index: ${indexScore !== null ? `${indexScore}/100` : "—"}`, ML + 4, dy2 + 6);

      const px = ML + panelW + 6;
      const ptpDimsLocal = ptpAggregate?.dimensions;
      const ptpAvailable = !!ptpDimsLocal && Object.keys(ptpDimsLocal).length > 0 && !ptpAggregate?.suppressed;
      if (ptpAvailable) {
        pdf.setFillColor(249, 247, 241); pdf.roundedRect(px, y, panelW, 52, 2, 2, "F");
        pdf.setFontSize(7); pdf.setFont("helvetica", "bold"); pdf.setTextColor(130, 120, 130);
        pdf.text("PTP · THREAT & REWARD", px + 4, y + 6);
        let py2 = y + 12;
        PTP_ORDER.forEach(dimId => {
          const dim = ptpDimsLocal![dimId]; if (!dim) return;
          const [r, g, b] = hexRgb(PTP_DIM_COLORS[dimId]);
          pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(r, g, b);
          pdf.text(PTP_DIM_NAMES[dimId], px + 4, py2);
          pdf.setTextColor(2, 31, 54);
          pdf.text(String(Math.round(dim.avg_score)), px + panelW - 20, py2);
          py2 += 6.5;
        });
        const triVal = Math.round((100 - Object.entries(PTP_TRI_W).reduce((a, [k, w]) => a + (ptpDimsLocal![k]?.avg_score ?? 50) * w, 0)) * 10) / 10;
        const rsiVal = Math.round(Object.entries(PTP_RSI_W).reduce((a, [k, w]) => a + (ptpDimsLocal![k]?.avg_score ?? 50) * w, 0) * 10) / 10;
        pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3);
        pdf.line(px + 4, py2 + 1, px + panelW - 4, py2 + 1);
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
        pdf.text(`TRI: ${triVal.toFixed(1)}  RSI: ${rsiVal.toFixed(1)}`, px + 4, py2 + 6);
      } else {
        pdf.setFillColor(245, 245, 245); pdf.roundedRect(px, y, panelW, 52, 2, 2, "F");
        pdf.setFontSize(7); pdf.setFont("helvetica", "bold"); pdf.setTextColor(130, 120, 130);
        pdf.text("PTP · THREAT RESPONSE", px + 4, y + 6);
        const ptpMsg = "PTP aggregate data will appear here once 5+ participants have completed both instruments.";
        const ptpLines = splitText(ptpMsg, panelW - 8, 7.5, "normal");
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(150, 150, 150);
        pdf.text(ptpLines, px + 4, y + 16);
      }
      y += 57;
    }

    checkY(12);
    y += 2;
    pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
    pdf.text("Co-elevation Patterns", ML, y);
    y += 1.5;
    pdf.setDrawColor(2, 31, 54); pdf.setLineWidth(0.4); pdf.line(ML, y, ML + CW, y); y += 5;
    const coText = "Co-elevation occurs when a dimension is simultaneously elevated in both NAI and PTP — for example, high Ego Stability (NAI) paired with high Protection (PTP). These compound patterns are the most operationally significant findings because barriers reinforce each other and require sequential intervention.";
    const coLines = splitText(coText, CW, 7.5, "normal");
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
    pdf.text(coLines, ML, y); y += coLines.length * 4 + 4;

    const ptpDimsForCo = ptpAggregate?.dimensions;
    const ptpAvailForCo = !!ptpDimsForCo && Object.keys(ptpDimsForCo).length > 0 && !ptpAggregate?.suppressed;
    if (!ptpAvailForCo) {
      const pendText = "Co-elevation pattern detection requires PTP aggregate data. Complete cross-instrument analysis will appear here once participants have completed both assessments.";
      const pendLines = splitText(pendText, CW - 8, 7.5, "italic");
      const pendH = pendLines.length * 4 + 6;
      pdf.setFillColor(245, 247, 250); pdf.roundedRect(ML, y, CW, pendH, 2, 2, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "italic"); pdf.setTextColor(130, 120, 130);
      pdf.text(pendLines, ML + 4, y + 5); y += pendH + 8;
    } else if (coElevationPatterns.length === 0) {
      const noneText = "No co-elevation patterns detected — all cross-instrument dimension pairs are within normal range.";
      const noneLines = splitText(noneText, CW - 8, 7.5, "italic");
      const noneH = noneLines.length * 4 + 6;
      pdf.setFillColor(245, 247, 250); pdf.roundedRect(ML, y, CW, noneH, 2, 2, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "italic"); pdf.setTextColor(130, 120, 130);
      pdf.text(noneLines, ML + 4, y + 5); y += noneH + 8;
    } else {
      for (const p of coElevationPatterns) {
        const dLines = splitText(p.description, CW - 12, 7.5, "normal");
        const cardH = 8 + dLines.length * 4 + 10;
        checkY(cardH + 4);
        pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, y, CW, cardH, 2, 2, "F");
        pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
        pdf.text(p.label, ML + 5, y + 6);
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(80, 80, 80);
        pdf.text(dLines, ML + 5, y + 11);
        const scY = y + 11 + dLines.length * 4 + 2;
        const [nr, ng, nb] = hexRgb(DIM_COLORS[p.naiDimId]);
        const [pr, pg, pb] = hexRgb(PTP_DIM_COLORS[p.ptpDimId]);
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold");
        pdf.setTextColor(nr, ng, nb);
        pdf.text(`NAI ${p.naiDimName} ${Math.round(p.naiScore)}`, ML + 5, scY);
        pdf.setTextColor(pr, pg, pb);
        pdf.text(`PTP ${p.ptpDimName} ${Math.round(p.ptpScore)}`, ML + 60, scY);
        y += cardH + 4;
      }
    }

    if (crossInstrumentRow) {
      checkY(12);
      y += 2;
      pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
      pdf.text("Recommended Next Steps · Cross-Instrument", ML, y);
      y += 1.5;
      pdf.setDrawColor(2, 31, 54); pdf.setLineWidth(0.4); pdf.line(ML, y, ML + CW, y); y += 5;

      pdf.setFontSize(7); pdf.setTextColor(130, 120, 130); pdf.setFont("helvetica", "normal");
      pdf.text(`Generated ${new Date(crossInstrumentRow.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, ML, y);
      y += 5;

      if (crossInstrumentRow.summary) {
        const sumLines = splitText(crossInstrumentRow.summary, CW, 8, "normal");
        pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(40, 40, 40);
        pdf.text(sumLines, ML, y);
        y += sumLines.length * 4.2 + 4;
      }

      for (const rec of crossInstrumentRow.recommendations) {
        const titleLns = splitText(rec.title, CW - 58, 8.5, "bold");
        const ratLns = splitText(rec.rationale, CW - 12, 7.5, "normal");
        const stepsHeight = rec.steps && rec.steps.length > 0
          ? rec.steps.reduce((acc, s) => acc + splitText(s, CW - 18, 7, "normal").length * 3.8, 5)
          : 0;
        const cardH = 5 + titleLns.length * 4.5 + 2 + ratLns.length * 4 + stepsHeight + 4;
        checkY(cardH + 4, "CROSS-INSTRUMENT (cont.)");

        pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, y, CW, cardH, 2, 2, "F");
        pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
        pdf.text(titleLns, ML + 4, y + 5);

        const pCol: [number, number, number] = rec.priority === "high" ? [153, 60, 29] : rec.priority === "medium" ? [99, 56, 6] : [15, 110, 86];
        pdf.setFontSize(6.5); pdf.setFont("helvetica", "normal");
        pdf.setTextColor(pCol[0], pCol[1], pCol[2]); pdf.text(rec.priority, ML + CW - 4, y + 5, { align: "right" });
        pdf.setTextColor(60, 9, 108); pdf.text(rec.time_horizon, ML + CW - 22, y + 5, { align: "right" });

        let cy = y + 5 + titleLns.length * 4.5 + 2;
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
        pdf.text(ratLns, ML + 4, cy);
        cy += ratLns.length * 4 + 2;

        if (rec.steps && rec.steps.length > 0) {
          pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
          pdf.text("STEPS", ML + 4, cy);
          cy += 4;
          pdf.setFontSize(7); pdf.setFont("helvetica", "normal"); pdf.setTextColor(70, 70, 70);
          rec.steps.forEach((step, idx) => {
            const stepLns = splitText(`${idx + 1}. ${step}`, CW - 18, 7, "normal");
            pdf.text(stepLns, ML + 8, cy);
            cy += stepLns.length * 3.8;
          });
        }

        y += cardH + 4;
      }
    }
  }

  // ── LEADER PERSPECTIVE ───────────────────────────────────────────────
  if (exportSections.leaderPerspective) {
    newPage("LEADER PERSPECTIVE · LEADER VS EMPLOYEE PERCEPTION");

    const lpIntro = "Compares how leaders perceive employees experience AI adoption (Executive Perspective NAI) against how employees themselves experience it (standard NAI, leaders excluded). Positive delta = leaders see more concern than employees report. Negative delta = leaders underestimate employee concern.";
    const lpIntroLines = splitText(lpIntro, CW, 7.5, "normal");
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(80, 80, 80);
    pdf.text(lpIntroLines, ML, y); y += lpIntroLines.length * 4 + 6;

    if (!deltaResult || deltaResult.suppressed) {
      const noDataMsg = !deltaResult
        ? "Leader-vs-workforce comparison data is not loaded for this slice."
        : `Insufficient participants for delta computation. Standard NAI respondents (excluding leaders): ${deltaResult.self_participant_count}. Executive Perspective NAI respondents: ${deltaResult.epn_participant_count}. Both pools require a minimum of 5.`;
      const noDataLines = splitText(noDataMsg, CW - 8, 7.5, "italic");
      const noDataH = noDataLines.length * 4 + 6;
      pdf.setFillColor(245, 247, 250); pdf.roundedRect(ML, y, CW, noDataH, 2, 2, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "italic"); pdf.setTextColor(130, 120, 130);
      pdf.text(noDataLines, ML + 4, y + 5);
      y += noDataH + 6;
    } else {
      checkY(14);
      pdf.setFontSize(7); pdf.setTextColor(130, 120, 130); pdf.setFont("helvetica", "normal");
      pdf.text(`Leaders (EPN): n=${deltaResult.epn_participant_count}  ·  Employees (NAI self, leaders excluded): n=${deltaResult.self_participant_count}`, ML, y);
      y += 6;

      checkY(14);
      pdf.setFillColor(237, 233, 223); pdf.rect(ML, y, CW, 6, "F");
      pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(109, 104, 117);
      pdf.text("DIMENSION", ML + 2, y + 4);
      pdf.text("LEADERS (EPN)", ML + 72, y + 4);
      pdf.text("EMPLOYEES (NAI)", ML + 108, y + 4);
      pdf.text("DELTA", ML + 150, y + 4);
      y += 6;

      DIMS_BY_WEIGHT.forEach((dimId, i) => {
        const entry = deltaResult.delta?.[dimId];
        const epnMean = entry?.epn_mean;
        const selfMean = entry?.self_mean;
        const d = entry?.delta;
        const sign = d === null || d === undefined ? "" : (d > 0 ? "+" : "");
        const [r, g, b] = hexRgb(DIM_COLORS[dimId]);
        if (i % 2 === 0) { pdf.setFillColor(250, 250, 252); pdf.rect(ML, y, CW, 7, "F"); }
        pdf.setFillColor(r, g, b); pdf.circle(ML + 3, y + 3.5, 1.8, "F");
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(r, g, b);
        pdf.text(DIM_NAMES[dimId], ML + 8, y + 4.5);
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(2, 31, 54);
        pdf.text(epnMean !== undefined && epnMean !== null ? String(Math.round(epnMean)) : "—", ML + 72, y + 4.5);
        pdf.text(selfMean !== undefined && selfMean !== null ? String(Math.round(selfMean)) : "—", ML + 108, y + 4.5);
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(r, g, b);
        pdf.text(d !== undefined && d !== null ? `${sign}${Math.round(d * 10) / 10}` : "—", ML + 150, y + 4.5);
        y += 7;
      });
      y += 4;

      checkY(8);
      pdf.setFontSize(6.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(130, 120, 130);
      pdf.text("+ delta: leaders see more concern than employees report.   - delta: leaders underestimate employee concern.   Aligned within +/-5 = no meaningful gap.", ML, y);
      y += 7;

      if (deltaNarrative && deltaNarrative.narrative_text) {
        const nt = deltaNarrative.narrative_text;
        const generated = new Date(deltaNarrative.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        checkY(12, "LEADER PERSPECTIVE (cont.)");
        y += 2;
        pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
        pdf.text(`AI Narrative · generated ${generated}`, ML, y);
        y += 1.5;
        pdf.setDrawColor(2, 31, 54); pdf.setLineWidth(0.4); pdf.line(ML, y, ML + CW, y); y += 5;

        if (nt.summary) {
          const sumLines = splitText(nt.summary, CW - 12, 8, "normal");
          const cardH = 10 + sumLines.length * 4.2 + 4;
          checkY(cardH + 4, "LEADER PERSPECTIVE (cont.)");
          pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, y, CW, cardH, 2, 2, "F");
          pdf.setFillColor(245, 116, 26); pdf.rect(ML, y, 2, cardH, "F");
          pdf.setFontSize(7); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
          pdf.text("WHAT WE'RE SEEING", ML + 5, y + 6);
          pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(40, 40, 40);
          pdf.text(sumLines, ML + 5, y + 11);
          y += cardH + 4;
        }

        if (nt.alignment_overview) {
          const alignLines = splitText(nt.alignment_overview, CW - 8, 7.5, "normal");
          const alignH = alignLines.length * 4 + 6;
          checkY(alignH + 4, "LEADER PERSPECTIVE (cont.)");
          pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
          pdf.text(alignLines, ML + 4, y + 5);
          y += alignH + 6;
        }

        if (Array.isArray(nt.key_gaps) && nt.key_gaps.length > 0) {
          checkY(12, "LEADER PERSPECTIVE (cont.)");
          y += 2;
          pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
          pdf.text("Key gaps", ML, y);
          y += 5;
          nt.key_gaps.forEach((gap) => {
            const titleLns = splitText(gap.title || "", CW - 8, 8, "bold");
            const descLns = splitText(gap.description || "", CW - 8, 7.5, "normal");
            const cardH = 4 + titleLns.length * 4.5 + 2 + descLns.length * 4 + 4;
            checkY(cardH + 4, "LEADER PERSPECTIVE (cont.)");
            pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, y, CW, cardH, 2, 2, "F");
            pdf.setFontSize(8); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
            pdf.text(titleLns, ML + 4, y + 5);
            pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
            pdf.text(descLns, ML + 4, y + 5 + titleLns.length * 4.5 + 2);
            y += cardH + 4;
          });
        }

        if (Array.isArray(nt.recommendations) && nt.recommendations.length > 0) {
          checkY(12, "LEADER PERSPECTIVE (cont.)");
          y += 2;
          pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
          pdf.text(`Recommended interventions (${nt.recommendations.length})`, ML, y);
          y += 5;
          nt.recommendations.forEach((rec) => {
            const titleLns = splitText(rec.title || "", CW - 58, 8.5, "bold");
            const ratLns = splitText(rec.rationale || "", CW - 12, 7.5, "normal");
            const stepsHeight = Array.isArray(rec.steps) && rec.steps.length > 0
              ? rec.steps.reduce((acc: number, s: string) => acc + splitText(s, CW - 18, 7, "normal").length * 3.8, 5)
              : 0;
            const cardH = 5 + titleLns.length * 4.5 + 2 + ratLns.length * 4 + stepsHeight + 4;
            checkY(cardH + 4, "LEADER PERSPECTIVE (cont.)");
            pdf.setFillColor(249, 247, 241); pdf.roundedRect(ML, y, CW, cardH, 2, 2, "F");
            pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
            pdf.text(titleLns, ML + 4, y + 5);
            const pCol: [number, number, number] = rec.priority === "high" ? [153, 60, 29] : rec.priority === "medium" ? [99, 56, 6] : [15, 110, 86];
            pdf.setFontSize(6.5); pdf.setFont("helvetica", "normal");
            pdf.setTextColor(pCol[0], pCol[1], pCol[2]); pdf.text(rec.priority || "", ML + CW - 4, y + 5, { align: "right" });
            pdf.setTextColor(60, 9, 108); pdf.text(rec.time_horizon || "", ML + CW - 22, y + 5, { align: "right" });
            if (rec.intervention_type) {
              pdf.setTextColor(50, 50, 50); pdf.text(rec.intervention_type, ML + CW - 44, y + 5, { align: "right" });
            }
            let cy = y + 5 + titleLns.length * 4.5 + 2;
            pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
            pdf.text(ratLns, ML + 4, cy);
            cy += ratLns.length * 4 + 2;
            if (Array.isArray(rec.steps) && rec.steps.length > 0) {
              pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(2, 31, 54);
              pdf.text("STEPS", ML + 4, cy);
              cy += 4;
              pdf.setFontSize(7); pdf.setFont("helvetica", "normal"); pdf.setTextColor(70, 70, 70);
              rec.steps.forEach((step: string, idx: number) => {
                const stepLns = splitText(`${idx + 1}. ${step}`, CW - 18, 7, "normal");
                pdf.text(stepLns, ML + 8, cy);
                cy += stepLns.length * 3.8;
              });
            }
            y += cardH + 4;
          });
        }
      } else {
        const noNarMsg = "AI narrative for this leader-vs-workforce comparison has not been generated yet. Click \"Regenerate AI\" on the dashboard to generate it as part of the standard interpretation cycle.";
        const noNarLines = splitText(noNarMsg, CW - 8, 7.5, "italic");
        const noNarH = noNarLines.length * 4 + 6;
        checkY(noNarH + 4);
        pdf.setFillColor(245, 247, 250); pdf.roundedRect(ML, y, CW, noNarH, 2, 2, "F");
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "italic"); pdf.setTextColor(130, 120, 130);
        pdf.text(noNarLines, ML + 4, y + 5);
        y += noNarH + 6;
      }
    }
  }

  addFooter();
  pdf.save(`BrainWise-NAI-CompanyDashboard-${dateStr}.pdf`);
}
