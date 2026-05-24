# Bundle A1b-1 — SectionRule + Masthead + Bubble Menu Pickers

Implements the spec exactly. Byline is deferred to A1b-2.

## New files (4)

1. **`src/components/newsletter/tiptap/nodes/SectionRule.ts`** — Atom node, `parseHTML` covers `hr.section-rule`/`hr[data-numbered]`/`hr.dot-divider` (all priority 60) + `div.section-rule`/`div.section-break`/`[data-newsletter-section-rule]` fallbacks. **No bare `hr` selector** so StarterKit HorizontalRule still handles plain `<hr>`. `renderHTML` emits a `<div data-newsletter-section-rule>` wrapper with style-specific children (rule/number/title/dots).

2. **`src/components/newsletter/tiptap/nodes/Masthead.ts`** — Atom node with `publication`, `issue_label`, `date_label`, `logo_glyph` attrs. Renders `<header data-newsletter-masthead>` with glyph / publication / issue / date spans separated by middots.

3. **`src/components/newsletter/tiptap/nodeviews/SectionRuleNodeView.tsx`** (~120 LOC) — Follows StatCalloutNodeView pattern: `NodeViewWrapper` div, trash + drag-handle affordances, 300ms-debounced commits, `selected` ring. Style picker pills (Numbered/Plain/Titled/Dot), conditional number/title text inputs, live preview block below.

4. **`src/components/newsletter/tiptap/nodeviews/MastheadNodeView.tsx`** (~90 LOC) — `NodeViewWrapper` header, trash + drag handles, single row with native `<select>` for glyph (immediate commit) + 3 debounced text inputs (publication, issue, date). Empty strings commit as `null` for optional fields.

## Modified files (7)

5. **`src/components/newsletter/tiptap/types.ts`** — Add `NewsletterSectionRuleStyle` type alias, `NewsletterSectionRuleAttrs`, `NewsletterMastheadAttrs` interfaces. Add 2 new `BaseNode` members to `CustomNewsletterNode` union. (No Byline yet.)

6. **`src/components/newsletter/tiptap/buildExtensions.ts`** — Import + append `NewsletterSectionRule`, `NewsletterMasthead` to array after `NewsletterAside`.

7. **`src/components/newsletter/tiptap/index.ts`** — Re-export the 2 new nodes.

8. **`src/components/newsletter/editor/NewsletterEditor.tsx`** — Import 2 new nodes + 2 NodeView components; add `NodeSectionRuleEdit` and `NodeMastheadEdit` via `.extend({ addNodeView })`; append both to `EDITABLE_NODE_OVERRIDES`. `OVERRIDE_NAMES` derives automatically.

9. **`src/components/newsletter/editor/NewsletterSlashMenu.tsx`** — Import `SeparatorHorizontal`, `BookMarked` icons; add `section-rule` (BASIC) and `masthead` (LAYOUT) slash items inserting atoms with default attrs.

10. **`src/components/newsletter/editor/NewsletterBubbleMenu.tsx`** — Largest edit:
    - **(A) Mode refactor**: replace 4 `useState` calls (linkMode/linkUrl/abbrMode/abbrTitle) with single discriminated union `Mode = default | link | abbr | accent | highlight`. Hoist `AccentColor/AccentStyle/AccentWeight/HighlightColor` type aliases above component. Reset handler now `setMode({ kind: "default" })`. Replace all `linkMode/abbrMode` branches with `switch (mode.kind)`, guarding field access with discriminants.
    - **(B) Escape handler**: useEffect that registers `keydown` while `mode.kind !== "default"`, resets on Escape.
    - **(C) `blockedParents`**: add `newsletterSectionRule`, `newsletterByline`, `newsletterMasthead`.
    - **(D) Accent picker**: replace Accent button onClick with `setMode({ kind: "accent", ...editor.getAttributes("accent") })`; render 3 rows (color swatches, style pills, weight pills) + Apply/Remove/Cancel.
    - **(E) Highlight picker**: replace Highlight button onClick with `setMode({ kind: "highlight", color: ... })`; render single color row, click-to-apply, with Remove/Cancel.

11. **`src/styles/newsletter-prose.css`** — Append SectionRule (`.newsletter-section-rule` + `__rule`/`__number`/`__title`/`__dot` + variant modifiers) and Masthead (`.newsletter-masthead` + `__glyph`/`__publication`/`__issue`/`__date`/`__separator`) CSS blocks, scoped under `.newsletter-prose`.

## Out of scope (do not touch)

- Byline node + NodeView (A1b-2)
- Reader NodeViews — renderHTML is sufficient (no async resolution)
- `convert-html-to-tiptap` Edge Function
- `AdminNewsletterArticle.tsx`
- Bare `hr` parseHTML on SectionRule
- New `@tiptap/extension-*` packages

## Verification

Type-check clean; editor mounts; slash items insert atoms; NodeViews edit + commit; bubble menu Link/Abbr behavior unchanged after refactor; Escape closes submenus; Accent/Highlight pickers apply marks correctly.
