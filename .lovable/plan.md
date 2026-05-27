## Prompt 4 — PTP PDF orphan prevention + cosmetic fixes

Single-file change: `src/lib/generateResultsPdf.ts`. All other files untouched. Scope strictly per prompt.

### Pre-flight pushback review (all clear)

1. `sectionHeading(` call sites enumerated (lines 425, 450, 501, 513, 553, 639, 667, 830, 839, 848, 866, 949) — all pass only `title`. Adding optional `firstContentHeight?: number` is backward-compatible.
2. `headingBlockH = 10` reasonable: pre-gap `+4` + text 13pt (~4.6mm) + `+2` + line + `+6` = ~12mm worst-case; reserving 10 + content via `Math.max(MIN_BLOCK_SPACE, …)` floors at 30mm, so under-reservation is impossible for small first-content cases.
3. Pre-lifting `setFont("helvetica","normal") + setFontSize(8/9)` matches what the per-card loops already set, so no font-state side effect.
4. 18mm estimate for Driving Facet Scores section heading is conservative; inner `renderFacetScoreTable` retains its own `checkPageBreak`.
5. Dimension Highlights X-shift 6→7.5mm: score is right-aligned at `MARGIN_L + CONTENT_W - 2` (right side of card), so 1.5mm left-side shift cannot collide.

No blockers — proceed.

### Edits

**4.1** `sectionHeading` (lines 198–210): add optional `firstContentHeight?: number` param; compute `reserveH = firstContentHeight != null ? Math.max(MIN_BLOCK_SPACE, 10 + firstContentHeight) : MIN_BLOCK_SPACE` and pass to `ensureBlockSpace`. Rest unchanged.

**4.2.a** Dimension Highlights (line ~639): before `sectionHeading`, set `helvetica/normal/8`, loop dims to find first non-empty narrative, compute `firstCardH = splitTextToSize(...).length * 4.5 + 14`, then `sectionHeading("Dimension Highlights", firstCardH)`. Per-card loop body unchanged.

**4.2.b** Action Plan (line ~553): mirror the in-loop cardHeight formula for `items[0]` (rationale lines, steps reduce, pills, titleHeight=6) → `firstCardHeight`. Pass as 2nd arg to `sectionHeading("Action Plan", firstCardHeight)`. Loop body untouched.

**4.2.c** Driving Facet Scores (line 667): `sectionHeading("Driving Facet Scores", 18)`.

**4.3** Delete the three forced break lines (`addFooter(); doc.addPage(); y = MARGIN_T;`) at lines 443–445 (after Brain Overview). Keep closing `}`.

**4.4** Delete the three forced break lines at lines 845–847 (before Cross-Assessment Connections). Block now flows naturally.

**4.5** Line 691: `y - 3` → `y - 1` (zebra stripe).

**4.6** Line 601: `innerY += 5` → `innerY += 3` (pill→title spacing).

**4.7** Line 651: accent bar width `1.5` → `3`. Lines 655 and 659: text X `MARGIN_L + 6` → `MARGIN_L + 7.5`.

**4.8** Footer sanity: no addFooter() additions/removals — verified the removed forced breaks rely on downstream `checkPageBreak`/`ensureBlockSpace` which already call `addFooter()`.

### Verification after edit

- `npx tsc --noEmit -p tsconfig.app.json` clean
- `rg "sectionHeading\\(.+, " src/lib/generateResultsPdf.ts` — 3 hits (Action Plan, Dimension Highlights, Driving Facet Scores)
- `rg "addPage\\(\\)" src/lib/generateResultsPdf.ts` — confirm no addPage between Brain Overview end and Profile Overview, and no addPage immediately before Cross-Assessment heading; forced breaks at Elevated/Suppressed/Full Facet Charts/cover still present
- Spot-check lines 651/655/659/691/601 reflect new values

Approve to switch to build mode and apply.