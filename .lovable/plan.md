# Bundle A1a — Newsletter editorial vocabulary (marks + content-editable nodes)

Scope-capped subset of H2 frontend: 8 marks + 3 nodes whose content is editable directly in the DOM (no NodeViews). Atom nodes (SectionRule/Byline/Masthead), NodeViews, and color picker submenus are deferred to A1b.

## New files (11)

### `src/components/newsletter/tiptap/nodes/`
1. **`Eyebrow.ts`** — `newsletterEyebrow`, block, `content: "inline*"`, defining. Attrs: `variant` ("default"|"accent"|"muted"), `with_rule` (bool, default true). parseHTML: `div.eyebrow`, `p.eyebrow`, `[class~="eyebrow|kicker|category"]`, `[data-newsletter-eyebrow]`. renderHTML: `<p data-newsletter-eyebrow data-variant data-with-rule class="newsletter-eyebrow newsletter-eyebrow--{variant}">0</p>`.
2. **`Lead.ts`** — `newsletterLead`, block, `content: "inline*"`, defining. Attrs: `dropcap` (bool), `style` ("deck"|"lede"|"pullout"). parseHTML: `p.deck`, `p.lede`, `p.lead`, `p.standfirst`, `[class*="lead-paragraph"]`, `[data-newsletter-lead]`. renderHTML: `<p data-newsletter-lead data-style data-dropcap class="newsletter-lead newsletter-lead--{style}">0</p>`.
3. **`Aside.ts`** — `newsletterAside`, block, `content: "block+"`, defining. Attrs: `label` (string|null), `tone` ("default"|"subtle"). parseHTML: `aside:not([data-newsletter-callout])`, `div.aside`, `div.sidebar`, `[class~="by-the-way"]`, `[data-newsletter-aside]`. renderHTML: `<aside data-newsletter-aside data-tone class="newsletter-aside newsletter-aside--{tone}">` with optional `<div class="newsletter-aside__label">{label}</div>` before content hole.

All three follow the JSDoc + `Node.create({...})` pattern from `Callout.ts` / `Pullquote.ts`, with `data-newsletter-*` root attr and BEM classes.

### `src/components/newsletter/tiptap/marks/` (new directory)
Each is a custom `Mark.create()` with module-augmented `Commands<ReturnType>` declaration. No new npm packages.

4. **`SmallCaps.ts`** — `smallCaps`, no attrs. parseHTML `span.small-caps`, `span[data-smallcaps]`. `toggleSmallCaps`.
5. **`Superscript.ts`** — `superscript`, parseHTML `sup`. `toggleSuperscript`.
6. **`Subscript.ts`** — `subscript`, parseHTML `sub`. `toggleSubscript`.
7. **`Underline.ts`** — `underline`, parseHTML `u`, `[style*="text-decoration:underline"]`, `[data-newsletter-underline]` (NOT `.underline` — Tailwind clash). `toggleUnderline`, shortcut Mod-U.
8. **`Highlight.ts`** — `highlight`, attr `color` ("yellow"|"orange"|"forest"|"pink"|"blue", default yellow). parseHTML `mark[data-newsletter-highlight]`, `span.highlight` (NO bare `mark`). `setHighlight`/`unsetHighlight`/`toggleHighlight`.
9. **`Keyboard.ts`** — `keyboard`, parseHTML `kbd`. `toggleKeyboard`.
10. **`Abbr.ts`** — `abbr`, attr `title` (string). parseHTML `abbr[title]`. renderHTML emits title via mergeAttributes. `setAbbr`/`unsetAbbr`.
11. **`Accent.ts`** — `accent`, attrs `color` ("orange"|"forest"|"teal"|"plum"|"mustard"|"navy"), `style` ("plain"|"italic"|"bold-italic"), `weight` ("normal"|"heavy"). parseHTML rules all priority 60 to beat Highlight: `span.accent`, `span[data-accent]`, `mark.accent`, `em.accent`. renderHTML emits class with color + non-default style/weight modifiers. `setAccent`/`unsetAccent`/`toggleAccent`.

## Modified files (6)

