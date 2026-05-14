# PTP Narrative Cache-Check + Driving Facets Context-Scope Fix

Apply targeted fixes to two files. Backend (generate-facet-interpretations v38) is already deployed.

## File 1 — `src/components/results/PTPNarrativeSections.tsx`

**1A.** Add `facet_name: string` to the `FacetItem` interface (line 149-155).

**1B.** Replace narrative cache-check (lines 280-309): query all four `requiredCacheTypes` (`profile_overview_${ctx}`, `personal_summary_${ctx}`, `dimension_highlights_${ctx}`, `cross_and_action_${ctx}`) using `.in("section_type", ...)`, build a `Set` of present types, and only skip the three invokes if every required type is present. Invoke loop unchanged.

**1C.** Replace `fetchFacets` Phase 1 (lines 350-406): drop the responses/items/scoring/mean/stdDev computation; instead read `driving_facets_${ctx}` from `facet_interpretations`, map its `elevated`/`suppressed` arrays to `FacetItem` (with `item_text: ""`, `facet_name: f.facet_name`), slice to 10. Early-return if neither array exists.

**1D.** Replace `fetchFacets` Phase 2 (lines 408-450): change cache section_type to `facet_insights_${ctx}` (use `.maybeSingle()`); build `allFacets` using `f.facet_name` and `question: ""`; pass `narrative_context: ctx` in the invoke body.

**1E.** In `FacetList` (line 781): replace `const facetName = PTP_ITEM_FACET_NAMES[...] ?? facet.item_text.slice(0,40)` with `const facetName = facet.facet_name`. Remove the line-809 `<div>{facet.item_text}</div>` subtitle entirely; keep the facet-name `<div>` above it.

## File 2 — `src/lib/assemblePdfDataForUser.ts`

**2A.** Replace the `if (isPTP)` block (lines 234-307):
- Read interpretations from `facet_insights_${contextTab}` (fall back to `facet_insights` when no contextTab).
- When `contextTab` is set, read `driving_facets_${contextTab}` and map elevated/suppressed (sliced to 10) into facet objects with `itemText: ""`, `facetName: f.facet_name`, `interpretation` looked up by name.
- Keep the `assessmentResponses` branch intact but move it under its own `if (sections.assessmentResponses)` block with its own response/items fetch; select `facet_name` on items and use `item.facet_name` as `facetName` (fallback to `item_text.slice(0,40)`); preserve the `professional`/`personal` filter with the `if (filtered.length > 0)` guard exactly as is.

## Verification

After both edits, run `npx tsc --noEmit` to confirm a clean typecheck. No other changes.
