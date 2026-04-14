

# Plan: Replace SliderControl Return Statement

## Single file: `src/components/assessment/AssessmentFlow.tsx`

### Change (lines 391–413)
Replace the entire `return (...)` block in the `SliderControl` function with the new layout that:
- Adds `0` and `100` numeric labels on the ends of the slider
- Positions the score indicator above the thumb, tracking its position via `calc()`
- Adds fixed-width anchor label containers below the slider
- Applies custom sizing classes to the Slider component

No other files changed.

