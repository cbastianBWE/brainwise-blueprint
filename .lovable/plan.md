

# Plan: Add z-50 to AssessmentFlow Root Element

## Single file: `src/components/assessment/AssessmentFlow.tsx`

Add `z-50` to the outermost div's className to ensure the assessment overlay renders above sidebar/navigation elements.

### Change (line ~186)
```tsx
// Before
<div className="fixed inset-0 bg-background flex flex-col">

// After
<div className="fixed inset-0 bg-background flex flex-col z-50">
```

No other files changed.

