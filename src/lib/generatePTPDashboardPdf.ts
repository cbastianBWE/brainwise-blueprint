import jsPDF from "jspdf";

// ============================================================
// Types
// ============================================================

export interface PTPDashboardPdfSections {
  overview: boolean;
  dimensions: boolean;
  interpretation: boolean;
  leaderWorkforce: boolean;
  trends: boolean;
  interventions: boolean;
  crossInstrument: boolean;
}

export interface PTPDashboardPdfData {
  orgName: string;
  sliceLabel: string;
  generatedAt: string;
  participantCount: number;
  triScore: number | null;
  rsiScore: number | null;
  archetypeName: string | null;
  archetypeDescription: string | null;
  dimensions: Array<{
    dimId: string;
    name: string;
    avgScore: number;
    pctAt75: number;
    pctHigh: number;
    pctElevated: number;
    pctLow: number;
    color: string;
  }>;
  riskFlags: Array<{
    id: string;
    level: string;
    title: string;
    summary: string;
    detail: string;
  }>;
  businessMeaning: string | null;
  benefits: string | null;
  risks: string | null;
  nextSteps: string | null;
  reassessmentNote: string | null;
  interventions: Array<{
    title: string;
    description: string;
    targetDimensions: string[];
    priority: string;
    timeHorizon: string;
    interventionType: string;
  }>;
  narrativeHistory: Array<{
    generated_at: string;
    tri_score: number | null;
    rsi_score: number | null;
    dimension_scores?: Record<string, { avg_score: number }>;
    participant_count: number;
  }>;
  exportSections: PTPDashboardPdfSections;
  naiDimensions: Array<{
    dimId: string;
    name: string;
    avgScore: number;
    color: string;
  }> | null;
  naiReadinessIndex: number | null;
  coElevationPatterns: Array<{
    label: string;
    description: string;
    naiDimName: string;
    naiScore: number;
    ptpDimName: string;
    ptpScore: number;
    naiColor: string;
    ptpColor: string;
  }> | null;
  crossInstrumentRecommendations?: {
    id: string;
    primary_narrative_id: string;
    recommendations: Array<{
      id: string;
      title: string;
      rationale: string;
      steps: string[];
      priority: 'high' | 'medium' | 'low';
      time_horizon: 'immediate' | '30-day' | '90-day';
      anchor_co_elevation: string | null;
    }>;
    summary: string | null;
    generated_at: string;
  } | null;
  leaderWorkforceDelta: {
    suppressed: boolean;
    reason?: string;
    leaderParticipantCount: number;
    workforceParticipantCount: number;
    delta?: Record<string, {
      workforce_mean: number | null;
      leader_mean: number | null;
      delta: number | null;
      direction: string | null;
    }>;
    minimumRequired?: number;
  } | null;
  leaderWorkforceNarrative: {
    generatedAt: string;
    leaderParticipantCount: number;
    workforceParticipantCount: number;
    summary: string | null;
    alignmentOverview: string | null;
    keyGaps: Array<{ title: string; description: string }>;
    recommendations: Array<{
      id: string;
      title: string;
      rationale: string;
      steps: string[];
      priority: 'high' | 'medium' | 'low';
      time_horizon: 'immediate' | '30-day' | '90-day';
      intervention_type: string;
    }>;
  } | null;
}

// ============================================================
// Constants
// ============================================================

const NAVY: [number, number, number] = [2, 31, 54];
const ORANGE: [number, number, number] = [245, 116, 26];
const PURPLE: [number, number, number] = [60, 9, 108];
const SAND: [number, number, number] = [249, 247, 241];
const MUTED: [number, number, number] = [110, 110, 120];
const TEXT: [number, number, number] = [30, 30, 35];
const RED: [number, number, number] = [163, 45, 45];
const GREEN_PASTEL: [number, number, number] = [200, 235, 215];
const AMBER_PASTEL: [number, number, number] = [250, 230, 195];
const RED_PASTEL: [number, number, number] = [248, 210, 210];
const PURPLE_PASTEL: [number, number, number] = [225, 215, 240];
const NAVY_PASTEL: [number, number, number] = [215, 225, 240];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 15;
const MARGIN_R = 15;
const MARGIN_T = 20;
const MARGIN_B = 25;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

const DIM_NAME_MAP: Record<string, string> = {
  "DIM-PTP-01": "Protection",
  "DIM-PTP-02": "Participation",
  "DIM-PTP-03": "Prediction",
  "DIM-PTP-04": "Purpose",
  "DIM-PTP-05": "Pleasure",
};

const DIM_RGB_MAP: Record<string, [number, number, number]> = {
  "DIM-PTP-01": [2, 31, 54],
  "DIM-PTP-02": [0, 109, 119],
  "DIM-PTP-03": [109, 104, 117],
  "DIM-PTP-04": [60, 9, 108],
  "DIM-PTP-05": [255, 183, 3],
};

// ============================================================
// Helpers
// ============================================================

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function activationLabel(score: number): string {
  if (score >= 76) return "High";
  if (score >= 50) return "Elevated";
  return "Low";
}

