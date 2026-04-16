
# Plan: Round score displays to whole numbers

## File 1: `src/pages/MyResults.tsx`
- Replace the chart `Tooltip` formatter `value.toFixed(1)` with `String(Math.round(value))`.
- Replace the `LabelList` formatter `v.toFixed(1)` with `String(Math.round(v))`.

## File 2: `src/components/results/DrivingFacetScores.tsx`
- In `chartData` mapping, replace `Number(item.value.toFixed(1))` with `Math.round(item.value)` so bars carry integer values.
- Replace the `LabelList` formatter `v.toFixed(1)` with `String(Math.round(v))`.
- Tooltip already reads from `chartData` so no further change needed there.

No other files changed.
