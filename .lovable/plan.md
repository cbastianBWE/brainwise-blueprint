## Cosmetic fixes: facet question text + dimension band legends

### File 1: `src/components/results/PTPNarrativeSections.tsx`

**Fix A — restore question text in driving facet items**

- Line 407, in `toFacetItem`: change `item_text: "",` to
  ```ts
  item_text: assessmentResponses.find(r => r.itemNumber === f.item_number)?.itemText ?? "",
  ```
  (`assessmentResponses` state is in scope inside `usePTPNarrativeData`.)

- Lines 508 and 514, in the `allFacets` build for the interpretations call: change both `question: "",` to
  ```ts
  question: assessmentResponses.find(r => r.facetName === f.facet_name)?.itemText ?? "",
  ```

**Fix B — show truncated question text in collapsed facet rows (`FacetList`)**

After line 1072 (the `<div>{facetName}</div>` inside the button), add:
```tsx
{facet.item_text && (
  <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.4 }}>
    {isExpanded
      ? facet.item_text
      : facet.item_text.length > 80
        ? facet.item_text.slice(0, 80) + "…"
        : facet.item_text}
  </div>
)}
```

### File 2: `src/pages/MyResults.tsx`

**Fix C — band legend below `PTPDomainCards` grid**

After the closing `</div>` of the `dimensions.map(...)` grid at line 1794, add:
```tsx
<p style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 8, textAlign: "center" }}>
  Score ranges: <strong>Low</strong> 0–39 · <strong>Moderate</strong> 40–69 · <strong>High</strong> 70–100
</p>
```
Wrap the existing grid + new legend in a `<div>` fragment (or `<>...</>`) since the component currently returns the grid directly.

**Fix D — band legend below `NAIDomainCards` grid**

Same pattern after the NAI grid (line 1854):
```tsx
<p style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 8, textAlign: "center" }}>
  Score ranges: <strong>Low</strong> 0–25 · <strong>Moderate</strong> 26–50 · <strong>Elevated</strong> 51–75 · <strong>High</strong> 76–100
</p>
```
Same wrapping fragment treatment.

### Constraints honored
- No other changes to either file.
- `PTPAssessmentResponsesSection` accordion untouched.
- No edge function, RPC, or other component changes.
