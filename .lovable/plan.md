# H5 Cycle 2 — Composite import-fallback rules

## Recon results (all confirmed before planning)

- **Content expressions**: verified verbatim against all 10 composite files. Match the spec table exactly.
- **GFM TaskList extension**: NOT loaded. `grep -rniE "TaskList|TaskItem|task-list|@tiptap/extension-task" src/components/newsletter/ package.json` returns nothing. `ul.task-list` / `ul.checklist` selectors are free for our use.
- **Selector collisions**: no other extension claims `<details>`, `ul.task-list`, `ul.checklist`, `ol.references`, `ol.citations`, or `section.citations` / `section.references`. The only existing rules on these tags are the canonical `data-newsletter-*`-scoped ones inside Citations.ts and Disclosure.ts themselves.
- **Citations canonical `contentElement`**: uses `[data-newsletter-citations-list]` sentinel which external markup will not have — the fallback needs its own `contentElement` that finds the inner `<ol>` or `<ul>`. Confirmed.

## Answers to open questions

**Q7 (Checklist checkbox requirement)**: Do NOT require an `<input type="checkbox">` to exist. Class-marked `ul.task-list` / `ul.checklist` items without an explicit checkbox should still match and default `checked: false`. Rationale: many external sources (Notion exports, Ghost) mark task lists by class but render checkboxes via CSS pseudo-elements. Requiring the input would silently drop those lists. The `getAttrs` reads the checkbox state when present, falls back to `false` otherwise — matches the spec's stated default.

Re the `<input>` element leaking into the parsed inline content: ProseMirror's default text/inline parser ignores `<input>` (no matching node/mark rule and it's a void element with no text). No `contentElement` filtering needed — verified by the existing `inline*` parse path. If smoke shows a stray artifact we add `contentElement: (el) => { const c = el.cloneNode(true) as HTMLElement; c.querySelectorAll("input").forEach(i => i.remove()); return c; }` as a follow-up.

**Q8 (Citations contentElement strategy)**: Keep separate rules for the `<section>` wrapper case vs the bare `<ol>` case. The `section.citations` / `section.references` rules use `contentElement: (el) => el.querySelector("ol, ul") || el` to descend into the list. The `ol.citations` / `ol.references` rules omit `contentElement` entirely — when the matched element IS the list, ProseMirror walks its children directly, which is what we want. Mixing them into a single rule with a conditional `contentElement` works but is harder to reason about; two pairs of rules mirrors the canonical pattern already in the file.

## Files modified (3)

### `src/components/newsletter/tiptap/nodes/Checklist.ts`
- Add to `NewsletterChecklist.parseHTML()` after canonical rule: `ul.task-list`, `ul.checklist`, `ul[class~="todo"]` — all `priority: 51`, no `getAttrs`.
- Add to `NewsletterChecklistItem.parseHTML()` after canonical rule: `ul.task-list > li` and `ul.checklist > li` — `priority: 51`, `getAttrs` reads `input[type="checkbox"]` checked state, defaults `false`. Per Q7, does NOT gate on checkbox presence.

### `src/components/newsletter/tiptap/nodes/Citations.ts`
- Add helper `citationsParentFallbackAttrs(el)` after `clampStyle` — returns `{ style: "numbered", title: first h1-h6 textContent }`.
- Add helper `citationEntryFallbackAttrs(el)` — returns `{ link: first <a>'s href ?? null }`.
- Add to `NewsletterCitations.parseHTML()` after canonical rules: `section.citations`, `section.references` (both with `getAttrs` + `contentElement` descending to first `<ol>` or `<ul>`), plus `ol.citations`, `ol.references` (no `contentElement`, fixed numbered/null attrs). All `priority: 51`.
- Add to `NewsletterCitationEntry.parseHTML()` after canonical rule: `section.citations li`, `section.references li`, `ol.citations > li`, `ol.references > li` — all `priority: 51`, `getAttrs` via `citationEntryFallbackAttrs`. Accept asymmetric round-trip (anchor stays inline in body instead of being rendered as separate `↗` link).

### `src/components/newsletter/tiptap/nodes/Disclosure.ts`
- Add to `NewsletterDisclosure.parseHTML()` after canonical rule: `details` (no class qualifier — native HTML5 semantic) — `priority: 51`, `getAttrs` reads `open` attribute into `default_open`.
- Add to `NewsletterDisclosureSummary.parseHTML()` after canonical rule: `details > summary` — `priority: 51`, no `getAttrs`.

## Files comment-only (7) — parent node's `parseHTML()` only

Single-line doc comment immediately above the `parseHTML() {` of the parent node:

| File | Comment |
|---|---|
| DomainGrid.ts | `// §151 (H5 Cycle 2): no import-fallback rule. content: "newsletterDomainRow+" is a BrainWise-specific pattern with no plausible external equivalent. External markup cannot satisfy the schema's content expression and ProseMirror's content coercion would drop the wrapper silently.` |
| FourColumn.ts | `// §151 (H5 Cycle 2): no import-fallback rule. Exact-count content "newsletterFourColumnPane newsletterFourColumnPane newsletterFourColumnPane newsletterFourColumnPane" is impossible to satisfy from arbitrary external <div> markup. ProseMirror's content coercion would drop the wrapper silently.` |
| IndexRow.ts | `// §151 (H5 Cycle 2): no import-fallback rule. content: "newsletterIndexCard+" is a BrainWise-specific glossary pattern with no plausible external equivalent. External markup cannot satisfy the schema's content expression and ProseMirror's content coercion would drop the wrapper silently.` |
| KeyMoments.ts | `// §151 (H5 Cycle 2): no import-fallback rule. content: "newsletterKeyMoment+" is a BrainWise-specific timeline pattern with no reliable external structural equivalent. External markup cannot satisfy the schema's content expression and ProseMirror's content coercion would drop the wrapper silently.` |
| StepList.ts | `// §151 (H5 Cycle 2): no import-fallback rule. Parent "newsletterStep+" plus child "heading block*" requirement (heading-first) creates a two-layer coercion failure. External markup cannot satisfy the schema's content expression and ProseMirror's content coercion would drop the wrapper silently.` |
| ThreeColumn.ts | `// §151 (H5 Cycle 2): no import-fallback rule. Exact-count content "newsletterThreeColumnPane newsletterThreeColumnPane newsletterThreeColumnPane" is impossible to satisfy from arbitrary external <div> markup. ProseMirror's content coercion would drop the wrapper silently.` |
| TwoColumn.ts | `// §151 (H5 Cycle 2): no import-fallback rule. Exact-count content "newsletterTwoColumnPane newsletterTwoColumnPane" is impossible to satisfy from arbitrary external <div> markup. ProseMirror's content coercion would drop the wrapper silently.` |

## Out of scope

- No changes to `addAttributes`, `renderHTML`, schema content expressions, or canonical parseHTML rules (priority 60).
- No package additions, schema migrations, or build-config changes.
- No edits to ImportHtmlModal, buildExtensions.ts, or composite child nodes other than the three shipping cases above.

## Verification

- `tsc -b --noEmit` clean.
- Spot-check each modified file: canonical rules unchanged, new rules appended at end of array with explicit `priority: 51`, helpers placed before `Node.create` calls.
