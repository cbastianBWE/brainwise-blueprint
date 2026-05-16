# Session 79 — Paged-section progression for LessonBlockViewer (revised)

Single-file rewrite of orchestration in `src/components/learning/viewers/LessonBlockViewer.tsx`. No other files, no backend, no migration. Block rendering, DB writes, progress hooks, and BlockRenderer usage all stay as-is.

## Sectioning

Compute `sections` via `useMemo(() => …, [blocks])`:

- Walk `blocks` in `display_order`.
- A `button_stack` block whose `(config.buttons ?? []).some(b => b.action_type === "continue")` is a **structural delimiter**: close the current section with `continueBlockId = block.id`, then start a fresh accumulator. **Do not** push that block into any section's `blocks` array — it is consumed, not rendered.
- A `button_stack` block with no continue button (e.g. link-out or jump buttons) is normal content and goes into the current section.
- After the loop, push the trailing accumulator with `continueBlockId: null` (final section).
- Zero continue-button blocks → one section containing all blocks, `continueBlockId: null`. Existing empty-lesson path stays.

Result type: `Array<{ blocks: LessonBlockRow[]; continueBlockId: string | null }>`.

Also build `blockIdToSectionIdx: Map<string, number>` in the same memo, populated only from blocks that survive into a section (delimiter blocks excluded — they aren't TOC targets).

## Paged display

- `const [currentSectionIdx, setCurrentSectionIdx] = useState(0);`
- Render only `sections[currentSectionIdx].blocks`. Existing per-block `setBlockRef` / `BlockRenderer` / `savedProgress` wiring stays. Remove the existing per-block `showPerBlockContinue` mini-button — the section's own viewer Continue replaces it.
- Section footer row:
  - Non-final: `[Previous?] [Continue]`. Continue is brand-orange, never gated; calls `goNext()`. Previous shown when `currentSectionIdx > 0`, calls `goPrev()`.
  - Final: existing `Complete lesson` button gated by `finalContinueEnabled`, plus `[Previous]` when `currentSectionIdx > 0`. Helper-text block renders only here.
- `goNext` / `goPrev` update `currentSectionIdx` then scroll the lesson body to the top (`scrollAreaRef.current?.scrollIntoView({ block: "start" })`).
- Mobile: use existing `flex-col sm:flex-row` pattern so Continue/Previous stack on small screens.

## Gating — visited-all-sections, not scroll-to-bottom

Remove `scrolledToBottom` entirely (state + scroll-effect branch that sets it).

- `const [visitedSections, setVisitedSections] = useState<Set<number>>(new Set([0]));`
- `useEffect(() => { setVisitedSections(prev => prev.has(currentSectionIdx) ? prev : new Set(prev).add(currentSectionIdx)); }, [currentSectionIdx]);`
- `const allSectionsVisited = visitedSections.size === sections.length;`
- `allGatedComplete` unchanged (every `gating_required` interactive block across the whole lesson is in `completedIds`).
- **New gate:** `finalContinueEnabled = allGatedComplete && allSectionsVisited;`
- Per-section Continue is never gated.

Helper text (final section only):
- `!allGatedComplete` → "Complete the required activities above to finish this lesson."
- else `!allSectionsVisited` → "Visit every section of the lesson to finish."
- else → "You've completed every section."

## "More below" hint

Unchanged scroll effect drives `showMoreHint` from per-section `atBottom`. It is a hint only — not a gate.

## TOC (open, Model B)

- Keep markup (sidebar + mobile sheet), checkmarks, Required pills, active highlight.
- `scrollToBlock(id)`: look up `sectionIdx = blockIdToSectionIdx.get(id)`; if it differs from `currentSectionIdx`, `setCurrentSectionIdx(sectionIdx)`; then in `requestAnimationFrame` call `blockRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "start" })`. Close mobile drawer as today.
- No section is locked; every entry is clickable. Delimiter blocks aren't in the TOC because they're not in any section.

## Active-block tracking

Existing topmost-in-view effect iterates `sections[currentSectionIdx].blocks` (only those have refs). Add `currentSectionIdx` to deps.

## Furthest-position write — monotonic

- `const furthestSectionRef = useRef(0);`
- In the same `useEffect` keyed on `currentSectionIdx` that updates `visitedSections`, also do `if (currentSectionIdx > furthestSectionRef.current) furthestSectionRef.current = currentSectionIdx;`.
- The debounced `reportProgress("upsert_lesson_progress", { p_furthest_continue_client_id: activeBlockId, p_last_block_id: activeBlockId })` effect now early-returns when `currentSectionIdx < furthestSectionRef.current`. Going back via Previous or a backward TOC jump writes nothing; forward motion writes as before.

## Resume

Replace the current `resumedRef` effect:

```text
once blocks & sections ready and !resumedRef.current:
  targetId = completion?.lesson_last_block_id
  if targetId and blockIdToSectionIdx.has(targetId):
    idx = blockIdToSectionIdx.get(targetId)
    setCurrentSectionIdx(idx)
    furthestSectionRef.current = idx   // resume counts as furthest reached
    rAF → blockRefs.current.get(targetId)?.scrollIntoView({ block: "start" })
  resumedRef.current = true
```

(The visited-sections effect will pick up the new index automatically and add it to the set.)

## Re-attempt

`handleReattempt` resets, alongside existing resets (`completedIds`, `seededProgressRef`, `resumedRef`, query invalidations):

- `setCurrentSectionIdx(0)`
- `setVisitedSections(new Set([0]))`
- `furthestSectionRef.current = 0`

## Unchanged (explicit)

`blockProgressQuery` (attempt_number filter, queryKey), `savedProgressByBlockId`, `seededProgressRef` → `completedIds` seeding, `handleBlockComplete` (in-memory set + `reportProgress("upsert_lesson_block_progress", …)`), `useLessonBlockAssets`, `BlockRenderer` props (`mode="trainee"`, `onBlockComplete`, `savedProgress`), cascade via `reportCompletion("complete_lesson", …)`, loading/error/empty states, `INTERACTIVE_TYPES`, `gatingRequiredBlockIds`.

## Mobile QA

Verify at 375 / 414 / 768: Continue/Previous footer layout, TOC drawer jump → section switch → scroll-into-view, sticky "more below" chevron per section, final-section helper text + Complete button gating.
