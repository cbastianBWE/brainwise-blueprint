## Fix driving facet question text (timing)

`facet.item_text` is captured at fetch time when `assessmentResponses` is still `[]`. Switch to a render-time lookup from `data.assessmentResponses` inside `FacetList`.

### File: `src/components/results/PTPNarrativeSections.tsx`

In `FacetList`, replace the `{facet.item_text && (...)}` block (added in the previous fix, just after the `<div>{facetName}</div>`) with an IIFE that looks up the text live:

```tsx
{(() => {
  const questionText = data.assessmentResponses.find(r => r.itemNumber === facet.item_number)?.itemText ?? "";
  return questionText ? (
    <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.4 }}>
      {isExpanded
        ? questionText
        : questionText.length > 80
          ? questionText.slice(0, 80) + "…"
          : questionText}
    </div>
  ) : null;
})()}
```

No changes to `toFacetItem`, the `allFacets` build, or anything else.
