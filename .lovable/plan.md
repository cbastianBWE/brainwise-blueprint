# D4: PTP narrative rewire + regenerate button removal

Two unrelated changes across two files. No backend changes.

## Change 1 — `src/components/results/PTPNarrativeSections.tsx`

### 1a. Rewrite `fetchNarrativeSections` (second `useEffect`, lines 272–383)

Replace the legacy single-row read + monolith invoke with a per-context, three-call sequence using the new backend paths.

New behavior:

1. Guard `if (!ptpContextTab) return;`, then `setLoadingNarrativeSections(true)` and `setNarrativeSections(null)`.
2. **Cache check**: read `facet_interpretations` row where `section_type = 'profile_overview_${ptpContextTab}'` for `assessmentResultId`. If present, skip step 3 and go to assembly.
3. **Generate (only if cache miss)**: get session once via `supabase.auth.getSession()`. Then sequentially `await` three `supabase.functions.invoke("generate-facet-interpretations", ...)` calls, each with `Authorization: Bearer ${session?.access_token}`:
   - `{ assessment_result_id, generate_context_narrative: true, narrative_context: ptpContextTab }`
   - `{ assessment_result_id, generate_dimension_highlights: true, narrative_context: ptpContextTab }`
   - `{ assessment_result_id, generate_cross_and_action: true, narrative_context: ptpContextTab }`

   If any invoke returns `error`, stop, `setLoadingNarrativeSections(false)`, return without setting `narrativeSections`. No partial assembly.
4. **Assembly read**: read four rows from `facet_interpretations` for `assessmentResultId` with `section_type` in:
   - `profile_overview_${ctx}` → `assembled.profile_overview = row?.facet_data?.text`
   - `personal_summary_${ctx}` → `assembled.personal_summary = row?.facet_data?.personal_summary`
   - `dimension_highlights_${ctx}` → `assembled.dimension_highlights = row?.facet_data` (whole object)
   - `cross_and_action_${ctx}` → `assembled.cross_assessment = row?.facet_data?.cross_assessment`, `assembled.action_plan = row?.facet_data?.action_plan`

   Use optional chaining throughout. Call `setNarrativeSections(assembled)` then `setLoadingNarrativeSections(false)`.

Delete the now-dead pre-invoke assembly: `dimensionScoresObj`, `dimensionItemsMap`, and the entire `otherAssessmentsEnriched` `Promise.all` block.

Update the dep array from `[assessmentResultId, ptpContextTab, dimensionScores, otherAssessments, assessmentResponses]` to `[assessmentResultId, ptpContextTab]`.

`NarrativeSectionsShape` and all consumer components are unchanged.

### 1b. Remove no-fallback violations

Two spots silently substitute the unfiltered set when the context filter yields zero rows. Make the filter unconditional.

- In `fetchResponses` (~lines 260–263): replace the `if (filtered.length > 0) scored = filtered;` guarded block with `scored = scored.filter((s) => s.contextType === ptpContextTab);` inside the same `professional`/`personal` check.
- In `fetchFacets` (~lines 422–425): same change with `s.context_type === ptpContextTab`.

## Change 2 — `src/pages/MyResults.tsx`

### Remove Regenerate Interpretation UI

In the "Your Profile Interpretation" `<Card>` (non-PTP/non-NAI branch, ~lines 1333–1434), remove:
- The `{regeneratedVersion && (...)}` block (~1343–1347).
- The `{limitReached && (...)}` block (~1348–1360).
- The entire `{!isCoachView && ( regenerating ? ... : <>...</> )}` block (~1361–1422), including the spinner, the Regenerate button, and both `AlertDialog`s (`showUpgradeDialog`, `showConfirmDialog`).

Keep: `NarrativeRenderer`, the `Generated with {version}` line, the `pollingNarrative` spinner branch, the "No narrative available" fallback.

### Remove orphaned code

- `handleRegenerate` `useCallback` (~lines 617–669).
- State declarations: `regenerating/setRegenerating`, `regeneratedVersion/setRegeneratedVersion`, `limitReached/setLimitReached`, `showConfirmDialog/setShowConfirmDialog`, `showUpgradeDialog/setShowUpgradeDialog`.
- `useAiUsage` import + `const { fetchUsage, consumeMessage } = useAiUsage();` — verified no other references in the file, safe to remove both the destructure and the import.

Keep `RefreshCw` (still used by the polling spinner and Retake Assessment button).

## Verification

Run `npx tsc --noEmit` after edits to confirm a clean typecheck.
