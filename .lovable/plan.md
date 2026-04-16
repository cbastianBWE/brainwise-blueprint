
# Plan: Recolor Prediction dimension to muted gray

## File 1: `src/pages/MyResults.tsx`
- In `PTP_DIMENSION_COLORS`, change `DIM-PTP-03` from `#F5741A` (orange) to `#6D6875` (gray).
- In `PTP_DIMENSION_PASTEL`, change `DIM-PTP-03` from `#FEF0E7` to `#F0EFF1` to match the new gray tone.

## File 2: `src/components/results/DrivingFacetScores.tsx`
- In `PTP_DIMENSION_COLORS`, change `DIM-PTP-03` from `#F5741A` to `#6D6875` so facet bars stay consistent with the domain cards.

No other files changed.
