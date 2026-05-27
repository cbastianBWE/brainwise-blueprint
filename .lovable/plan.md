# Prompt 2 — Full Facet Charts in PTP PDF

## Files

### 1. `src/components/results/ExportPdfModal.tsx`
- `PdfSections` interface: add `fullFacetCharts: boolean;`
- `ptpSections` `useState` initializer: add `fullFacetCharts: true,`
- `PTP_GROUPS` → "Dimension detail sections" group: add option **after** the two Driving Facet Insights entries:
  ```ts
  { key: "fullFacetCharts", name: "Full Facet Charts", description: "Bar charts of every assessed facet, grouped by All/Threat/Reward" }
  ```

### 2. `src/pages/Departed.tsx`
- Hardcoded `PdfSections` literal: add `fullFacetCharts: true,`

### 3. `src/lib/generateResultsPdf.ts`
- Insert new section block **between Cross-Assessment Connections (line 712) and Assessment Responses (line 717)**.
- Source data: `data.fullFacetData` (already populated; no refetch).
- Variant gating via `data.ptpBrainOverviewVariant === "professional"` → only "All Facets" renders; otherwise All + Threat + Reward.
- Threat = `DIM-PTP-01/02/03`, Reward = `DIM-PTP-04/05`.
- One sub-chart per PDF page (`addFooter(); doc.addPage(); y = MARGIN_T; sectionHeading(...)`).
- Bar chart geometry per spec: facet-name column 75mm right-aligned, bar to remaining width, score 1mm right of bar end. Grid lines at 0/25/50/75/100 with scale labels above.
- Adaptive `rowHeight = clamp(availHeight / rowCount, 3.2, 7)` and `fontSize = clamp(rowHeight - 1.5, 5.5, 8)` for 89/47/42-row cases.
- Sort each sub-chart by `score` descending.
- Pixel-width truncation via `doc.getTextWidth()` loop (no `.slice(N)`).

## Spec corrections found during audit
- **`PTP_DIM_COLOR` is a function, not an object** (line 144: `function PTP_DIM_COLOR(dimId: string): string`). Use `PTP_DIM_COLOR(f.dimensionId)`, not `PTP_DIM_COLOR[f.dimensionId]`. Existing call sites (e.g. line 556, 583, 728) confirm.
- **Score label position bug in spec, applying fix**: use `doc.text(String(f.score), barStartX + barWidth + 1, rowY + fontSize / 4)` (1mm right of actual bar end), not the arithmetic shown in the example code.
- `hexToRgb` exists at line 131 — reuse, no local re-declaration.
- Fonts `Montserrat`/`Poppins` are registered (used throughout cover and headings).
- All other helpers/constants (`MARGIN_L`, `MARGIN_B`, `MARGIN_T`, `CONTENT_W`, `PAGE_H`, `NAVY`, `MUTED`, `sectionHeading`, `addFooter`) exist.

## Verification
```text
npx tsc --noEmit -p tsconfig.app.json                                  # clean
rg "fullFacetCharts" src/components/results/ExportPdfModal.tsx \
   src/lib/generateResultsPdf.ts src/pages/Departed.tsx                # hits in all three
```
- Section block sits between Cross-Assessment Connections and Assessment Responses
- No other `PdfSections` keys added or removed
- `data.fullFacetData` consumed, not refetched
- Pixel-width truncation only

No PDF export from agent — user visual-tests combined/personal/professional contexts.
