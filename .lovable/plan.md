
# Plan: Brand colors + PTP domain cards in MyResults

## Single file: `src/pages/MyResults.tsx`

### Change 1 — Update PTP color palette
Replace `PTP_DIMENSION_COLORS` with the new official brand hex values, and add two new constants alongside it: `PTP_DIMENSION_PASTEL` (light backgrounds for cards) and `PTP_DIMENSION_NAMES` (display names for the five P's).

### Change 2 — Reuse the constant in PDF export
Inside `handlePdfExport`, replace the hardcoded `PTP_DIM_COLORS` map with `const PTP_DIM_COLORS = PTP_DIMENSION_COLORS;` so the PDF picks up the new brand colors automatically.

### Change 3 — PTP domain cards in Section 2
In Section 2's `CardContent`, add a new branch: when `effectiveSelected?.isPTP` is true, render `<PTPDomainCards>` instead of the bar chart. AIRSA still renders `AIRSACards`; everything else still renders the existing chart.

Add a new `PTPDomainCards` component at the bottom of the file (just before `formatDimensionName`) that renders a responsive 2/3/5-column grid of pastel cards, each showing the dimension name, rounded score, and a Low/Moderate/High band derived from the score (≥70 High, ≥40 Moderate, else Low).

No other files changed.
