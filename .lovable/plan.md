
# Plan: Remove line clamp from facet description

## Single file: `src/components/results/PTPNarrativeSections.tsx`

Change the facet description `<div>` to remove the `line-clamp-2` utility so the full description text is visible (no two-line truncation).

- From: `<div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">`
- To: `<div className="text-xs text-muted-foreground mt-0.5">`

No other changes.
