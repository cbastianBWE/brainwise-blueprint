## Prompt 6 — Font migration + polish bundle

Single-file change: `src/lib/generateResultsPdf.ts`. No new files, no behavior change outside the listed scope.

### Pre-flight pushback (all clear)

1. `registerPdfFonts(doc)` confirmed at line 164 — Poppins/Montserrat available before any text renders. ✓
2. Weight aliases confirmed in `pdfFonts.ts` header: Poppins {normal, semibold, bold, extrabold}, Montserrat {normal, medium, semibold, bold}. Role map uses only registered weights. ✓
3. `noUnusedParameters: false` in all three tsconfigs — `void title;` line in 6.2 is harmless but unnecessary. Will keep it for safety/clarity per prompt instruction. ✓
4. `f.facetName` confirmed on `FacetWithInterpretation` (already read at the Full Facet Charts site with the same `||` fallback chain). ✓
5. Helvetica call count: 41, matches the prompt's table exactly. ✓
6. Montserrat semibold (600) chosen over medium (500) for inline emphasis per recommended default. No visual proof to override. ✓
7. Removing circle+vector checkmarks → text +/- is a visual lightening that's the explicit decision; flagging per checklist item 7 but proceeding. ✓

No blockers — proceed.

### Order of operations

Apply **6.2** (sub-heading removal) FIRST so subsequent line numbers shift before the bulk font replace. Then 6.1, 6.3+6.4, 6.5.

### Edits

**6.2 — Drop redundant sub-headings inside `renderFacetInsights`** (~lines 762–769)
Keep signature, early-return, and `checkPageBreak(40)`. Remove the 4 lines that render the inner title. Add `void title;` to silence any future strict-mode warning. Callers at lines 883/892 unchanged.

**6.1 — Bulk font migration** (41 sites)
Walk every `doc.setFont("helvetica", ...)` and replace per the role map:
- Section heading 13pt bold → **Poppins bold 13pt**
- Card-level titles (Action Plan 11pt, Profile Overview dim score 14pt) → **Poppins bold**
- Sub-heading 9pt bold (Dimension Highlights, Driving Facet Scores sub-title, Driving Facet Insights card title) → **Poppins semibold 9pt**
- All inline bold emphasis at ≤8pt (table headers, pill text, score badges, Q labels, +/- markers) → **Montserrat semibold** (or **Montserrat bold** for the score-badge / +- marker sites the prompt explicitly calls out as bold)
- All normal body text → **Montserrat normal**
- Footer (line 172) and continuation header (line 184) → **Montserrat normal**

Cover page (lines ~275–450) untouched.

**6.3 + 6.4 — Pixel-width truncation**

6.4.a Profile Overview stat card value (line 491): after setting Montserrat semibold 9pt, truncate by `doc.getTextWidth` against `cardW - 6` using the standard `while (width > max && len > 5) slice(0,-2)` pattern, then append `"…"` only if truncated.

6.4.b Driving Facet Scores row (line 748): swap `f.itemText` → `f.facetName || f.itemText || "—"`, truncate by pixel width against `CONTENT_W * 0.82 - 10`. Same while-loop pattern. Matches the Full Facet Charts convention.

**6.5 — Unify checkmark style**
Delete local `drawCheck` / `drawCross` helpers (lines 1060–1078). Replace both invocations in Assessment Responses expansion (lines ~1120–1127) with the inline text `+` / `-` pattern used in Driving Facet Insights: 8pt Montserrat bold, green for positive / red for negative, positioned at `(leftX, y+2)` / `(rightX, y+2)`, then reset to Montserrat normal + BLACK before drawing `lines`.

### Out of scope (preserve)

- Cover page (~275–450), `data.dateTaken` rendering, P4 forced page breaks, P4 orphan reservation logic, P5 continuation header system, anything outside `src/lib/generateResultsPdf.ts`.

### Verification

- `rg 'setFont\("helvetica"' src/lib/generateResultsPdf.ts` → 0 hits
- `rg 'setFont\("Poppins"' src/lib/generateResultsPdf.ts` → ≥6 hits
- `rg 'setFont\("Montserrat"' src/lib/generateResultsPdf.ts` → ~30 hits
- `rg "drawCheck|drawCross" src/lib/generateResultsPdf.ts` → 0 hits
- `rg 'f\.itemText' src/lib/generateResultsPdf.ts` → no hits inside Driving Facet Scores row (Full Facet Charts site retained)
- `rg 'doc\.text\(title, MARGIN_L, y\)' src/lib/generateResultsPdf.ts` → 0 hits
- No `.slice(0, 20)` or `.slice(0, 82)` remain in the two truncation sites
- `npx tsc --noEmit -p tsconfig.app.json` clean
- Spot-check forced-break stanzas (DFI Elevated/Suppressed, Full Facet Charts per-chart, cover→Brain Overview) untouched
- Spot-check `renderContinuationHeader` body now uses Montserrat normal but call sites unchanged

Cole will run the visual verification checklist on re-exported Combined/Personal/Professional PDFs.

Approve to switch to build mode.