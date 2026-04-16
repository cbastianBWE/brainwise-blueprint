
# Plan: Update Purpose dimension to purple brand color

## File 1: `src/pages/MyResults.tsx`
- Change `DIM-PTP-04` in `PTP_DIMENSION_COLORS` from `#2D6A4F` (green) to `#3C096C` (purple).
- Change `DIM-PTP-04` in `PTP_DIMENSION_PASTEL` from `#EAF2EE` to `#EEE8F5` to match the new purple tone.

## File 2: `src/components/results/DrivingFacetScores.tsx`
- Replace the entire `PTP_DIMENSION_COLORS` map with the new official brand palette, matching what `MyResults.tsx` already uses (so facet bars and domain cards stay visually consistent).

No other files changed.
