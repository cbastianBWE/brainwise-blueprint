# G4-0: Shared TipTap extensions module + newsletter-prose.css

Note: You're in plan mode. Approving this plan switches to build mode and I'll execute the spec verbatim. The spec itself is fully locked — this plan is just the implementation checklist.

## Scope (locked by prompt)

Schema + styling foundation only. No editor UI, no toolbar, no NodeViews, no pages, no routes, no backend changes. Three downstream cycles (G4-A authoring, G6 reader, `convert_html_to_tiptap`) consume this module.

## Files to create (11)

```text
src/components/newsletter/tiptap/
  types.ts                       NewsletterTipTapDoc/Node unions, CalloutVariant, EmbedProvider, per-node attrs
  buildExtensions.ts             Factory returning Extension[]; StarterKit (heading levels 2-4 only) + Link + Placeholder + TextStyleWithFontSize + 7 custom nodes
  index.ts                       Barrel export
  nodes/
    Image.ts                     newsletterImage; atom block; attrs {asset_id, alt, caption, width}; renderHTML emits <figure data-newsletter-image data-asset-id> with empty src (resolved at runtime per §133)
    Callout.ts                   newsletterCallout; block+ content; attrs {variant, title?}; 5 variants info/warning/quote/tldr/key_takeaway
    StatCallout.ts               newsletterStatCallout; atom; attrs {value, label, source?}
    Embed.ts                     newsletterEmbed; atom; attrs {provider, embed_id, url, title?}; exports buildEmbedSrc() helper with youtube-nocookie / spotify / vimeo / generic (https-only via isSafeHttpUrl)
    Pullquote.ts                 newsletterPullquote; inline*; attrs {attribution?}
    TwoColumn.ts                 Exports NewsletterTwoColumn (content: 'newsletterTwoColumnPane newsletterTwoColumnPane') AND NewsletterTwoColumnPane (not in 'block' group so it's only valid inside parent)
    KeyMoments.ts                Exports NewsletterKeyMoments (content: 'newsletterKeyMoment+', attrs {title?}) AND NewsletterKeyMoment (not in 'block' group, inline* content, attrs {title})

src/styles/newsletter-prose.css  All selectors scoped under .newsletter-prose; uses marketing-tokens.css vars; NOT imported globally
```

## Implementation notes

- `renderHTML` is the canonical render path for both editor fallback and read-only reader. No NodeViews in this cycle.
- Image `src` and Embed iframe `src` are intentionally empty in `renderHTML` — runtime layer (G4-A/G6) resolves them. This enforces §133 (asset_id canonical) and prevents XSS on embeds.
- `buildEmbedSrc('generic', ...)` validates `url` via `isSafeHttpUrl` AND requires https; returns `''` on rejection.
- StarterKit: disable built-in heading, re-enable with `levels: [2, 3, 4]` (H1 reserved for article title field).
- `buildExtensions({ editable })`: editable flag accepted but unused in v1 (same array for both modes); kept in signature for G6 to specialize later.
- Reuse existing `TextStyleWithFontSize` from `src/components/super-admin/lesson-blocks/`.
- Reuse `isSafeHttpUrl` from `@/lib/safeUrl` for Link validation and generic embed validation.

## Deps

All required TipTap packages are already installed per the prompt. Will verify against `package.json` and add only if missing (none expected). G4-A-only deps (bubble-menu, suggestion, tippy) explicitly NOT added.

## CSS

`newsletter-prose.css` written per the detailed spec in the prompt — typography scale, body prose, and per-node BEM-style classes (`.newsletter-image`, `.newsletter-callout--{variant}`, `.newsletter-stat-callout__value`, etc.) all scoped under `.newsletter-prose`. Mobile: two-column collapses to single column at ≤768px. Pullquote uses `::before` decorative left-quote in `--bw-orange-100` (background decoration only — not a CTA, doesn't violate the orange-for-UI rule).

## Verification

After build: confirm 11 files exist, barrel exports resolve, `buildEmbedSrc` returns expected values for the two acceptance test cases, all CSS selectors prefixed with `.newsletter-prose`, no editor/page/route files touched. TypeScript check runs automatically.

## Site-wide impact

Zero. Nothing imports this module yet. `newsletter-prose.css` is not imported globally — only pages that opt in by wrapping content in `.newsletter-prose` will pick it up (none exist yet). No changes to routing, auth, existing editors, or any current page.
