## PTP PDF — formatting audit (read-only, plan only)

All issues live in `src/lib/generateResultsPdf.ts`. Findings below; nothing changed yet.

---

### 1. Action Plan pill overlaps title (p2, p3)

**Where:** Action Plan loop, lines ~631-655.

**Root cause:** The dimension pills are drawn from `innerY-4` to `innerY+1` (5mm tall). After the pill loop, the code only advances `innerY += 3` (line 647). The title is then drawn at the new `innerY` (line 654). Net gap between pill bottom and title baseline ≈ 2mm — and an 11pt title has ~3.9mm cap height, so the title's ascenders punch back through the pill.

**Fix:** After the pill loop, set the cursor below the pill bottom plus a real gap, e.g. `innerY = (innerY - 4) + 5 + 4` → `innerY += 5` (replacing the `+= 3`). Optionally bump card padding: change `titleHeight = 6` and `cardHeight` formula to include a `pillToTitleGap` constant so the rounded-rect height tracks the new spacing and the title doesn't shift into the rationale either.

---

### 2. First Dimension Highlight box wraps to ~½ width; all boxes look over-tall (p3-p4)

**Where:** Dimension Highlights loop, lines 697-718; pre-compute block 685-695.

**Root cause (narrow wrap on first card):** `sectionHeading("Dimension Highlights", …)` (line 696) leaves the font set to **Poppins bold 13pt**. The first iteration immediately calls `doc.splitTextToSize(text, CONTENT_W - 12)` (line 702) **before** the font is reset. `splitTextToSize` measures with the current font, so 13pt bold yields ~half as many characters per line as 8pt — producing a tall, narrow column. From iteration 2 onward, the prior iteration's tail (lines 713-714: `setFontSize(8) / Montserrat normal`) is still active, so wrapping is correct.

The pre-compute block (685-695) has the same latent bug but happens to use 8pt because sectionHeading hadn't run yet.

**Fix:** Set `doc.setFont("Montserrat", "normal"); doc.setFontSize(8);` once **before** the for-loop on line 697, and also before the pre-compute splitTextToSize on line 692 (it already does but verify). Then every iteration measures with the right metrics.

**Root cause (trailing whitespace inside box):** `cardH = textLines.length * 4.5 + 14`. The `+14` reserves 7mm above the body (header baseline at `y+7`) plus 7mm below — too generous now that body line height is 4.5. Last line baseline sits at `y + 13 + (n-1)*4.5`, so true content bottom ≈ `y + 13 + n*4.5 - 4.5 + 1.5 = y + n*4.5 + 10`. Current `+14` leaves ~4mm slack on every box.

**Fix:** Tighten to `cardH = 11 + textLines.length * 4.5` (header band 11mm + lines), or define `HEADER_BAND = 11`, `BOTTOM_PAD = 2.5`, so `cardH = HEADER_BAND + textLines.length * 4.5 + BOTTOM_PAD`. Boxes shrink to fit content; no minimum height applied.

---

### 3. "Driving Facet Scores" header orphans at page bottom; next page mislabeled "· CONTINUED" (p4-p5)

**Where:** `sectionHeading("Driving Facet Scores", 18)` at line 724, plus `renderFacetScoreTable` at 726-766.

**Root cause:** The reservation `firstContentHeight = 18` is too small. The first table actually needs `5 (title) + 2 (gap) + 4 (header rule) + N * 6 (rows)` — at least ~25mm for a 2-row preview, ~37mm for 4 rows. When 18-25mm is available, the heading prints, then `renderFacetScoreTable` immediately calls `checkPageBreak(12 + facets.length * 7)` (line 727), which forces a page break — and the next page top runs `renderContinuationHeader()` for a section whose body never started, producing the misleading "· CONTINUED" tag.

**Fix:** Compute the real first-chunk height before calling sectionHeading:
```
const firstTableLen = (data.elevatedFacets.length > 0 ? data.elevatedFacets.length : data.suppressedFacets.length);
const firstChunkH = 5 + 6 + Math.min(firstTableLen, 4) * 6 + 4; // title + header + ~4 rows
sectionHeading("Driving Facet Scores", firstChunkH);
```
This forces sectionHeading's `ensureBlockSpace` to break **before** the heading if the heading + first ~4 rows won't fit together. The "· CONTINUED" tag will then only appear on legitimate mid-table continuations.

**Optional hardening:** In `sectionHeading`, after the page break, do a second `if (atTopOfPage()) currentSectionTitle = title;` and skip rendering the continuation header on the page that actually contains the full heading — already handled by the temporary `currentSectionTitle = ""` clear, but worth re-verifying for the case where `ensureBlockSpace` triggers vs doesn't.

---

### 4. Two-column impact blocks split across pages — shared renderer needed (p6-p7, p8-p9, p18)

