

# Plan: Update SliderControl with Custom Styles and New Layout

## Single file: `src/components/assessment/AssessmentFlow.tsx`

### Change: Replace the entire `return (...)` block in `SliderControl`

Replace the current return statement with the new version that:
- Adds a `<style>` tag with custom CSS for `.assessment-slider` (hover/active thumb effects, track height)
- Moves the score display above the slider as a large centered `3xl` number
- Wraps the `Slider` in a `.assessment-slider` div
- Removes the inline Tailwind slider sizing classes
- Adjusts spacing (`space-y-4`, `px-2`, `gap-4`) and anchor label layout (`w-1/2`)

No other files changed.

