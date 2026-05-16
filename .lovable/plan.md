## Session 79 fix — LessonBlockViewer only

Single file: `src/components/learning/viewers/LessonBlockViewer.tsx`. No other files, no backend, no migration.

### Change 1 — re-attempt isolation

`lesson_block_progress` is attempt-scoped via `attempt_number`, but `blockProgressQuery` currently selects all rows for the user + content item. After `start_lesson_reattempt` bumps `attempts_count`, the prior attempt's completed rows re-seed `completedIds` and every block shows complete again.

Edits in `blockProgressQuery`:
- Add `completion?.attempts_count` to the `queryKey`: `["lesson-block-progress", contentItemId, completion?.attempts_count ?? 1]`.
- In `queryFn`, add `.eq("attempt_number", completion?.attempts_count ?? 1)` to the select. Read `completion` from the live closure (it's already in scope from props); no captured/stale value.
- The query already depends on `completion` indirectly via the key; React Query will refetch when the key changes.

Edits in `handleReattempt`:
- After the `reportCompletion("start_lesson_reattempt", …)` call, add:
  `await queryClient.invalidateQueries({ queryKey: ["content-item-viewer", contentItemId] });`
  alongside the existing two invalidations. This forces the chrome's viewer query to refetch so `completion.attempts_count` reflects the bumped value before `blockProgressQuery` re-runs with the new key.
- Keep existing resets: `setCompletedIds(new Set())`, `seededProgressRef.current = false`, `resumedRef.current = false`, and the two existing invalidations (`lesson-blocks`, `lesson-block-progress`).

### Change 2 — scroll-to-bottom floor for both completion modes

Currently:
```ts
const finalContinueEnabled =
  allGatedComplete &&
  (completionMode === "explicit_continue" ? true : scrolledToBottom);
```
An `explicit_continue` lesson with zero `gating_required` blocks would be completable on load.

Edit:
```ts
const finalContinueEnabled = allGatedComplete && scrolledToBottom;
```

Helper text under the Complete button: simplify so the "scroll to end" hint shows in both modes whenever `allGatedComplete && !scrolledToBottom`:
- If `!allGatedComplete`: "Complete the required activities above to finish this lesson."
- Else if `!scrolledToBottom`: "Scroll to the end of the lesson to finish."
- Else: "You've completed every required activity."

No changes to `BlockRenderer`, hooks, chrome, or any other file.
