
# Repoint frontend reads to secure views

Mechanical swap of `.from("<base>")` → `.from("<view>" as any)` on read paths only. `as any` cast is needed because the new views aren't yet in the generated `Database` types. No writes, no edge functions, no operations (`opsSupabase`) code touched.

## 1. `items` → `items_presentation` (16 call sites)

- `src/components/assessment/AssessmentFlow.tsx` (~L203) — also drop `reverse_scored, scale_type` from `.select(...)`; keep `item_id, item_number, item_text, anchor_low, anchor_high, dimension_id`.
- `src/pages/MyResults.tsx` (L673, L748)
- `src/components/results/DrivingFacetScores.tsx` (L69, L94)
- `src/components/results/PTPNarrativeSections.tsx` (L169, L376)
- `src/components/results/PTPFullFacetCharts.tsx` (L77)
- `src/components/results/NAINarrativeSections.tsx` (L115, L160)
- `src/pages/PairedReport.tsx` (L519)
- `src/pages/TeamReport.tsx` (L590)
- `src/lib/assemblePdfDataForUser.ts` (L216, L364, L436, L517, L615)
- `src/lib/assembleTeamPdfData.ts` (L91)
- `src/lib/assemblePairedPdfData.ts` (L125)

Left untouched: `src/pages/operations/*`, `ItemFormDialog.tsx` (all `opsSupabase`, different table); `supabase/functions/generate-report`, `supabase/functions/calculate-scores` (service_role on base table).

## 2. `airsa_skills` → `airsa_skills_public` (3 call sites)

- `src/components/results/AirsaCombinedReport.tsx` (L357, L402)
- `src/lib/assemblePdfDataForUser.ts` (L895)

## 3. `coaching_activities` → `coaching_activities_public` (2 read call sites)

- `src/pages/coaching/CoachingActivities.tsx` (L448) — list read
- `src/pages/coaching/CoachingActivityRunner.tsx` (L2547) — single-activity read

Writes to `coaching_activities` (authoring/admin paths) and edge function reads for `analysis_prompt`/`chat_prompt` remain on the base table.

## Notes

- Every swap adds `as any` on the table name argument (`.from("items_presentation" as any)`), matching the pattern already used in the repo for view/table names not in `Database` types (e.g., `useTeamProfile.ts` uses `"team_profiles" as never`). Result-row typing at call sites already uses `as any` / interface casts, so no downstream types break.
- No behavior change expected — views return the same rows for the columns each callsite already reads. `AssessmentFlow` continues to work because `calculate-scores` (server-side) is the sole consumer of `reverse_scored`/`scale_type`.

Ready to switch to build mode and apply.
