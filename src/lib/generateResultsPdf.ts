function renderNarrative(d: jsPDF, text: string, insightsOnly: boolean) {
  const lines = text.split("\n");
  let inFacetSection = false;
  let firstFacetFound = false;

  for (const raw of lines) {
    const trimmed = raw.trim();

    // When insightsOnly, skip everything until the first ### individual facet heading
    if (insightsOnly && !firstFacetFound) {
      if (trimmed.startsWith("### ") && !isFacetScoreGroupHeading(trimmed)) {
        firstFacetFound = true;
        inFacetSection = true;
        // fall through to ### rendering below
      } else {
        continue; // skip ALL lines including blanks, ## headings, etc.
      }
    }

    // Skip blank lines appropriately
    if (!trimmed) {
      if (inFacetSection || !insightsOnly) y += 2;
      continue;
    }

    // Handle ## headings
    if (trimmed.startsWith("## ")) {
      // Always skip these headings — they are section groupers, not content
      if (isFacetScoreGroupHeading(trimmed) || isFacetInsightsTopHeading(trimmed)) {
        inFacetSection = false;
        continue;
      }
      // For main narrative (not insightsOnly), skip the facet insights block entirely
      if (!insightsOnly) {
        inFacetSection = false;
        // Render as section heading
        checkPageBreak(12);
        y += 3;
        d.setFontSize(11);
        d.setTextColor(...PRIMARY);
        d.setFont("helvetica", "bold");
        d.text(trimmed.replace(/^##\s*/, "").replace(/\*\*/g, ""), MARGIN_L, y);
        y += 6;
      }
      continue;
    }

    // Handle ### headings
    if (trimmed.startsWith("### ")) {
      if (isFacetScoreGroupHeading(trimmed)) {
        inFacetSection = false;
        continue;
      }
      inFacetSection = true;
      // Skip ### facet headings in main narrative
      if (!insightsOnly) continue;
      // Render wrapped ### heading in insights mode
      checkPageBreak(10);
      y += 2;
      d.setFontSize(9.5);
      d.setTextColor(...PRIMARY);
      d.setFont("helvetica", "bold");
      const headingContent = trimmed.replace(/^###\s*/, "").replace(/\*\*/g, "");
      const wrappedHeading = d.splitTextToSize(headingContent, CONTENT_W);
      for (const hl of wrappedHeading) {
        checkPageBreak(5);
        d.text(hl, MARGIN_L, y);
        y += 5;
      }
      continue;
    }

    // In insights-only mode, skip non-facet content
    if (insightsOnly && !inFacetSection) continue;
    // In main narrative mode, skip facet content
    if (!insightsOnly && inFacetSection) continue;

    // Bold label lines like **Impact on Self:**
    const labelMatch = trimmed.match(/^\*\*(.+?:)\*\*$/);
    if (labelMatch) {
      checkPageBreak(8);
      d.setFontSize(8);
      d.setTextColor(...MUTED);
      d.setFont("helvetica", "bold");
      d.text(labelMatch[1].toUpperCase(), MARGIN_L, y);
      d.setFont("helvetica", "normal");
      y += 5;
      continue;
    }

    // Emoji bullets
    const emojiMatch = trimmed.match(/^(✅|❌)\s*(.+)$/);
    if (emojiMatch) {
      checkPageBreak(8);
      d.setFontSize(8.5);
      const icon = emojiMatch[1] === "✅" ? "+" : "-";
      const rgb = emojiMatch[1] === "✅" ? ([34, 139, 34] as const) : ([200, 50, 50] as const);
      d.setTextColor(rgb[0], rgb[1], rgb[2]);
      d.setFont("helvetica", "bold");
      d.text(icon, MARGIN_L + 2, y);
      d.setTextColor(...BLACK);
      d.setFont("helvetica", "normal");
      const bulletLines = wrapText(cleanMarkdown(emojiMatch[2]), 8.5, CONTENT_W - 10);
      for (const bl of bulletLines) {
        checkPageBreak(5);
        d.text(bl, MARGIN_L + 7, y);
        y += 4;
      }
      y += 1;
      continue;
    }

    // Bullet lines
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      checkPageBreak(8);
      d.setFontSize(8.5);
      d.setTextColor(...BLACK);
      d.setFont("helvetica", "normal");
      d.setFillColor(...PRIMARY);
      d.circle(MARGIN_L + 2, y - 1, 0.8, "F");
      const bulletLines = wrapText(cleanMarkdown(bulletMatch[1]), 8.5, CONTENT_W - 10);
      for (const bl of bulletLines) {
        checkPageBreak(5);
        d.text(bl, MARGIN_L + 7, y);
        y += 4;
      }
      y += 1;
      continue;
    }

    // Regular text
    d.setFontSize(8.5);
    d.setTextColor(...BLACK);
    d.setFont("helvetica", "normal");
    const textLines = wrapText(cleanMarkdown(trimmed), 8.5, CONTENT_W);
    for (const tl of textLines) {
      checkPageBreak(5);
      d.text(tl, MARGIN_L, y);
      y += 4;
    }
    y += 1;
  }
  y += 4;
}
