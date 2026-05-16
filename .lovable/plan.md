## Session 77 — Prompt 2: Trainee-facing Quiz Viewer

### Part A — Chrome change (`src/hooks/useCompletionReporter.ts`)

Backward-compatible: capture `data` from the RPC and surface it.

- Add optional `result?: unknown` to `ReportResult`.
- Change `const { error } = await supabase.rpc(...)` to `const { data, error } = await supabase.rpc(...)`.
- Include `result: data` in the success return alongside `ok`/`cascade`.
- No changes to cascade detection, query invalidation, or existing callers.

### Part B — Quiz Viewer

Files to create:

1. **`src/components/learning/quiz/QuizViewer.tsx`** — top-level viewer mounted by `ContentItemViewer` for `item_type === 'quiz'`.
   - Receives standard `ViewerProps` (`contentItem`, `completion`, `viewerRole`, `reportCompletion`, `isReporting`).
   - React Query fetch of `get_quiz_for_trainee(contentItem.id)`.
   - State machine: `loading → intro → in_progress → submitting → summary` + `error`.
   - Intro variants: zero-questions ("not ready"), fresh (`Start quiz`), prior failed (`Try again — best X%`, `Start attempt N+1`), prior passed (`Retake`, no-downgrade note). Always a "Back to module" link.
   - In-progress: one question per screen, `currentQuestionIndex`, `answers: Record<questionId, AnswerValue>`, `lockedQuestions: Set<questionId>` (only used in `always` mode).
   - Advance: "Save and continue" in all modes; `always` mode has an extra "Submit this question" step that reveals per-question feedback before "Continue".
   - Disable advance until the question has a complete answer.
   - Final submit calls `reportCompletion("submit_quiz_attempt", { p_content_item_id, p_answers })`. Use `res.result.attempt_id` to fetch summary via `get_quiz_attempt_results`.
   - On `!res.ok`: inline submit-error with Retry, keep `answers` intact.
   - Review mode (`viewerRole !== "self"`): render intro/questions read-only, no Start/Submit.
   - Defensive stub for `match_picture`; allow skip, treat as unanswered.

2. **`src/components/learning/quiz/QuestionRendererMultipleChoice.tsx`** — large tappable cards (not radio rows), single-select. Locked-state: green check on correct, red X on wrong pick; no red-tinted backgrounds.

3. **`src/components/learning/quiz/QuestionRendererTrueFalse.tsx`** — two large side-by-side buttons; same locked-state pattern.

4. **`src/components/learning/quiz/QuestionRendererSelectAll.tsx`** — multi-select tappable cards with checkbox affordance; hint line about all-or-nothing scoring; locked-state per-option (missed-correct / wrong-picked) without red backgrounds.

5. **`src/components/learning/quiz/QuestionRendererMatch.tsx`** — two columns, tap-to-pair (no DnD). Tap prompt → highlight; tap answer → pair with colored chip; tap paired side → unpair. Chip palette cycles Navy → Teal → Orange → Purple → Green → Mustard. Pairings tracked as `{ [promptId]: answerId }`. Locked-state shows pair check/X plus correct pairing for wrong pairs.

6. **`src/components/learning/quiz/QuizProgressBar.tsx`** — N dots: empty / Teal-filled / Teal-ring (current); in `always` mode after lock, Green or red filled. "Question N of M" label.

7. **`src/components/learning/quiz/QuizSummaryScreen.tsx`** — receives `submitResult` + `get_quiz_attempt_results` payload.
   - Large score card (`text-6xl font-display`), pass/fail label, threshold, earned/total points.
   - Passed: brand Green tint + checkmark. Failed: brand Sand background, supportive tone, no red.
   - If `reveal_correctness === true`: per-question list with icons, user answer, correct answer, explanation; match pair-by-pair correctness.
   - If `reveal_correctness === false`: mode-keyed subtle line (`never` vs `after_pass`).
   - CTAs: passed → "Continue" (navigates to `/learning/module/{contentItem.module_id}`) + "Back to module" link; not-passed → "Try again" (resets local state, returns to `intro`) + "Back to module".

Shared helpers inside `QuizViewer.tsx`: `mapQuizViewerRpcError`, `AnswerValue`/`QuizQuestion`/`QuizAnswerOption` types, answer-completeness check per question type, assembling `p_answers` jsonb.

### What is explicitly NOT changing

- `ContentItemViewer.tsx` already routes `quiz` to a viewer — verify it imports the new `QuizViewer` from `@/components/learning/quiz/QuizViewer` (currently routes to `PlaceholderViewer` for `quiz`); wire it up.
- No changes to cascade modal (chrome owns it), no Next-item navigation from the viewer, no direct `supabase.rpc("submit_quiz_attempt")` calls.
- Backend RPCs untouched.

### Verification

Walk the 15-step checklist against quiz `0e365d0e-81e6-4d28-a0fe-ccd749714a9d` (Test Module C) as `testclientbwe+employee@gmail.com`, including the `always`-mode toggle and zero-question case.
