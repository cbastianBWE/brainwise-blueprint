# Verification of the F1 step 4 plan (individual PTP sectioned generation)

I read the current `useNarrativeGenerator`, `PTPNarrativeSections`, and `PeerPtpReport` to check the plan against reality. The plan is coherent, backward-compatible for team/paired, and safe to apply. Two small clarifications worth flagging before build.

## What definitely won't break

- **Team/paired hook usage.** They don't pass `context`, so:
  - `idBody` stays `{ team_profile_id | paired_profile_id: id }` (no stray `narrative_context` or `include_coach`).
  - The auto-run branch still gates on `status !== "complete"` and keys on `${id}:`.
  - `startedRef.current === key` for `${id}:` matches the prior single-id gate, so no double-run and no stuck loop.
- **Peer report swap.** `sec()` already filters by `currentResult.assessment_result_id`, and `facet_insights_all` is one row per result. Same element shape (`name`, `positive_self/others`, `negative_self/others`), same render block. Owner report, peer report, and PDF now share one source.
- **Provider wiring.** `PTPNarrativeProvider` already forwards the full `usePTPNarrativeData` return through context; adding `generator` and `sectionRefreshKey` to that return automatically exposes them to `PTPReportProgressOverlay`, `FacetList`, and the response accordion.
- **FacetList swap.** Sections 6/7 already know how to render a `FacetInterpretation`. `allFacetInsights` entries have the same shape and the same suffixed `name` used to look up matches, so `.find(f => f.name === facetName)` works unchanged.
- **`fetchNarrativeSections` as a pure read.** On first render sections may be missing; the driver fills them and each `onSectionDone` bumps `sectionRefreshKey`, which re-runs the read effect. Already-generated reports (the common case, since `calculate-scores` fires the orchestrator) render immediately.
- **`fetchFacets` cleanup.** Removing the `facet_insights_${ctx}` block is safe because sections 6/7 no longer read `facetInterpretations` after the FacetList swap. Leaving the `facetInterpretations` / `loadingInterpretations` state declarations dangling is a harmless dead branch.

## Two things to confirm during build (not blockers)

1. **Unit-name vs row-name mapping.** The plan's tracked unit is `overview_narrative_<ctx>`, but the DB rows the frontend reads are `profile_overview_<ctx>` and `personal_summary_<ctx>`. This is fine as long as the backend `overview_narrative_<ctx>` unit writes both of those rows (the prompt states "section content is unchanged", which implies it does). No frontend action needed — the read effect still selects the same `section_type` values it does today, and the driver only tracks unit names for progress. If the backend actually renamed the row to `overview_narrative_<ctx>`, the read effect will need the same rename. Worth a 30-second check on the first generated report.

2. **Progress overlay JSX in the prompt is stripped of tags** (blank lines instead of `<div>`s). Treat that block as pseudocode: the actual JSX must still render the header row (icon + label), the progress bar (`completed / total`), and the retry row. Logic (VISIBLE array, `isDone`, `visible` gate, `currentLabel` fallback) is correct as-is.

## Nothing else regresses

- `SharedResults` → `PeerPtpReport`: peer viewer keeps working; only the impact-table source key changes to a row the RPC already returns.
- `MyResults` coach view: driver runs with `includeCoach: true`, plan includes `coach_questions_<ctx>`, existing coach-question render is unchanged.
- `calculate-scores` still generates on scoring; the driver is only a healer + progress indicator, so the healthy path is unaffected.
- No changes to PDF assembly, sharing controls, or NAI/AIRSA flows.

## Recommendation

Proceed with the plan as written. During implementation, verify point (1) above on the first generated PTP report by checking that `profile_overview_<ctx>` and `personal_summary_<ctx>` rows exist after `overview_narrative_<ctx>` lands in `generator.done`. If they don't, add a small alias in the read effect — no other change needed.
