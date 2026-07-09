# CoachingActivityRunner Hardening — Staged Plan

Behavior-preserving cleanup of `src/pages/coaching/CoachingActivityRunner.tsx` (~3,690 lines, 17 widget wrappers, 45 useState / 4 useMemo / 8 useCallback / 0 memo / 0 lazy). Two distinct problems:

1. **Runtime lag** — every keystroke re-renders the whole runner; nothing memoized.
2. **File size** — slow/expensive to edit in Lovable.

Activities are DB rows, not code — the runner only grows when a new widget *type* is added, which is rare. Keep the config-driven runner; do NOT split per activity.

## Guardrails (after every stage)
- Preview click-through: **0420 Your PTP, 0450 Your team, 0503 Recent past, 0505 Major influencers**.
- Type in text fields, run one AI analysis, check console for errors.
- Commit only when green. One stage per prompt.

## Stage 0 — Profile first
Open React DevTools Profiler in the live app. Record while (a) typing in a `qa_multimodal` field and (b) filling influencer detail cards. Capture which components re-render per keystroke and their durations. Track B choices depend on this evidence — don't guess.

## Track A — File split (safe, mechanical; do regardless of Stage 0)

**A1 — Shared module.** Create `src/pages/coaching/runner/shared.tsx`. Move verbatim:
- Types: `Step`, `Activity`, `Negative`, `ChatMsg`, `Responses`, `Session`, `SelectedSaying`, `SelectedImage`, `LibraryImage`, `SayingRow`, `QaAnswer`, `AssessmentFileType`, `AssessmentUploadRow`.
- Helpers: `buildUserPatch`, `useDebouncedSave`, `imgUrl`, `humanizeBand`, `inferFileType`, `extForFile`.
- Any small internal component used by ≥2 widgets (e.g. multimodal input field, local recording control) — grep first.
Update runner to import from `./runner/shared`. No re-exports of items already in `CoachingViews.tsx`.

**A2 — Heavy/self-contained widgets** → `src/pages/coaching/runner/widgets/<Name>.tsx`:
`PtpDisplayWidget`, `AssessmentUploadWidget`, `IkigaiWidget` (+ `IkigaiItemCard`), `InnerTeamWidget` (+ `InnerTeamCharacterCard`).

**A3 — Selection/media widgets:**
`ImageSelectWidget`, `TextSelectWidget`, `ImageDescribeWidget`, `RecapWidget`.

**A4 — Core/text widgets:**
`TextareaWidget`, `ListBuilderWidget`, `RiskBlocksWidget`, `ChatWidget`, `PrioritizePanel`, `SuggestionPanel`, `ContentWidget`, `QaMultimodalWidget`.

Each batch: move verbatim, named export, import shared from `../shared`, views from `@/components/coaching/CoachingViews`, re-import into runner. Zero logic/JSX/string changes. After A4 the runner is a ~600–900 line orchestration shell.

## Track B — Reactivity fixes (apply only what the profiler implicated)
- **B1** Stabilize handler props with `useCallback`; pass narrow slices of `responses` (e.g. `responses.negatives`) rather than the whole object.
- **B2** Wrap each widget export in `React.memo`.
- **B3** If chrome (step header / progress / briefing) re-renders per keystroke, extract & memoize it.
- **B4** (last resort) Local input state in text widgets, propagate to `responses` on blur/debounce. Highest risk of stale-save bugs.

## Track C — Lazy load (after Track A)
Convert imports of heavy widgets — `PtpDisplayWidget`, `AssessmentUploadWidget`, `IkigaiWidget`, `InnerTeamWidget`, `ImageSelectWidget`, `TextSelectWidget` — to `React.lazy`, wrap widget-dispatch area in a single `<Suspense fallback={<Spinner/>}>`. Light widgets stay as normal imports.

## Label fix (fold into A4 or standalone)
In `RiskBlocksWidget` collect-mode: change `<p>Add a risk</p>` → `<p>{step.addLabel || "Add a risk"}</p>` and add `addLabel?: string` to `Step`. (Already applied in a prior turn — verify still present after A4 move.)

## Recommended order
Stage 0 → A1 → A2 → A3 → A4 (+ label fix) → B1/B2 per profile → C → B3/B4 only if still laggy.

## Deliverable per stage
One prompt, one commit, one guardrail pass. Track A alone yields the biggest Lovable-velocity win and is safe; Track B is strictly evidence-driven.