1. **`tiptap/nodes/Callout.ts`** — add `priority: 51` to the `aside[data-newsletter-callout]` parseHTML rule (defense in depth vs Aside).
2. **`tiptap/types.ts`** — add `NewsletterEyebrowAttrs`, `NewsletterLeadAttrs`, `NewsletterAsideAttrs`, `HighlightMarkAttrs`, `AccentMarkAttrs`, `AbbrMarkAttrs`. Extend `CustomNewsletterNode` union with 3 new `BaseNode<...>` members.
3. **`tiptap/buildExtensions.ts`** — import 3 nodes + 8 marks; append to extensions array (nodes after `NewsletterKeyMoment`; marks last, order: Accent, SmallCaps, Superscript, Subscript, Underline, Highlight, Keyboard, Abbr).
4. **`tiptap/index.ts`** — re-export 3 new nodes and 8 new marks following existing pattern.
5. **`index.html`** — append `&family=JetBrains+Mono:wght@400;500;700` to existing Google Fonts href.
6. **`styles/marketing-tokens.css`** — append new token block (mono font, mustard #8a6400, editorial label sizing, stripe widths, section rule margins, dropcap, accent color aliases, content width tokens, grid gap tokens) under a `/* Group H newsletter visual vocabulary tokens (Session 96 H2 add) */` comment. Do NOT touch `--container-sm` or `.newsletter-prose`.
7. **`styles/newsletter-prose.css`** — append CSS for `.newsletter-eyebrow` (+ `[data-with-rule="true"]::before` rule, variant modifiers), `.newsletter-lead` (+ style modifiers + dropcap `::first-letter`), `.newsletter-aside` (+ `--subtle`, `__label`, child margin reset), and all 8 mark classes (`.newsletter-smallcaps`, `-superscript`, `-subscript`, `-underline`, `-highlight` + 5 color modifiers, `-keyboard`, `-abbr`, `-accent` + 6 color + style/weight modifiers). All scoped under `.newsletter-prose`.
8. **`components/newsletter/editor/NewsletterSlashMenu.tsx`** — import `Tag`, `AlignLeft`, `MessageSquareMore` icons. Add 3 entries in EDITORIAL section: Eyebrow, Lead paragraph, Aside. Each inserts the node with default attrs; Eyebrow/Lead seed `content: [{type:"text", text:" "}]`; Aside seeds `content: [{type:"paragraph"}]` to satisfy `block+` schema.
9. **`components/newsletter/editor/NewsletterBubbleMenu.tsx`** —
   - Remove the existing "Lead" toggle button (~lines 250-264). Remove `isLeadActive` declaration if unused after removal. Keep `TextStyleWithFontSize` import intact.
   - Add icon imports: `Underline as UnderlineIcon`, `Highlighter`, `Superscript as SuperscriptIcon`, `Subscript as SubscriptIcon`, `CaseSensitive`, `Keyboard as KeyboardIcon`, `BookOpen`, `Palette`.
   - Add 7 mark toggle `<Btn>`s between Strike and Link: Small caps, Superscript, Subscript, Underline (⌘U), Highlight (yellow), Keyboard, Accent (orange/plain/normal). Plus Abbreviation button that opens inline-input submenu.
   - Add `abbrMode`/`abbrTitle` state; reset in the existing `selectionUpdate` handler. Extend the `linkMode ? ... : ...` ternary into a 3-way `linkMode ? ... : abbrMode ? <abbrInputSubmenu/> : <defaultButtonRow/>`. Submenu: text input (Enter applies via `extendMarkRange("abbr").setMark("abbr",{title})`; empty trims to `unsetMark`; Escape cancels) + Apply button.

## Technical notes

- **ParseHTML conflict resolution**: Aside excludes `data-newsletter-callout` via selector AND Callout gets priority 51. Accent gets priority 60 to beat Highlight on `mark.accent`. Highlight scoped to `data-newsletter-highlight` data attr (no bare `mark`). Underline excludes Tailwind's `.underline`.
- **Schema validity**: Aside content `block+` requires Slash insert to seed a paragraph or it fails validation.
- **Mustard contrast**: spec said #7a5800; using #8a6400 to clear AA on cream — already vetted in recon.
- **Content width tokens**: defined but unused this cycle; `.newsletter-prose` width swap is H3.
- **TextStyleWithFontSize**: extension stays registered for lesson-blocks editor; only its bubble-menu surface is removed.
- **Reader**: pulls schema from shared `buildExtensions`, so new nodes/marks render in `NewsletterArticle.tsx` automatically — no reader edits needed.

## Out of scope (A1b or later)

SectionRule / Byline / Masthead, all NodeViews, Highlight & Accent color/style/weight picker submenus, article-level sidebar fields, reader auto-render of new article columns, `convert-html-to-tiptap` edits, `.newsletter-prose` max-width swap.
