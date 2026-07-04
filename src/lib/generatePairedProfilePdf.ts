import jsPDF from "jspdf";
import {
  PAGE_W,
  MARGIN_L,
  CONTENT_W,
  NAVY,
  MUTED,
  BLACK,
  ORANGE,
  TEAL,
  GREEN,
  MUSTARD,
  GRAY,
  createPdfContext,
  renderCoverPage,
  stampPageNumbers,
  cleanMarkdown,
  splitParas,
  drawPairDistRow,
  type PdfContext,
} from "./generatePdfPrimitivesShared";
import type { PairedPdfData, PairedFacetForPdf } from "./assemblePairedPdfData";

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
  repair: boolean;
  intimacy: boolean;
  fullMap: boolean;
  fullMapCharts: boolean;
  coach: boolean;
}

const PAIR_SHAPES = ["farApart", "bothHigh", "bothLow", "bothMedium", "mild"] as const;
type PairShapeKey = (typeof PAIR_SHAPES)[number];

const PAIR_SHAPE_TITLE: Record<PairShapeKey, string> = {
  farApart: "Far apart (opposite ends)",
  bothHigh: "Both high",
  bothLow: "Both low",
  bothMedium: "Both medium",
  mild: "Mild (small, soft difference)",
};

const PAIR_SHAPE_DESC: Record<PairShapeKey, string> = {
  farApart: "One of you is high while the other is low. Expect friction unless it is named.",
  bothHigh: "You are both up here. Amplifies what this drives, for better and worse.",
  bothLow: "Neither of you is high on this. It rarely comes up on its own.",
  bothMedium: "You meet in the middle. Manageable, but easy to overlook.",
  mild: "A small, soft difference. Worth noticing rather than working on.",
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

function asLines(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return [v];
}

function bulletList(ctx: PdfContext, items: string[], indent = 6): void {
  const { doc } = ctx;
  doc.setFont("Montserrat", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  for (const raw of items) {
    if (!raw) continue;
    const lines = doc.splitTextToSize(cleanMarkdown(raw), CONTENT_W - indent - 4);
    ctx.ensureBlockSpace(Math.min(20, lines.length * 4.5 + 2));
    for (let i = 0; i < lines.length; i++) {
      ctx.checkPageBreak(5);
      if (i === 0) doc.text("•", MARGIN_L + indent - 4, ctx.y);
      doc.text(lines[i], MARGIN_L + indent, ctx.y);
      ctx.y += 4.5;
    }
    ctx.y += 1;
  }
}

function twoColumn(
  ctx: PdfContext,
  leftTitle: string,
  leftBody: string[],
  rightTitle: string,
  rightBody: string[],
): void {
  const { doc } = ctx;
  const colGap = 6;
  const colW = (CONTENT_W - colGap) / 2;

  const startY = ctx.y;
  const renderCol = (title: string, body: string[], x: number) => {
    ctx.y = startY;
    doc.setFont("Poppins", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(title, x, ctx.y);
    ctx.y += 5;
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    for (const raw of body) {
      const lines = doc.splitTextToSize(cleanMarkdown(raw), colW - 5);
      for (const line of lines) {
        doc.text("• " + line, x, ctx.y);
        ctx.y += 4.5;
      }
    }
    return ctx.y;
  };
  const leftEnd = renderCol(leftTitle, leftBody, MARGIN_L);
  const rightEnd = renderCol(rightTitle, rightBody, MARGIN_L + colW + colGap);
  ctx.y = Math.max(leftEnd, rightEnd) + 3;
}

function paragraphs(ctx: PdfContext, text: string): void {
  const paras = splitParas(text);
  for (let i = 0; i < paras.length; i++) {
    ctx.bodyText(paras[i]);
    if (i < paras.length - 1) ctx.y += 2;
  }
}

function drivingCard(
  ctx: PdfContext,
  args: { kind: "strength" | "focus"; name: string; why: string; actions: string[] },
): void {
  const { doc } = ctx;
  const accent = args.kind === "strength" ? GREEN : MUSTARD;
  const kindLabel = args.kind === "strength" ? "STRENGTH" : "FOCUS";

  ctx.ensureBlockSpace(28);
  const boxTop = ctx.y;
  const nameLines = doc.splitTextToSize(cleanMarkdown(args.name), CONTENT_W - 6);
  const whyLines = doc.splitTextToSize(cleanMarkdown(args.why), CONTENT_W - 6);
  const actLines = args.actions.flatMap((a) =>
    doc.splitTextToSize("• " + cleanMarkdown(a), CONTENT_W - 10),
  );
  const contentH = 6 + nameLines.length * 4.5 + whyLines.length * 4.5 + actLines.length * 4.5 + 6;

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

  // Agreement bars
  ctx.y += 3;
  const barH = 4;
  const rowH = 8;
  for (const name of dimOrder) {
    ctx.checkPageBreak(rowH + 2);
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

  await renderCoverPage(doc, {
    eyebrow: "PAIRED PROFILE",
    titleLine1: "Paired",
    titleLine2: "Report",
    subtitle: `A shared view of how the two of you fit, where you pull apart, and what to do about it.`,
    participantLabel: "PAIR",
    participantValue: `${data.nameA} & ${data.nameB}`,
    dateLabel: "GENERATED",
    dateValue: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    contextPill: modeTitle(data.mode),
  });

  doc.addPage();
  const ctx = createPdfContext(doc);
  const nm = data.nm;
  const s = data.sections;

  // 1. pair in three
  if (sections.pairInThree && Array.isArray(s.pair_in_three) && s.pair_in_three.length > 0) {
    ctx.sectionHeading("Your pair in three");
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
    ctx.sectionHeading("At a glance");
    drawRadial(ctx, data);
  }

  // 3. shape legend
  if (sections.shapeLegend) {
    ctx.sectionHeading("How to read the shapes");
    for (const k of PAIR_SHAPES) {
      ctx.ensureBlockSpace(14);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text(PAIR_SHAPE_TITLE[k], MARGIN_L, ctx.y);
      ctx.y += 4.5;
      ctx.bodyText(PAIR_SHAPE_DESC[k]);
      ctx.y += 2;
    }
  }

  // 4. driving
  if (sections.driving && s.driving_facets) {
    ctx.sectionHeading("Driving facets");
    if (s.driving_facets.opening) paragraphs(ctx, nm(s.driving_facets.opening));
    ctx.y += 2;

    const strengthSrc = s.driving_facets.strengths ?? [];
    data.strengths.forEach((f, i) => {
      const src = strengthSrc[i];
      const acts = src?.actions ?? (src?.action ? [src.action] : []);
      drivingCard(ctx, {
        kind: "strength",
        name: f.facetName,
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
        name: f.facetName,
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
      ctx.sectionHeading("Driving facets — distribution");
      for (const f of set) {
        drawPairDistRow(ctx, { label: f.facetName, a: f.stats!.a, b: f.stats!.b });
      }
    }
  }

  // 6. within
  if (sections.within && s.within_person) {
    ctx.sectionHeading("Within each person");
    twoColumn(
      ctx,
      data.firstA,
      asLines(s.within_person.a).map(nm),
      data.firstB,
      asLines(s.within_person.b).map(nm),
    );
  }

  // 7. needs
  if (sections.needs && s.needs) {
    ctx.sectionHeading("What each of you needs");
    twoColumn(
      ctx,
      `What ${data.firstA} needs from ${data.firstB}`,
      asLines(s.needs.a_needs_from_b).map(nm),
      `What ${data.firstB} needs from ${data.firstA}`,
      asLines(s.needs.b_needs_from_a).map(nm),
    );
  }

  // 8. communication
  if (sections.communication && s.communication) {
    ctx.sectionHeading("Communication");
    doc.setFont("Poppins", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    ctx.checkPageBreak(6);
    doc.text("In general", MARGIN_L, ctx.y);
    ctx.y += 5;
    for (const line of asLines(s.communication.general)) paragraphs(ctx, nm(line));
    ctx.y += 3;
    ctx.checkPageBreak(6);
    doc.setFont("Poppins", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text("Under pressure", MARGIN_L, ctx.y);
    ctx.y += 5;
    for (const line of asLines(s.communication.under_pressure)) paragraphs(ctx, nm(line));
    ctx.y += 3;
    if (Array.isArray(s.communication.avoid_conflict) && s.communication.avoid_conflict.length > 0) {
      ctx.checkPageBreak(6);
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text("Avoiding conflict", MARGIN_L, ctx.y);
      ctx.y += 5;
      s.communication.avoid_conflict.forEach((t, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${cleanMarkdown(nm(t))}`, CONTENT_W - 6);
        for (const l of lines) {
          ctx.checkPageBreak(5);
          doc.setFont("Montserrat", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...BLACK);
          doc.text(l, MARGIN_L + 3, ctx.y);
          ctx.y += 4.5;
        }
        ctx.y += 1;
      });
    }
  }

  // 9. conflict
  if (sections.conflict && s.conflict) {
    ctx.sectionHeading("Conflict");
    if (s.conflict.summary) paragraphs(ctx, nm(s.conflict.summary));
    ctx.y += 2;
    twoColumn(
      ctx,
      "Mitigate",
      asLines(s.conflict.mitigate).map(nm),
      "Promote healthy",
      asLines(s.conflict.promote_healthy).map(nm),
    );
    if (s.conflict.per_person) {
      ctx.checkPageBreak(6);
      twoColumn(
        ctx,
        `${data.firstA}: read + counter-move`,
        [nm(s.conflict.per_person.a.read), nm(s.conflict.per_person.a.counter_move)],
        `${data.firstB}: read + counter-move`,
        [nm(s.conflict.per_person.b.read), nm(s.conflict.per_person.b.counter_move)],
      );
    }
  }

  // 10. repair (romantic only)
  if (sections.repair && data.mode === "romantic" && s.repair) {
    ctx.sectionHeading("Repair");
    if (s.repair.overview) paragraphs(ctx, nm(s.repair.overview));
    ctx.y += 2;
    twoColumn(ctx, data.firstA, asLines(s.repair.a).map(nm), data.firstB, asLines(s.repair.b).map(nm));
    if (Array.isArray(s.repair.steps) && s.repair.steps.length > 0) {
      s.repair.steps.forEach((t, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${cleanMarkdown(nm(t))}`, CONTENT_W - 4);
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
    ctx.sectionHeading("Intimacy");
    if (s.intimacy.overview) paragraphs(ctx, nm(s.intimacy.overview));
    ctx.y += 2;
    twoColumn(
      ctx,
      data.firstA,
      asLines(s.intimacy.a).map(nm),
      data.firstB,
      asLines(s.intimacy.b).map(nm),
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
    ctx.sectionHeading("The full map");
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
          drawPairDistRow(ctx, { label: f.facetName, a: f.stats?.a ?? null, b: f.stats?.b ?? null });
        }
      } else {
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...BLACK);
        for (const f of items) {
          ctx.checkPageBreak(5);
          doc.text("• " + cleanMarkdown(f.facetName), MARGIN_L + 3, ctx.y);
          ctx.y += 4.5;
        }
      }
      ctx.y += 3;
    }
  }

  // 13. coach (privileged)
  if (sections.coach && s.coach) {
    ctx.sectionHeading("For the coach or admin only");
    if (Array.isArray(s.coach.why) && s.coach.why.length > 0) {
      doc.setFont("Poppins", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      ctx.checkPageBreak(6);
      doc.text("Why these matter", MARGIN_L, ctx.y);
      ctx.y += 5;
      for (const w of s.coach.why) {
        const name = data.itemText.get(w.item) ?? `Item ${w.item}`;
        paragraphs(ctx, `${name}: ${nm(w.rationale)}`);
        ctx.y += 1;
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
        const lines = doc.splitTextToSize(`${i + 1}. ${cleanMarkdown(nm(p))}`, CONTENT_W - 4);
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
  doc.save(`BrainWise-Paired-${data.mode}-${today}.pdf`);
  void GRAY; // silence unused
}
