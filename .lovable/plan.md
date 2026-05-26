## Plan: PTP PDF cover — coordinate adjustments (Option X2)

Apply Y-coordinate changes inside the cover block of `src/lib/generateResultsPdf.ts` only. Keep `NAVY_BLOCK_H = 145`. Keep `ASSESSMENT REPORT`. No other code touched.

### Changes (cover block only)

| Element | Current | New |
|---|---|---|
| Logo width | `addImage(..., 22, 60, 0, ...)` | `addImage(..., 18, 50, 0, ...)` (y=18, width=50) |
| Fallback wordmark y | 32 | 35 |
| ASSESSMENT REPORT y | 62 | 72 |
| Headline line 1 ("Personal Threat") y | 82 | 88 |
| Headline line 2 ("Profile") y | 99 | 105 |
| ™ y | 89 | 98 |
| Description y | 112 | 120 |
| Context `pillY` | 130 | 138 |

All other code in the cover block (colors, fonts, font sizes, x positions, pill geometry, sand block, fields, disclaimer, footer, copyright) stays byte-identical. No changes outside the cover block.

### Verification

1. Run `npx tsc --noEmit -p tsconfig.app.json` — confirm clean.
2. Diff-check by re-reading the cover block: only the listed Y values + logo width changed; ASSESSMENT REPORT line still present; logo width = 50; ™ now at y=98 (sits on "Profile" line, not between lines).
3. Do not export a PDF.
