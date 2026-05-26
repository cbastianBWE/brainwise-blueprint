## Plan: Rewrite PTP narrative fetch to four-row pattern

### File 1: `src/lib/assemblePdfDataForUser.ts` (lines 222–232)

Replace the single-row `narrative_${contextTab}` fetch with a parallel four-row `.in()` fetch matching the live `PTPNarrativeSections.tsx` pattern.

New block fetches these section types in one query:
- `profile_overview_${contextTab}` → `.text` → `profile_overview`
- `personal_summary_${contextTab}` → `.personal_summary` (array) → `personal_summary`
- `dimension_highlights_${contextTab}` → whole `facet_data` object → `dimension_highlights`
- `cross_and_action_${contextTab}` → `.cross_assessment` + `.action_plan` (array)

Uses `Map` for row lookup and `Array.isArray` guards on array fields. Exact code as specified in the prompt.

### File 2: `src/lib/generateResultsPdf.ts` (lines 44–48)

Extend `PdfData.narrativeSections` type to add two optional fields:
- `personal_summary?: string[]`
- `action_plan?: Array<{ title: string; rationale: string; steps: string[]; dimension_tags: string[] }>`

Existing fields (`profile_overview`, `dimension_highlights`, `cross_assessment`) unchanged.

### Verification

- Run `npx tsc --noEmit -p tsconfig.app.json` (fallback to `tsconfig.json` if app config missing); confirm clean.
- Re-read both modified ranges to confirm only the specified edits were made.
- No PDF export. No other code touched. No rendering changes in the generator (new fields stay unreferenced for now).
