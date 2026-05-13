# Session 70 — Scenario block (frontend only)

Add a new linear-narrative `scenario` block type to the lesson block editor. Backend already supports it end-to-end. Five files: four edits, one new.

## Files

### 1. EDIT `src/components/super-admin/lesson-blocks/blockTypeMeta.ts`
- Add `GitBranch` to the `lucide-react` import block.
- Append `| "scenario"` to the `BlockType` union (after `card_sort`).
- Insert a `scenario` entry in `BLOCK_TYPE_META` after `card_sort` with: `label: "Scenario"`, `icon: GitBranch`, and `defaultConfig` seeding `title: null`, `intro_markdown: null`, one moment (`prompt_type: "multiple_choice"`, 2 empty choices, empty `setup_markdown` doc), `gating_required: false`, `background_color: null`, `padding: "none"`.
- Append `"scenario"` to `IN_SCOPE_BLOCK_TYPES`.

### 2. NEW `src/components/super-admin/lesson-blocks/block-forms/ScenarioBlockForm.tsx`
Authoring form. Two nested `DndContext`s (moments outer, choices inner) with namespaced sortable IDs (`moment:<client_id>`, `choice:<client_id>`).

- Block-level: `title` Input (≤120 chars, null when empty), `intro_markdown` compact `RichTextEditor` (null when empty via `tipTapHasContent` check).
- Moments list (1–12): drag handle, header with index, prompt_type icon, completion badge ("Complete" Forest #2D6A4F + `CheckCircle2` when `isMomentComplete`, otherwise muted "Needs setup" + `Circle`). Add disables at 12, Remove disables at 1.
- Per moment: `moment_label` Input (≤80 chars, null when empty), `setup_image_asset_id` via `FileUploadField` with `refField={\`scenario.moments.${moment.client_id}.setup_image_asset_id\`}`, `setup_markdown` compact RTE, `prompt_type` `RadioGroup`.
- **Destroy-warn on prompt_type switch**: if inactive side has content (any choice with non-empty `choice_text` or non-empty `outcome_markdown`; OR non-empty `reflection_prompt`/`outcome_markdown`), call `window.confirm()`. On cancel, abort. On accept (or no content), seed defaults for new side and null out the old side.
- MC mode: `SortableContext` for choices (2–4). Each: `choice_text` Input (≤200) + `outcome_markdown` compact RTE.
- Reflection mode: `reflection_prompt` Textarea (≤300, with `(N/300)` counter) + `outcome_markdown` compact RTE.
- Bottom: `gating_required` Checkbox.

### 3. EDIT `src/components/super-admin/lesson-blocks/BlockEditorPane.tsx`
- Import `ScenarioBlockForm` after the `CardSortBlockForm` import.
- Add dispatch for `block_type === "scenario"` after the `card_sort` dispatch and before `<BlockStyleSection />`, passing `value`, `onConfigChange`, `contentItemId`.

### 4. EDIT `src/components/super-admin/lesson-blocks/BlockRenderer.tsx`
- Add imports: `Dialog`, `DialogContent`, `DialogFooter`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`; `Textarea` from `@/components/ui/textarea`. (dnd-kit imports already present from Session 69.)
- In the `renderInner` switch, add `case "scenario":` returning `<ScenarioRender ... />` after the `card_sort` case.
- Append new `ScenarioRender` component at end of file with types `ScenarioChoiceConfig`, `ScenarioMomentConfig`, `ScenarioPersistedState`.

`ScenarioRender` behavior:
- State: `cursorIdx`, `reflectionResponses` (`Record<momentId,string>`), `choiceSelected` (`Record<momentId,choiceId>`), `modalOutcome`, `modalOpen`, `continueBtnRef`.
- sessionStorage key `scenario-pos:${blockClientId}`. Hydrate ONLY in `mode === "trainee"`; reconcile: drop any momentId not in current moments, clamp `cursorIdx` to `[0, moments.length]`. Persist on state change in trainee mode.
- Editor mode: reset state when joined moment-client_id list changes.
- Render block title (h3), intro `ReadOnlyTipTap`, progress text ("Moment N of M" or "Scenario complete · N moments").
- Current moment: optional `moment_label`, optional setup `<img>` from `urlMap.get(setup_image_asset_id)`, setup `ReadOnlyTipTap`, prompt area.
- MC: vertical full-width `<button>` per choice → opens modal with that choice's `outcome_markdown`.
- Reflection: pull-quote prompt, Textarea (`maxLength={REFLECTION_MAX_CHARS=2000}`), Submit button orange (#F5741A), disabled until non-whitespace; opens modal with moment's top-level `outcome_markdown`.
- End state (`cursorIdx >= moments.length`): "You've finished the scenario." + "Replay scenario" link that resets state and clears sessionStorage in trainee mode.
- Outcome `Dialog`: `onPointerDownOutside`/`onInteractOutside` preventDefault. Footer Continue button (orange) is autofocused via `setTimeout(30)` after open. `onOpenChange(open)` routes any close path through `handleContinue` → close + advance cursor. Esc dismisses via Radix default.
- Reflection responses NOT written to DB (state + sessionStorage only).

### 5. EDIT `src/components/super-admin/lesson-blocks/lesson-blocks.css`
Append `/* === Session 70: scenario === */` section at end of file with classes: `.bw-scenario-shell`, `.bw-scenario-title`, `.bw-scenario-intro`, `.bw-scenario-progress`, `.bw-scenario-moment`, `.bw-scenario-moment-label`, `.bw-scenario-setup-image`, `.bw-scenario-setup`, `.bw-scenario-choices`, `.bw-scenario-choice` (hover orange border + tint, focus-visible orange outline), `.bw-scenario-choice-untitled`, `.bw-scenario-reflection`, `.bw-scenario-reflection-prompt` (Sand bg + orange left-border), `.bw-scenario-reflection-textarea`, `.bw-scenario-reflection-meta`, `.bw-scenario-done`, `.bw-scenario-done-reset`, `.bw-scenario-modal-body`. Mobile `@media (max-width: 640px)`: shrink title to 1.25rem, reduce moment padding, setup image max-height 12rem.

## Out of scope
Branching, per-moment colors, DB persistence of reflection responses, scoring, skip/back controls, custom key handlers (rely on Radix autofocus + native Enter).

## Verification after implement
Build passes; insert/save/refresh round-trip preserves all client_ids, prompt_type, choices/reflection content, image refs, and labels; trainee flow advances through moments via modal Continue; sessionStorage hydrates and reconciles correctly.