**Where:** Two distinct sites, same layout:
- `renderFacetInsights`, lines 773-884 (Driving Facet Insights)
- Assessment Responses inline expansion, lines 1048-1139 (`assessmentResponsesIncludeInsights`)

**Root cause (Insights):** Line 794 caps the reservation at `Math.min(estimatedBlockH, 80)` — anything taller than 80mm is allowed to split. Then the per-row loop at 852-881 calls `checkPageBreak(rowH + 2)` for each row independently, freely splitting. The Tradition/Environmental Safety facets exceed 80mm and orphan their trailing bullets.

**Root cause (Assessment Responses Q58):** Lines 1048-1139 never reserve the full impact block; only per-row `checkPageBreak(rowH)` at line 1110. The question row above (line 1021) was already reserved separately. So question prints on page N, divider prints, then impact rows split across N→N+1.

**Fix (shared mechanism):** Extract a helper:
```
const PAGE_AVAIL = PAGE_H - MARGIN_T - MARGIN_B;
const reserveBlockOrAllow = (totalH: number) => {
  // If the block fits on a single page, force a page break so it stays intact.
  // If it's taller than a full page, fall back to flow (let inner checkPageBreaks handle it).
  if (totalH <= PAGE_AVAIL && y + totalH > PAGE_H - MARGIN_B) {
    addFooter(); doc.addPage(); y = MARGIN_T; renderContinuationHeader();
  }
};
```
Then both sites pre-measure the **full** block — for Insights: `15 (header) + 5 (impact labels) + sum_i max(selfRowH[i], othersRowH[i]) + 6`; for Assessment Responses expansion: `questionRowH + 1 + 4 (label band) + sum_i max(leftRows[i].height, rightRows[i].height) + 2`. Pass to `reserveBlockOrAllow` before rendering the block header. Remove the `Math.min(…, 80)` cap on line 794 and the per-row `checkPageBreak` calls inside the block (or keep them only as a safety net for the >page-height case).

For Assessment Responses, the reservation must wrap **both** the question card and its impact expansion together — currently they're treated as two independent units (lines 1021 then 1110), which is why Q58 splits.

---

### 5. Chart vs Assessment Responses overlap; chart never advances cursor (p15, p16)

**Where:** `renderFacetBarChart`, lines 915-990; called at 992, 999, 1000. Assessment Responses begins at line 1006 with no page break.

**Root cause:**
1. `renderFacetBarChart` computes `chartEndY = PAGE_H - MARGIN_B - 8` (line 929) and draws gridlines all the way to `chartEndY` (line 944), regardless of how many rows actually fill that space. On Threat (fewer rows, larger rowHeight up to cap 7), the last bar sits well above `chartEndY` but gridlines run to the bottom of the page.
2. After rendering, the function **never updates `y`**. `y` is still the value from before the chart was drawn (line 928 takes `y + 2` into a local, never writes back). The next call (next chart or Assessment Responses) starts at that stale `y`.
3. The All/Threat/Reward charts each call `addPage()` at the top (line 922), so chart-on-chart overlap is prevented — but the **section after the last chart** (Assessment Responses) does **not** force a new page, so it paints on top of the Reward chart.

**Fix:**
- (a) Compute `actualChartH = rowCount * rowHeight`, set `chartEndY = chartStartY + actualChartH`, and draw gridlines only to that height. Stops the over-long gridlines on Threat.
- (b) At the end of `renderFacetBarChart`, write back: `y = chartEndY + 4;` so the cursor is correct even if the next section doesn't force a page.
- (c) Make Assessment Responses start on its own page, matching the pattern used by Driving Facet Insights (lines 887-890):
  ```
  if (sections.assessmentResponses && data.assessmentResponses.length > 0) {
    addFooter(); doc.addPage(); y = MARGIN_T;
    sectionHeading("Assessment Responses");
    …
  }
  ```
- (d) Belt-and-suspenders: at the top of `renderFacetBarChart`, the existing `addFooter(); addPage()` is correct — keep it.

---

### 6. No padding between question divider and "Impact on self/others" labels (p18+)

**Where:** Assessment Responses expansion, line 1057 (`y += 1;`) and labels rendered at line 1096.

**Root cause:** After the question card, line 1044 draws the divider at `y + rowH`, then `y += rowH + 1` (line 1045). The expansion adds only `y += 1` (line 1057) before drawing the impact labels at the current `y` (line 1096). Total gap between divider rule and label baseline ≈ 2mm.

**Fix:** Change `y += 1;` on line 1057 to `y += 4;` (or define `IMPACT_LABEL_GAP = 4` for clarity). Yields a 5mm gap, matching the visual rhythm of the Insights renderer.

---

## Out of scope for this audit

No edits made. Cover page, footer, continuation header system, and all other sections untouched in this analysis. Approve the plan to switch to build mode and I'll implement issues 1-6 in a single pass on `src/lib/generateResultsPdf.ts` only.
