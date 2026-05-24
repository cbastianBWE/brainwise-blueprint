## Bundle A2a-1 — StepList + Checklist composite nodes (APPROVED)

Two new parent+child node pairs for the newsletter editor, following the TwoColumn / KeyMoments composite pattern. One React NodeView for ChecklistItem (clickable checkbox), wired via the existing `EDITABLE_NODE_OVERRIDES` registry in `NewsletterEditor.tsx` so the schema modules stay headless.

### Files to create

1. `src/components/newsletter/tiptap/nodes/StepList.ts` — exports `NewsletterStepList` and `NewsletterStep`. Headless, no React. Parent parseHTML at priority 60.
2. `src/components/newsletter/tiptap/nodes/Checklist.ts` — exports `NewsletterChecklist` and `NewsletterChecklistItem`. **Headless — no React imports, no `addNodeView()`.** Parent parseHTML at priority 60. ChecklistItem has `checked` attr with parse/render round-trip via `data-checked`.
3. `src/components/newsletter/tiptap/nodeviews/ChecklistItemNodeView.tsx` — React NodeView using `NodeViewWrapper` + `NodeViewContent`. Clickable checkbox toggles `checked` via `updateAttributes`.

### Files to edit

4. `types.ts` — add `NewsletterStepListAttrs`, `NewsletterChecklistItemAttrs`; extend `CustomNewsletterNode` union with four new variants.
5. `buildExtensions.ts` — import + register the four new nodes.
6. `index.ts` — re-export the four new nodes.
7. `NewsletterEditor.tsx` — exactly three edits:
   - Import `ChecklistItemNodeView`.
   - Define `NodeChecklistItemEdit = NewsletterChecklistItem.extend({ addNodeView() { return ReactNodeViewRenderer(ChecklistItemNodeView); } })`.
   - Append `NodeChecklistItemEdit` to `EDITABLE_NODE_OVERRIDES`.
8. `NewsletterSlashMenu.tsx` — add `CheckSquare` icon import; append `step-list` and `checklist` LAYOUT items after `key-moments`.
9. `newsletter-prose.css` — append `Bundle A2a-1` block with rules for StepList (grid + counter + conditional connector) and Checklist (reader path with `--checked` modifier + NodeView checkbox styles).

### Acceptance
- `tsc --noEmit` clean.
- No new npm packages.
- A1a/A1b shipped files untouched beyond the additive union/array edits.
