## Session 79 — lesson_blocks trainee viewer

Frontend-only. Four files. Backend RPCs and the `get-lesson-block-asset-urls` Edge Function are live and untouched.

### File 1 (new) — `src/hooks/useLessonBlockAssets.ts`
Trainee asset resolver (SCORM/API export seam). Signature `useLessonBlockAssets(contentItemId?: string)`.
- React Query: key `["lesson-block-assets", contentItemId]`, `enabled: !!contentItemId`, `staleTime: 50 * 60 * 1000`.
- `supabase.functions.invoke("get-lesson-block-asset-urls", { body: { p_content_item_id: contentItemId } })`.
- Build `urlMap: Map<asset_id, signed_url>`, skipping null urls.
- Returns `{ urlMap, isLoading }`. Never touches `supabase.storage` or `getPublicUrl`.

### File 2 (modify) — `src/hooks/useCompletionReporter.ts`
Add `reportProgress(rpcName, rpcArgs)` next to existing `reportCompletion`:
- Calls `supabase.rpc(rpcName, rpcArgs)` only.
- No `invalidateQueries`, no cascade mapping, no `isReporting` flip (fires many times/lesson).
- Returns `{ ok, error?, result? }`.
- Hook returns `{ reportCompletion, reportProgress, isReporting }`. `reportCompletion` unchanged.

### File 3 (new) — `src/components/learning/viewers/LessonBlockViewer.tsx`
Props from chrome: `{ contentItem, completion, viewerRole, reportCompletion, reportProgress, isReporting, onCascade }`.

**Data**
- React Query `["lesson-blocks", contentItem.id]`: `supabase.from("lesson_blocks").select("id, block_type, display_order, config").eq("content_item_id", contentItem.id).is("archived_at", null).order("display_order")`.
- `useLessonBlockAssets(contentItem.id)` for `urlMap`.
- Loading spinner until both resolve; friendly error card on failure.

**Rendering — identical to authoring**
- Import shared `lesson-blocks.css` and `blockTypeMeta.ts` from `src/components/super-admin/lesson-blocks/` (do not fork).
- Copy verbatim from `BlockRenderer.tsx` the renderers for all 18 block types: `text, heading, divider, image, video_embed, quote, list, callout, embed_audio, stat_callout, statement_a_b, accordion, tabs, button_stack, flashcards, card_sort, scenario, knowledge_check`, plus sub-components and helpers (`MatchTrainee`, `RankingTrainee`, `TimelineTrainee`, `CardSortDraggableCard`, `CardSortDroppable`, `emptyKCState`, `stableShuffle`, `getFlashcardTextColorForBg`, `getCardSortTextColorForBg`).
- Pass `mode="trainee"`. Suppress all editor affordances (hover toolbars, drag handles, edit-in-place, add-block buttons).
- `button_stack` `action_type:"continue"` scroll/advance behavior preserved.
- Knowledge-check correctness stays client-side from config (by design).

**Changes to the 4 interactive renderers** (`knowledge_check`, `flashcards`, `card_sort`, `scenario`):
1. Add `onBlockComplete: (blockClientId: string) => void` prop.
2. Replace sessionStorage hydrate/persist with `reportProgress("upsert_lesson_block_progress", { p_block_id, p_status: "completed", p_completion_data: <renderer state> })` fired once on the block-complete transition. Keep in-memory React state for live interaction; remove sessionStorage entirely.

Block-complete signal per renderer:
- `flashcards`, `card_sort`, `scenario`: existing `allDone` flag — fire `onBlockComplete` + `reportProgress` once when it transitions `false → true` (via `useEffect`).
- `knowledge_check`: **do NOT use `allCorrect`** (that requires a perfect score and would gate the lesson on it). Instead:
  - Add `attempted: boolean` to `KCPerQuestionState` (default `false`).
  - In `handleCheck`, set `attempted = true` (in addition to existing behavior).
  - Define `allAttempted = questions.every(q => stateById[q.client_id]?.attempted === true)`.
  - Fire `onBlockComplete` + `reportProgress` once when `allAttempted` transitions `false → true`.
  - `allCorrect` stays untouched — it continues to drive existing per-question reveal/feedback behavior. Only the block-level completion signal changes.

**Trainee orchestration**
- `Continue` button: always visible, prominent, `var(--bw-orange)`, never buried.
- Per-block Continue surfaces after each gated interactive block completes.
- Gating: read each interactive block's `config.gating_required`. Final Continue enable rule depends on `contentItem.lesson_completion_mode`:
  - `explicit_continue`: enabled once every `gating_required` block has fired `onBlockComplete`.
  - `scroll_and_checks`: same, plus scroll position reached bottom of lesson content.
- Final Continue → `reportCompletion("complete_lesson", { p_content_item_id })`. Chrome's wrapper triggers the celebration modal — no local modal.
- Furthest-position tracking: debounced `reportProgress("upsert_lesson_progress", { p_content_item_id, p_furthest_continue_client_id, p_last_block_id })` as trainee advances.
- Resume: on mount, if `completion?.lesson_last_block_id`, scroll that block into view.
- Re-attempt: if `completion?.status === "completed"`, show "Start again" → `reportCompletion("start_lesson_reattempt", { p_content_item_id })` then refetch.

**Sidebar TOC**
- Lists every block using `blockTypeMeta` icon/label.
- Click jumps to block; checkmark on completed; Required/Optional pill per block (Required = `gating_required: true`).
- Open by default on desktop; hamburger drawer below desktop breakpoint.

**"More content below" affordance**
- Local to the lesson scroll area: down chevron + bottom fade gradient when content extends past viewport, hidden at bottom. Independent of the chrome's page-level version.

**Hard rule**: only `useLessonBlockAssets`, `reportCompletion`, `reportProgress`. No direct `supabase.storage`, `createSignedUrl`, or progress/completion `supabase.rpc`.

**Mobile**: verified at 375 / 414 / 768; sidebar collapses to drawer below desktop breakpoint.

### File 4 (modify) — `src/pages/learning/ContentItemViewer.tsx`
- Import `LessonBlockViewer`.
- Destructure `reportProgress` from `useCompletionReporter()`; add it to the `props` object passed to viewers.
- Add `case "lesson_blocks": return <LessonBlockViewer {...props} />;` in `renderViewer()`.
- No changes to cascade modal, breadcrumb, header, or Prev/Next footer.

### Out of scope
No backend, RPC, Edge Function, SQL, migration, or chrome behavior changes.
