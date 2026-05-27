## Prompt 5 — Continuation header system

Single-file change: `src/lib/generateResultsPdf.ts`. No removals, no behavior changes outside the new continuation-header render path.

### Pre-flight pushback (all clear)

1. `MUTED` defined at line 91 (`[109, 104, 117]`). ✓
2. `MARGIN_T = 20`, so `MARGIN_T - 5 = 15mm` — safely inside the top-margin gutter. ✓
3. Font-state pollution: every section's render loops re-set font/size/color before drawing (verified at lines 461, 494, 687, 706, 771, 918, 980). New helper's setFont/setFontSize/setTextColor calls cannot leak into content. ✓
4. Heading title length: longest is `Full Facet Charts — All Facets` (~30 chars uppercased + " · CONTINUED"). At 7.5pt that's well under CONTENT_W (180mm). ✓
5. Order in `sectionHeading`: clearing then setting after `ensureBlockSpace` is exactly the intended suppression-then-activation pattern. ✓

No blockers — proceed.

### Edits

**5.1** After `let y = MARGIN_T;` (line 165), add:
```
let currentSectionTitle: string = "";
```

**5.2** Between `addFooter` (ends ~line 175) and `checkPageBreak` (line 177), insert:
```
const renderContinuationHeader = () => {
  if (currentSectionTitle === "") return;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text(`${currentSectionTitle.toUpperCase()} · CONTINUED`, MARGIN_L, MARGIN_T - 5);
};
```

**5.3** In `checkPageBreak`, add `renderContinuationHeader();` right after `y = MARGIN_T;`.

**5.4** In `ensureBlockSpace`, add `renderContinuationHeader();` right after `y = MARGIN_T;`.

**5.5** In `sectionHeading`:
- Set `currentSectionTitle = "";` as the FIRST executable line (before computing `reserveH`).
- Set `currentSectionTitle = title;` immediately AFTER the `ensureBlockSpace(reserveH);` call and BEFORE the `if (!atTopOfPage())` line.

This guarantees:
- If `ensureBlockSpace` inside `sectionHeading` triggers a page break, the new page renders nothing (empty title guard) — the about-to-print full heading takes over.
- Content-driven page breaks within the section render `<TITLE> · CONTINUED` correctly.

**5.6 / 5.7 (no-op verifications)** Forced leading breaks at DFI Elevated (~856–858), DFI Suppressed (~865–867), Full Facet Charts per-chart (~889–891), and the cover→Brain Overview transition (~426): all use raw `doc.addPage(); y = MARGIN_T;` outside `checkPageBreak`/`ensureBlockSpace`, so `renderContinuationHeader` never fires. The subsequent `sectionHeading()` call resets title via 5.5 logic. No code change needed at these sites.

### Verification

- `npx tsc --noEmit -p tsconfig.app.json` clean
- `rg "renderContinuationHeader" src/lib/generateResultsPdf.ts` — 3 hits (definition + 2 call sites)
- `rg "currentSectionTitle" src/lib/generateResultsPdf.ts` — 4 hits (declaration + guard + clear + set)
- Spot-check that forced-break stanzas (DFI Elevated/Suppressed, Full Facet Charts, cover) are untouched

Approve to switch to build mode.