export function generatePTPDashboardPdf(data: PTPDashboardPdfData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_T;
  let currentSectionTitle: string | null = null;

  const setFill = (rgb: [number, number, number]) =>
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setText = (rgb: [number, number, number]) =>
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb: [number, number, number]) =>
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

  const addFooter = () => {
    const footerY = PAGE_H - 12;
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const date = new Date().toLocaleDateString();
    doc.text(
      `Generated by BrainWise | ${date} | Confidential`,
      PAGE_W / 2,
      footerY,
      { align: "center" },
    );
  };

  const renderContinuationHeader = () => {
    if (!currentSectionTitle) return;
    doc.setFontSize(10);
    setText(MUTED);
    doc.setFont("helvetica", "italic");
    doc.text(`${currentSectionTitle} (cont.)`, MARGIN_L, y);
    y += 2;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
    y += 5;
    doc.setFont("helvetica", "normal");
  };

  const newPage = () => {
    currentSectionTitle = null;
    addFooter();
    doc.addPage();
    y = MARGIN_T;
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN_B) {
      addFooter();
      doc.addPage();
      y = MARGIN_T;
      if (currentSectionTitle) renderContinuationHeader();
    }
  };

  const sectionHeading = (label: string, minContentNeeded = 40) => {
    currentSectionTitle = null;
    checkPageBreak(15 + minContentNeeded);
    currentSectionTitle = label;
    setText(NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(label, MARGIN_L, y);
    setDraw(ORANGE);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_L, y + 2, MARGIN_L + 25, y + 2);
    y += 10;
  };

  const wrappedText = (
    text: string,
    x: number,
    startY: number,
    maxWidth: number,
    lineHeight: number,
    fontSize: number,
    color: [number, number, number],
    style: "normal" | "bold" | "italic" = "normal",
  ): number => {
    setText(color);
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    let cy = startY;
    for (const line of lines) {
      if (cy > PAGE_H - MARGIN_B) {
        addFooter();
        doc.addPage();
        cy = MARGIN_T;
      }
      doc.text(line, x, cy);
      cy += lineHeight;
    }
    return cy;
  };

  // ============================================================
  // COVER PAGE
  // ============================================================

  // Navy band
  setFill(NAVY);
  doc.rect(0, 0, PAGE_W, 75, "F");

  setText([255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("BrainWise", MARGIN_L, 35);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("PTP · Personal Threat Profile Dashboard", MARGIN_L, 48);

  // Two columns at y=100
  // Left column
  setText(MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Organization", MARGIN_L, 100);

  setText(NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(data.orgName || "Organization", MARGIN_L, 108);

  setText(MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Slice", MARGIN_L, 122);

  setText(TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(data.sliceLabel, MARGIN_L, 130);

  // Right column - scores
  const rightX = PAGE_W / 2 + 10;
  if (data.triScore !== null) {
    setText(NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.text(data.triScore.toFixed(1), rightX, 110);

    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Threat Reactivity Index", rightX, 117);
  }

  if (data.rsiScore !== null) {
    setText(PURPLE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.text(data.rsiScore.toFixed(1), rightX, 140);

    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Reward Sensitivity Index", rightX, 147);
  }

  // Archetype box at y=170
  if (data.archetypeName) {
    setFill(SAND);
    doc.roundedRect(MARGIN_L, 170, CONTENT_W, 35, 3, 3, "F");

    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("THREAT PROFILE ARCHETYPE", MARGIN_L + 6, 178);

    setText(NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(data.archetypeName, MARGIN_L + 6, 188);

    if (data.archetypeDescription) {
      wrappedText(
        data.archetypeDescription,
        MARGIN_L + 6,
        196,
        CONTENT_W - 12,
        4.5,
        9,
        MUTED,
      );
    }
  }

  // Generated at y=220
  setText(MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Generated", MARGIN_L, 220);

  setText(TEXT);
  doc.setFontSize(11);
  doc.text(
    `${data.generatedAt} · ${data.participantCount} participants`,
    MARGIN_L,
    228,
  );

  // Disclaimer box
  setFill([245, 245, 245]);
  doc.roundedRect(MARGIN_L, 245, CONTENT_W, 30, 2, 2, "F");
  setText(MUTED);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  const disclaimer =
    "This report contains aggregated, de-identified PTP assessment data intended for organizational decision-making. Individual responses are confidential. Interpretations are AI-assisted and should be reviewed alongside qualitative context.";
  wrappedText(disclaimer, MARGIN_L + 4, 252, CONTENT_W - 8, 4, 8, MUTED, "italic");

  addFooter();

  // ============================================================
  // OVERVIEW PAGE
  // ============================================================
  if (data.exportSections.overview) {
    doc.addPage();
    y = MARGIN_T;

    sectionHeading("Overview");

    // Five dimension cards in a row
    const cardW = (CONTENT_W - 4 * 2) / 5;
    const cardH = 32;
    const cardY = y;
    data.dimensions.forEach((dim, i) => {
      const cardX = MARGIN_L + i * (cardW + 2);
      const dimColor = hexToRgb(dim.color);

      setFill(SAND);
      doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, "F");

      setText(dimColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(dim.name, cardX + cardW / 2, cardY + 6, { align: "center" });

      doc.setFontSize(22);
      doc.text(dim.avgScore.toFixed(1), cardX + cardW / 2, cardY + 19, {
        align: "center",
      });

      setText(MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(activationLabel(dim.avgScore), cardX + cardW / 2, cardY + 27, {
        align: "center",
      });
    });
    y += cardH + 8;

    // TRI/RSI summary
    if (data.triScore !== null || data.rsiScore !== null) {
      checkPageBreak(20);
      const triText =
        data.triScore !== null
          ? `TRI: ${data.triScore.toFixed(1)} · higher = less reactive`
          : "";
      const rsiText =
        data.rsiScore !== null
          ? `RSI: ${data.rsiScore.toFixed(1)} · higher = stronger motivation`
          : "";

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      if (triText) {
        setText(NAVY);
        doc.text(triText, PAGE_W / 2, y, { align: "center" });
        y += 6;
      }
      if (rsiText) {
        setText(PURPLE);
        doc.text(rsiText, PAGE_W / 2, y, { align: "center" });
        y += 6;
      }
      y += 6;
    }

    // Risk flags
    if (data.riskFlags.length > 0) {
      sectionHeading("Risk Flags");
      for (const flag of data.riskFlags) {
        const accent = flag.level === "high" ? RED : ORANGE;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const summaryLines = doc.splitTextToSize(
          flag.summary,
          CONTENT_W - 14,
        ) as string[];
        doc.setFontSize(10);
        const detailLines = doc.splitTextToSize(
          flag.detail,
          CONTENT_W - 14,
        ) as string[];
        const blockH =
          6 + 5 + 6 + summaryLines.length * 5.5 + detailLines.length * 5 + 8;

        checkPageBreak(blockH + 4);

        setFill(SAND);
        doc.roundedRect(MARGIN_L, y, CONTENT_W, blockH, 2, 2, "F");

        // Left border
        setFill(accent);
        doc.rect(MARGIN_L, y, 1.2, blockH, "F");

        let cy = y + 6;
        setText(accent);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(flag.level === "high" ? "HIGH RISK" : "WARNING", MARGIN_L + 6, cy);
        cy += 5;

        setText(NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(flag.title, MARGIN_L + 6, cy);
        cy += 6;

        setText(MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        for (const line of summaryLines) {
          doc.text(line, MARGIN_L + 6, cy);
          cy += 5;
        }

        setText(TEXT);
        doc.setFontSize(10);
        for (const line of detailLines) {
          doc.text(line, MARGIN_L + 6, cy);
          cy += 4.5;
        }

        y += blockH + 4;
      }
    }
  }

  // ============================================================
  // DIMENSIONS PAGE
  // ============================================================
  if (data.exportSections.dimensions) {
    doc.addPage();
    y = MARGIN_T;

    sectionHeading("Dimensions");

    const renderDimCard = (
      dim: PTPDashboardPdfData["dimensions"][number],
      weightLabel: string,
      weightColor: [number, number, number],
    ) => {
      const cardH = 38;
      checkPageBreak(cardH + 4);

      setFill(SAND);
      doc.roundedRect(MARGIN_L, y, CONTENT_W, cardH, 2, 2, "F");

      const dimColor = hexToRgb(dim.color);

      // Name + score
      setText(dimColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(dim.name, MARGIN_L + 6, y + 9);

      doc.setFontSize(22);
      doc.text(dim.avgScore.toFixed(1), MARGIN_L + 6, y + 22);

      // Weight badge
      setFill(weightColor);
      doc.roundedRect(MARGIN_L + 50, y + 5, 22, 6, 1, 1, "F");
      setText([255, 255, 255]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(weightLabel, MARGIN_L + 61, y + 9.2, { align: "center" });

      // pct at 75
      setText(MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `${dim.pctAt75.toFixed(0)}% scoring >= 75 (high activation)`,
        MARGIN_L + 50,
        y + 17,
      );

      // Activation label
      setText(dimColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(activationLabel(dim.avgScore), MARGIN_L + 50, y + 22);

      // Distribution bar
      const barX = MARGIN_L + 6;
      const barY = y + 28;
      const barW = CONTENT_W - 12;
      const barH = 6;
      const sumPct = dim.pctLow + dim.pctElevated + dim.pctHigh;
      if (sumPct < 1) {
        setFill([220, 220, 220]);
        doc.rect(barX, barY, barW, barH, "F");
      } else {
        const lowW = (dim.pctLow / sumPct) * barW;
        const elevW = (dim.pctElevated / sumPct) * barW;
        const highW = (dim.pctHigh / sumPct) * barW;
        setFill(GREEN_PASTEL);
        doc.rect(barX, barY, lowW, barH, "F");
        setFill(AMBER_PASTEL);
        doc.rect(barX + lowW, barY, elevW, barH, "F");
        setFill(RED_PASTEL);
        doc.rect(barX + lowW + elevW, barY, highW, barH, "F");
      }

      y += cardH + 4;
    };

    // Threat
    setText(ORANGE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("THREAT DIMENSIONS", MARGIN_L, y);
    y += 6;

    const threatWeights: Record<string, string> = {
      "DIM-PTP-01": "TRI 25%",
      "DIM-PTP-02": "TRI 30%",
      "DIM-PTP-03": "TRI 45%",
    };
    for (const dimId of ["DIM-PTP-01", "DIM-PTP-02", "DIM-PTP-03"]) {
      const dim = data.dimensions.find((d) => d.dimId === dimId);
      if (dim) renderDimCard(dim, threatWeights[dimId], ORANGE);
    }

    y += 4;

    // Reward
    checkPageBreak(15);
    setText(PURPLE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("REWARD DIMENSIONS", MARGIN_L, y);
    y += 6;

    const rewardWeights: Record<string, string> = {
      "DIM-PTP-04": "RSI 60%",
      "DIM-PTP-05": "RSI 40%",
    };
    for (const dimId of ["DIM-PTP-04", "DIM-PTP-05"]) {
      const dim = data.dimensions.find((d) => d.dimId === dimId);
      if (dim) renderDimCard(dim, rewardWeights[dimId], PURPLE);
    }
  }

  // ============================================================
  // AI INTERPRETATION PAGE
  // ============================================================
  if (data.exportSections.interpretation) {
    doc.addPage();
    y = MARGIN_T;

    sectionHeading("AI Interpretation");

    // Archetype card
    if (data.archetypeName) {
      const descLines = data.archetypeDescription
        ? (doc.splitTextToSize(
            data.archetypeDescription,
            CONTENT_W - 12,
          ) as string[])
        : [];
      const cardH = 18 + descLines.length * 5;
      checkPageBreak(cardH + 4);

      setFill(SAND);
      doc.roundedRect(MARGIN_L, y, CONTENT_W, cardH, 2, 2, "F");

      setText(NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("THREAT PROFILE", MARGIN_L + 6, y + 7);

      doc.setFontSize(13);
      doc.text(data.archetypeName, MARGIN_L + 6, y + 14);

      if (descLines.length > 0) {
        setText(MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        let dy = y + 20;
        for (const line of descLines) {
          doc.text(line, MARGIN_L + 6, dy);
          dy += 5;
        }
      }

      y += cardH + 6;
    }

    const sections: Array<{ label: string; text: string | null }> = [
      { label: "What this means for your organization", text: data.businessMeaning },
      { label: "Potential benefits", text: data.benefits },
      { label: "Potential risks if unaddressed", text: data.risks },
      { label: "Recommended next steps", text: data.nextSteps },
      { label: "Reassessment", text: data.reassessmentNote },
    ];

    for (const s of sections) {
      if (!s.text) continue;
      checkPageBreak(20);

      // Orange left accent bar
      setFill(ORANGE);
      doc.rect(MARGIN_L, y, 1.2, 8, "F");

      // Section label
      setText(NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(s.label, MARGIN_L + 5, y + 6);
      y += 14;

      // Body text — render line by line, but force a page break early
      // if a 1-2 line widow would otherwise straddle to the next page.
      // Specifically: when only 1 or 2 lines remain in this section's body
      // AND the next line would push past the page, push the entire tail
      // to the next page instead of just the last line.
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const bodyLines = doc.splitTextToSize(s.text, CONTENT_W - 4) as string[];
      for (let i = 0; i < bodyLines.length; i++) {
        const line = bodyLines[i];
        const linesRemaining = bodyLines.length - i;
        // Widow prevention: if 1-2 lines remain AND we're within ~2 line-heights
        // of the bottom margin, force a page break NOW so the tail moves together.
        if (linesRemaining <= 2 && y + (linesRemaining * 5.5) > PAGE_H - MARGIN_B) {
          addFooter();
          doc.addPage();
          y = MARGIN_T;
          if (currentSectionTitle) renderContinuationHeader();
        } else {
          checkPageBreak(6);
        }
        setText(TEXT);
        doc.text(line, MARGIN_L + 4, y);
        y += 5.5;
      }
      y += 8;
    }
  }

  // ============================================================
  // LEADERSHIP vs WORKFORCE PAGE
  // ============================================================
  if (data.exportSections.leaderWorkforce) {
    doc.addPage();
    y = MARGIN_T;
    sectionHeading("Leadership vs Workforce · PTP");

    const lwIntro = "Compares how the leadership cohort (Director, VP, C-Suite) and the workforce cohort (IC, Manager) self-report their own experience on the same five PTP dimensions. Positive delta means the leadership cohort scores higher; negative delta means the workforce cohort scores higher. This is a structural comparison of cohort experience, not a perception-gap analysis.";
    const lwIntroLines = doc.splitTextToSize(lwIntro, CONTENT_W) as string[];
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(lwIntroLines, MARGIN_L, y);
    y += lwIntroLines.length * 5 + 6;

    const lwData = data.leaderWorkforceDelta;
    if (!lwData || lwData.suppressed) {
      const noDataMsg = !lwData
        ? "Leadership-vs-workforce comparison data is not loaded for this slice."
        : lwData.reason === "slice_incompatible_with_leader_workforce"
          ? "Leadership-vs-workforce comparison cannot be sliced by org level. Use the All-organization slice or a department slice."
          : `Insufficient cohort sizes. Leadership cohort: n=${lwData.leaderParticipantCount}. Workforce cohort: n=${lwData.workforceParticipantCount}. Both cohorts require a minimum of 5 PTP completions.`;
      const noDataLines = doc.splitTextToSize(noDataMsg, CONTENT_W - 8) as string[];
      const noDataH = noDataLines.length * 5 + 8;
      checkPageBreak(noDataH + 4);
      setFill([245, 247, 250]);
      doc.roundedRect(MARGIN_L, y, CONTENT_W, noDataH, 2, 2, "F");
      setText(MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text(noDataLines, MARGIN_L + 4, y + 5);
      y += noDataH + 6;
    } else {
      checkPageBreak(8);
      setText(MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Leadership cohort: n=${lwData.leaderParticipantCount}  ·  Workforce cohort: n=${lwData.workforceParticipantCount}`,
        MARGIN_L,
        y,
      );
      y += 7;

      checkPageBreak(14);
      setFill([237, 233, 223]);
      doc.rect(MARGIN_L, y, CONTENT_W, 7, "F");
      setText(MUTED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("DIMENSION", MARGIN_L + 2, y + 4.8);
      doc.text("LEADERSHIP", MARGIN_L + 72, y + 4.8);
      doc.text("WORKFORCE", MARGIN_L + 108, y + 4.8);
      doc.text("DELTA", MARGIN_L + 150, y + 4.8);
      y += 7;

      const ptpOrder = ["DIM-PTP-01", "DIM-PTP-02", "DIM-PTP-03", "DIM-PTP-04", "DIM-PTP-05"];
      ptpOrder.forEach((dimId, i) => {
        checkPageBreak(8);
        const entry = lwData.delta?.[dimId];
        const leaderMean = entry?.leader_mean ?? null;
        const workforceMean = entry?.workforce_mean ?? null;
        const d = entry?.delta ?? null;
        const sign = d === null ? "" : (d > 0 ? "+" : "");
        const dimColor = DIM_RGB_MAP[dimId];
        const dimName = DIM_NAME_MAP[dimId] ?? dimId;

        if (i % 2 === 0) {
          setFill([250, 250, 252]);
          doc.rect(MARGIN_L, y, CONTENT_W, 8, "F");
        }
        setFill(dimColor);
        doc.circle(MARGIN_L + 3, y + 4, 1.8, "F");
        setText(dimColor);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(dimName, MARGIN_L + 8, y + 5);
        doc.setFont("helvetica", "normal");
        setText([2, 31, 54]);
        doc.text(leaderMean !== null ? String(Math.round(leaderMean)) : "—", MARGIN_L + 72, y + 5);
        doc.text(workforceMean !== null ? String(Math.round(workforceMean)) : "—", MARGIN_L + 108, y + 5);
        doc.setFont("helvetica", "bold");
        setText(dimColor);
        doc.text(d !== null ? `${sign}${Math.round(d * 10) / 10}` : "—", MARGIN_L + 150, y + 5);
        y += 8;
      });
      y += 4;

      checkPageBreak(8);
      setText(MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        "+ delta: leadership cohort scores higher than workforce cohort.   - delta: workforce cohort scores higher than leadership cohort.",
        MARGIN_L,
        y,
      );
      y += 7;

      // AI narrative section
      // Reserve space for the header AND a minimum content footprint
      // (~30mm for the smallest plausible first card) so the header
      // never orphans at the bottom of a page.
      const nar = data.leaderWorkforceNarrative;
      if (nar) {
        checkPageBreak(14 + 30);
        y += 2;
        setText(NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(`AI Narrative · generated ${nar.generatedAt}`, MARGIN_L, y);
        setDraw(ORANGE);
        doc.setLineWidth(0.8);
        doc.line(MARGIN_L, y + 2, MARGIN_L + 50, y + 2);
        y += 8;

        // Summary card — set font BEFORE splitTextToSize for accurate wrap widths.
        // Body text wraps at CONTENT_W - 12 (6mm padding each side past the orange bar)
        // to fill the card width consistently.
        if (nar.summary) {
          setText(TEXT);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const sumLines = doc.splitTextToSize(nar.summary, CONTENT_W - 12) as string[];
          const cardH = 12 + sumLines.length * 5 + 4;
          checkPageBreak(cardH + 4);
          setFill(SAND);
          doc.roundedRect(MARGIN_L, y, CONTENT_W, cardH, 2, 2, "F");
          setFill(ORANGE);
          doc.rect(MARGIN_L, y, 1.5, cardH, "F");
          setText(NAVY);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text("WHAT WE'RE SEEING", MARGIN_L + 6, y + 7);
          setText(TEXT);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(sumLines, MARGIN_L + 6, y + 13);
          y += cardH + 4;
        }

        if (nar.alignmentOverview) {
          const alignLines = doc.splitTextToSize(nar.alignmentOverview, CONTENT_W - 4) as string[];
          const alignH = alignLines.length * 5 + 6;
          checkPageBreak(alignH + 4);
          setText(MUTED);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(alignLines, MARGIN_L + 2, y + 5);
          y += alignH + 4;
        }

        // Key divergences
        // Reserve space for header + first card minimum (~30mm) so the
        // header never orphans. Compute the first card's actual height
        // so the reservation is precise.
        if (nar.keyGaps.length > 0) {
          const firstGap = nar.keyGaps[0];
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          const firstTitleLns = doc.splitTextToSize(firstGap.title, CONTENT_W - 12) as string[];
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          const firstDescLns = doc.splitTextToSize(firstGap.description, CONTENT_W - 12) as string[];
          const firstCardH = 6 + firstTitleLns.length * 5 + 2 + firstDescLns.length * 4.5 + 6;
          checkPageBreak(14 + firstCardH);
          y += 2;
          setText(NAVY);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text("Key divergences", MARGIN_L, y);
          y += 6;

          for (const gap of nar.keyGaps) {
            const titleLns = doc.splitTextToSize(gap.title, CONTENT_W - 12) as string[];
            const descLns = doc.splitTextToSize(gap.description, CONTENT_W - 12) as string[];
            const cardH = 6 + titleLns.length * 5 + 2 + descLns.length * 4.5 + 6;
            checkPageBreak(cardH + 4);
            setFill(SAND);
            doc.roundedRect(MARGIN_L, y, CONTENT_W, cardH, 2, 2, "F");
            setText(NAVY);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(titleLns, MARGIN_L + 6, y + 7);
            setText(MUTED);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(descLns, MARGIN_L + 6, y + 7 + titleLns.length * 5 + 2);
            y += cardH + 4;
          }
        }

        // Recommendations
        // Reserve space for header + first recommendation card minimum
        // so the header never orphans. Compute the first card's actual
        // height for a precise reservation.
        if (nar.recommendations.length > 0) {
          const firstRec = nar.recommendations[0];
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          const firstRecTitleLns = doc.splitTextToSize(firstRec.title, CONTENT_W - 72) as string[];
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          const firstRecRatLns = doc.splitTextToSize(firstRec.rationale, CONTENT_W - 12) as string[];
          const firstRecStepsH = firstRec.steps && firstRec.steps.length > 0
            ? 6 + firstRec.steps.reduce((acc, s, i) => {
                const lns = doc.splitTextToSize(`${i + 1}. ${s}`, CONTENT_W - 18) as string[];
                return acc + lns.length * 4.5;
              }, 0) + 2
            : 0;
          const firstRecCardH = 8 + firstRecTitleLns.length * 5 + 3 + firstRecRatLns.length * 4.5 + firstRecStepsH + 6;
          checkPageBreak(14 + firstRecCardH);
          y += 2;
          setText(NAVY);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text(`Recommended interventions (${nar.recommendations.length})`, MARGIN_L, y);
          y += 6;

          for (const rec of nar.recommendations) {
            const titleLns = doc.splitTextToSize(rec.title, CONTENT_W - 72) as string[];
            const ratLns = doc.splitTextToSize(rec.rationale, CONTENT_W - 12) as string[];
            const stepLns = (rec.steps ?? []).map((s, i) =>
              (doc.splitTextToSize(`${i + 1}. ${s}`, CONTENT_W - 18) as string[])
            );
            const stepsH = rec.steps && rec.steps.length > 0
              ? 6 + stepLns.reduce((a, c) => a + c.length * 4.5, 0) + 2
              : 0;
            const cardH = 8 + titleLns.length * 5 + 3 + ratLns.length * 4.5 + stepsH + 6;
            checkPageBreak(cardH + 4);
            setFill(SAND);
            doc.roundedRect(MARGIN_L, y, CONTENT_W, cardH, 2, 2, "F");

            setText(NAVY);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(titleLns, MARGIN_L + 6, y + 7);

            const prioColor: [number, number, number] =
              rec.priority === "high" ? [153, 60, 29]
              : rec.priority === "medium" ? [99, 56, 6]
              : [15, 110, 86];
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            setText(prioColor);
            doc.text(rec.priority.toUpperCase(), MARGIN_L + CONTENT_W - 6, y + 7, { align: "right" });
            setText(PURPLE);
            doc.text(rec.time_horizon.toUpperCase(), MARGIN_L + CONTENT_W - 26, y + 7, { align: "right" });
            setText(NAVY);
            doc.text(rec.intervention_type.toUpperCase(), MARGIN_L + CONTENT_W - 50, y + 7, { align: "right" });

            let cy = y + 7 + titleLns.length * 5 + 3;
            setText(TEXT);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(ratLns, MARGIN_L + 6, cy);
            cy += ratLns.length * 4.5 + 2;

            if (rec.steps && rec.steps.length > 0) {
              setText(NAVY);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.text("STEPS", MARGIN_L + 6, cy);
              cy += 4;
              setText(MUTED);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(9);
              for (const block of stepLns) {
                doc.text(block, MARGIN_L + 10, cy);
                cy += block.length * 4.5;
              }
            }

            y += cardH + 4;
          }
        }
      } else {
        const noNarMsg = "AI narrative for this leadership-vs-workforce comparison has not been generated yet. Click \"Regenerate AI\" on the dashboard to generate it as part of the standard interpretation cycle.";
        const noNarLines = doc.splitTextToSize(noNarMsg, CONTENT_W - 8) as string[];
        const noNarH = noNarLines.length * 5 + 8;
        checkPageBreak(noNarH + 4);
        setFill([245, 247, 250]);
        doc.roundedRect(MARGIN_L, y, CONTENT_W, noNarH, 2, 2, "F");
        setText(MUTED);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text(noNarLines, MARGIN_L + 4, y + 5);
        y += noNarH + 6;
      }
    }
  }

  // ============================================================
  // INTERVENTIONS PAGE
  // ============================================================
  if (data.exportSections.interventions) {
    doc.addPage();
    y = MARGIN_T;

    sectionHeading("Structured Interventions");

    if (data.interventions.length === 0) {
      setText(MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.text("No structured interventions available.", MARGIN_L, y);
    }

    for (const iv of data.interventions) {
      // Set correct font BEFORE splitting so widths are accurate
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const titleLines = doc.splitTextToSize(
        iv.title,
        CONTENT_W - 16,
      ) as string[];

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const descLines = doc.splitTextToSize(
        iv.description,
        CONTENT_W - 16,
      ) as string[];

      const targetNames = iv.targetDimensions
        .map((d) => DIM_NAME_MAP[d] || d)
        .join(" · ");

      const titleH = titleLines.length * 6;
      const badgeRowH = 10;
      const descH = descLines.length * 5;
      const targetH = 8;
      const cardH = 8 + titleH + badgeRowH + descH + targetH;

      checkPageBreak(cardH + 6);

      setFill(SAND);
      doc.roundedRect(MARGIN_L, y, CONTENT_W, cardH, 2, 2, "F");

      // Title (may wrap)
      setText(NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      let cy = y + 8;
      for (const line of titleLines) {
        doc.text(line, MARGIN_L + 6, cy);
        cy += 6;
      }
      cy += 2;

      // Badge row
      let badgeX = MARGIN_L + 6;
      const drawBadge = (
        text: string,
        bg: [number, number, number],
        fg: [number, number, number],
      ) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const textW = doc.getTextWidth(text);
        const padX = 3;
        const w = textW + padX * 2;
        const h = 5.5;
        setFill(bg);
        doc.roundedRect(badgeX, cy - 4, w, h, 1, 1, "F");
        setText(fg);
        doc.text(text, badgeX + padX, cy);
        badgeX += w + 3;
      };
      const priorityColors: Record<
        string,
        { bg: [number, number, number]; fg: [number, number, number] }
      > = {
        high: { bg: RED_PASTEL, fg: RED },
        medium: { bg: AMBER_PASTEL, fg: [133, 77, 14] },
        low: { bg: GREEN_PASTEL, fg: [15, 110, 86] },
      };
      const pc = priorityColors[iv.priority] || priorityColors.medium;
      drawBadge(iv.priority.toUpperCase(), pc.bg, pc.fg);
      drawBadge(iv.timeHorizon.toUpperCase(), PURPLE_PASTEL, PURPLE);
      drawBadge(iv.interventionType.toUpperCase(), NAVY_PASTEL, NAVY);
      cy += 8;

      // Description
      setText(TEXT);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      for (const line of descLines) {
        doc.text(line, MARGIN_L + 6, cy);
        cy += 5;
      }
      cy += 3;

      // Targets
      setText(MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Targets: ${targetNames}`, MARGIN_L + 6, cy);

      y += cardH + 6;
    }
  }

  // ============================================================
  // TRENDS PAGE
  // ============================================================
  if (data.exportSections.trends && data.narrativeHistory.length > 0) {
    newPage();
    sectionHeading("Trends");

    const cols = [
      { key: "generated", label: "Generated", w: 32 },
      { key: "tri", label: "TRI", w: 14 },
      { key: "rsi", label: "RSI", w: 14 },
      { key: "DIM-PTP-01", label: "Protection", w: 22 },
      { key: "DIM-PTP-02", label: "Particip.", w: 22 },
      { key: "DIM-PTP-03", label: "Prediction", w: 22 },
      { key: "DIM-PTP-04", label: "Purpose", w: 18 },
      { key: "DIM-PTP-05", label: "Pleasure", w: 18 },
      { key: "n", label: "n", w: 18 },
    ];

    const rowH = 7;
    const startX = MARGIN_L;

    // Header
    setFill(SAND);
    doc.rect(startX, y, CONTENT_W, rowH, "F");
    setText(NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    let cx = startX + 2;
    for (const c of cols) {
      doc.text(c.label, cx, y + 4.8);
      cx += c.w;
    }
    y += rowH;

    // Sort most recent first
    const sortedHistory = [...data.narrativeHistory].sort(
      (a, b) =>
        new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
    );

    sortedHistory.forEach((h, i) => {
      checkPageBreak(8);
      const dateStr = new Date(h.generated_at).toLocaleDateString();
      cx = startX + 2;

      // Generated col + Latest badge
      const rowY = y + 4.8;
      setText([30, 30, 35]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(dateStr, cx, rowY);
      if (i === 0) {
        const badgeX = cx + doc.getTextWidth(dateStr) + 2;
        setFill([0, 109, 119]);
        doc.roundedRect(badgeX, rowY - 3.5, 12, 5, 1, 1, "F");
        setText([255, 255, 255]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.text("LATEST", badgeX + 1.5, rowY);
      }
      cx += cols[0].w;

      // TRI
      setText(NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(h.tri_score != null ? h.tri_score.toFixed(1) : "—", cx, y + 4.8);
      cx += cols[1].w;

      // RSI
      setText(PURPLE);
      doc.text(h.rsi_score != null ? h.rsi_score.toFixed(1) : "—", cx, y + 4.8);
      cx += cols[2].w;

      // Dimension scores
      doc.setFont("helvetica", "normal");
      for (const dimId of [
        "DIM-PTP-01",
        "DIM-PTP-02",
        "DIM-PTP-03",
        "DIM-PTP-04",
        "DIM-PTP-05",
      ]) {
        const colW = cols.find((c) => c.key === dimId)!.w;
        const score = h.dimension_scores?.[dimId]?.avg_score;
        setText(DIM_RGB_MAP[dimId]);
        doc.text(score != null ? score.toFixed(1) : "—", cx, y + 4.8);
        cx += colW;
      }

      // n
      setText([30, 30, 35]);
      doc.setFont("helvetica", "normal");
      doc.text(String(h.participant_count), cx, y + 4.8);

      y += rowH;
    });

    y += 4;
    setText(MUTED);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(
      "Trend data reflects all AI interpretation generations for this slice.",
      MARGIN_L,
      y,
    );
  }

  // ============================================================
  // CROSS-INSTRUMENT PAGE
  // ============================================================
  if (data.exportSections.crossInstrument) {
    newPage();
    sectionHeading("Cross-Instrument");

    const introText = "Cross-instrument analysis compares PTP threat and reward dimensions against NAI adoption readiness scores to identify co-elevation patterns. Co-elevation occurs when a dimension is simultaneously elevated in both instruments — these compound patterns require sequential intervention.";
    const introLines = doc.splitTextToSize(introText, CONTENT_W) as string[];
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(introLines, MARGIN_L, y);
    y += introLines.length * 5 + 6;

    // Two-panel side-by-side
    const panelW = (CONTENT_W - 6) / 2;
    checkPageBreak(60);

    // Left panel: PTP
    setFill(SAND);
    doc.roundedRect(MARGIN_L, y, panelW, 55, 2, 2, "F");
    setText(MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("PTP · THREAT & REWARD", MARGIN_L + 4, y + 6);
    let py = y + 12;
    data.dimensions.forEach(dim => {
      const [r, g, b] = hexToRgb(dim.color);
      setText([r, g, b]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(dim.name, MARGIN_L + 4, py);
      setText(NAVY);
      doc.text(dim.avgScore.toFixed(1), MARGIN_L + panelW - 20, py);
      py += 6.5;
    });
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L + 4, py + 1, MARGIN_L + panelW - 4, py + 1);
    setText(NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    if (data.triScore !== null) doc.text(`TRI: ${data.triScore.toFixed(1)}  RSI: ${data.rsiScore?.toFixed(1) ?? "—"}`, MARGIN_L + 4, py + 6);

    // Right panel: NAI
    const rx = MARGIN_L + panelW + 6;
    if (data.naiDimensions && data.naiDimensions.length > 0) {
      setFill(SAND);
      doc.roundedRect(rx, y, panelW, 55, 2, 2, "F");
      setText(MUTED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("NAI · C.A.F.E.S.", rx + 4, y + 6);
      let ny = y + 12;
      data.naiDimensions.forEach(dim => {
        const [r, g, b] = hexToRgb(dim.color);
        setText([r, g, b]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(dim.name, rx + 4, ny);
        setText(NAVY);
        doc.text(dim.avgScore.toFixed(1), rx + panelW - 20, ny);
        ny += 6.5;
      });
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(rx + 4, ny + 1, rx + panelW - 4, ny + 1);
      setText(NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      if (data.naiReadinessIndex !== null) doc.text(`AI Readiness Index: ${data.naiReadinessIndex}/100`, rx + 4, ny + 6);
    } else {
      setFill([245, 245, 245]);
      doc.roundedRect(rx, y, panelW, 55, 2, 2, "F");
      setText(MUTED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("NAI · C.A.F.E.S.", rx + 4, y + 6);
      const msg = doc.splitTextToSize("NAI data not yet available for this slice.", panelW - 8) as string[];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(msg, rx + 4, y + 18);
    }
    y += 60;

    // Co-elevation patterns
    checkPageBreak(20);
    y += 4;
    setText(NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Co-elevation Patterns", MARGIN_L, y);
    setDraw(ORANGE);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_L, y + 2, MARGIN_L + 35, y + 2);
    y += 10;

    if (!data.coElevationPatterns || data.coElevationPatterns.length === 0) {
      const noPatText = data.naiDimensions
        ? "No co-elevation patterns detected — all cross-instrument dimension pairs are within normal range."
        : "Co-elevation pattern detection requires NAI aggregate data for this slice.";
      setFill([245, 247, 250]);
      const noLines = doc.splitTextToSize(noPatText, CONTENT_W - 8) as string[];
      const noH = noLines.length * 5 + 8;
      doc.roundedRect(MARGIN_L, y, CONTENT_W, noH, 2, 2, "F");
      setText(MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text(noLines, MARGIN_L + 4, y + 6);
      y += noH + 6;
    } else {
      for (const p of data.coElevationPatterns) {
        const descLines = doc.splitTextToSize(p.description, CONTENT_W - 12) as string[];
        const cardH = 10 + descLines.length * 5 + 10;
        checkPageBreak(cardH + 4);
        setFill(SAND);
        doc.roundedRect(MARGIN_L, y, CONTENT_W, cardH, 2, 2, "F");
        setText(NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(p.label, MARGIN_L + 6, y + 8);
        setText(MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(descLines, MARGIN_L + 6, y + 14);
        let scY = y + 14 + descLines.length * 5 + 2;
        const [nr, ng, nb] = hexToRgb(p.naiColor);
        const [pr, pg, pb] = hexToRgb(p.ptpColor);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        setText([nr, ng, nb]);
        doc.text(`NAI ${p.naiDimName} ${Math.round(p.naiScore)}`, MARGIN_L + 6, scY);
        setText([pr, pg, pb]);
        doc.text(`PTP ${p.ptpDimName} ${Math.round(p.ptpScore)}`, MARGIN_L + 60, scY);
        y += cardH + 4;
      }
    }

    // Recommended next steps · cross-instrument
    if (data.crossInstrumentRecommendations) {
      const recs = data.crossInstrumentRecommendations;
      checkPageBreak(30);
      y += 6;
      setText(NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Recommended Next Steps · Cross-Instrument", MARGIN_L, y);
      setDraw(ORANGE);
      doc.setLineWidth(0.8);
      doc.line(MARGIN_L, y + 2, MARGIN_L + 60, y + 2);
      y += 8;

      setText(MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text(
        `Generated ${new Date(recs.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        MARGIN_L,
        y,
      );
      y += 6;

      if (recs.summary) {
        // Set font BEFORE splitTextToSize — jsPDF uses the current font for width calc.
        setText(TEXT);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const sumLines = doc.splitTextToSize(recs.summary, CONTENT_W) as string[];
        doc.text(sumLines, MARGIN_L, y);
        y += sumLines.length * 5 + 4;
      }

      for (const rec of recs.recommendations) {
        const titleLines = doc.splitTextToSize(rec.title, CONTENT_W - 50) as string[];
        const ratLines = doc.splitTextToSize(rec.rationale, CONTENT_W - 12) as string[];
        const stepLineCounts = (rec.steps ?? []).map((s, i) =>
          (doc.splitTextToSize(`${i + 1}. ${s}`, CONTENT_W - 18) as string[]).length,
        );
        const stepsHeight = rec.steps && rec.steps.length > 0
          ? 6 + stepLineCounts.reduce((a, c) => a + c * 4.5, 0) + 2
          : 0;
        const cardH = 8 + titleLines.length * 5 + 3 + ratLines.length * 4.5 + stepsHeight + 6;
        checkPageBreak(cardH + 4);

        setFill(SAND);
        doc.roundedRect(MARGIN_L, y, CONTENT_W, cardH, 2, 2, "F");

        // Title
        setText(NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(titleLines, MARGIN_L + 6, y + 7);

        // Priority + horizon badges (right-aligned)
        const prioColor: [number, number, number] =
          rec.priority === "high" ? [153, 60, 29] : rec.priority === "medium" ? [99, 56, 6] : [15, 110, 86];
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setText(prioColor);
        doc.text(rec.priority.toUpperCase(), MARGIN_L + CONTENT_W - 6, y + 7, { align: "right" });
        setText(PURPLE);
        doc.text(rec.time_horizon.toUpperCase(), MARGIN_L + CONTENT_W - 26, y + 7, { align: "right" });

        // Rationale
        let cy = y + 7 + titleLines.length * 5 + 3;
        setText(TEXT);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(ratLines, MARGIN_L + 6, cy);
        cy += ratLines.length * 4.5 + 2;

        // Steps
        if (rec.steps && rec.steps.length > 0) {
          setText(NAVY);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("STEPS", MARGIN_L + 6, cy);
          cy += 4;
          setText(MUTED);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          rec.steps.forEach((step, idx) => {
            const stepLines = doc.splitTextToSize(`${idx + 1}. ${step}`, CONTENT_W - 18) as string[];
            doc.text(stepLines, MARGIN_L + 10, cy);
            cy += stepLines.length * 4.5;
          });
        }

        y += cardH + 4;
      }
    }
  }

  addFooter();

  // ============================================================
  // Save
  // ============================================================
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeOrg = (data.orgName || "Organization").replace(/[^a-zA-Z0-9]+/g, "-");
  doc.save(`BrainWise-PTP-Dashboard-${safeOrg}-${dateStr}.pdf`);
}
