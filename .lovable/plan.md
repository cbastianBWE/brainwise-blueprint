
# Cycle G4-A — Newsletter authoring editor primitive

Build the reusable `NewsletterEditor` component and all sub-primitives per spec. No page, no save wiring, no backend changes. One small G4-0 patch bundled.

## Scope

Component-only deliverable. Consumers (G4-B page) will mount `<NewsletterEditor articleId initialContent onChange />`. Everything inside that surface — toolbar, NodeViews, bubble menu, slash menu, floating "+" — lives in this cycle.

## File list (13 new + 1 patch)

**G4-0 patch**
- `src/components/newsletter/tiptap/nodes/Image.ts` — add `import_failed_src: string|null` attr; serialize to `data-import-failed-src` in renderHTML; parse back in parseHTML. No other changes.

**NodeViews** — `src/components/newsletter/tiptap/nodeviews/`
- `ImageNodeView.tsx` — resolves `asset_id` → public URL via `content_asset_versions` join; broken-state card when `import_failed_src` set; inline editable caption + alt; width pill (inline/wide/full_bleed); upload via `request-asset-upload` → `finalize-asset-upload`.
- `CalloutNodeView.tsx` — `NodeViewContent` body; variant dropdown (5 variants); editable title row.
- `StatCalloutNodeView.tsx` — atom; controlled inputs for value/label/source with 300ms debounced attr commits.
- `EmbedNodeView.tsx` — configured vs unconfigured states; URL→provider parser (YouTube/Vimeo/Spotify/generic) mirroring Edge Function `walkIframe`; iframe src via `buildEmbedSrc`; edit dialog.
- `PullquoteNodeView.tsx` — `NodeViewContent` quote body + attribution input.
- `TwoColumnNodeView.tsx` + `TwoColumnPaneNodeView.tsx` — CSS grid 1fr 1fr; per-pane focus ring; empty-pane "Type / for blocks" placeholder.
- `KeyMomentsNodeView.tsx` + `KeyMomentNodeView.tsx` — timeline container + "Add moment" + per-moment title/body NodeViewContent.

**Editor shell** — `src/components/newsletter/editor/`
- `NewsletterToolbar.tsx` — sticky top toolbar (heading select, marks, lists, link popover, image upload, divider, slash hint). Mobile wraps to two rows.
- `NewsletterBubbleMenu.tsx` — extension factory using `@tiptap/extension-bubble-menu` v3 API; Bold/Italic/Strike/Code/Link/H2/H3/Lead.
- `NewsletterSlashMenu.tsx` — `@tiptap/suggestion` + tippy.js; 16 commands across BASIC/EDITORIAL/MEDIA/LAYOUT; arrow/Enter/Esc keyboard nav; fade-in zoom-95 animation.
- `NewsletterFloatingPlus.tsx` — listens to selection updates; uses `view.coordsAtPos` for positioning; throttled ~50ms; click opens slash menu at cursor.
- `NewsletterEditor.tsx` — composes everything; exports `NewsletterEditorContext` so NodeViews access `articleId`; wires NodeViews via `addNodeView` on each custom node extension (cleaner than per-editor `nodeViews` map and keeps Image/Callout/etc. encapsulated).

## Technical decisions

- **NodeView wiring**: extend each G4-0 node with `.extend({ addNodeView() { return ReactNodeViewRenderer(X) } })` inside the editor module (don't mutate G4-0 source). This keeps the shared schema usable by the read-only reader (G6) without dragging React NodeViews into it.
- **Asset URL resolution**: small hook `useNewsletterImageUrl(asset_id)` querying `content_asset_versions` for the current version's storage path, then `supabase.storage.from('newsletter-article-images').getPublicUrl(path)`. Cached per asset_id in a module-level `Map` to avoid refetching across NodeView remounts.
- **Floating +**: absolute-positioned overlay inside the editor wrapper (relative parent). Uses `editor.on('selectionUpdate' | 'transaction')` with rAF throttle. Hidden unless current node is an empty top-level paragraph.
- **BubbleMenu v3**: use `BubbleMenu.configure({ element, shouldShow })` extension, not the deprecated `<BubbleMenu>` React child. Render the menu DOM in a portal sibling and pass its ref as `element`.
- **Suggestion v3**: standard `Suggestion({ char: '/', items, render })` with a tippy-backed render lifecycle (onStart/onUpdate/onKeyDown/onExit). Filtering done in `items({query})`.
- **Embed URL parser**: shared `parseEmbedUrl(url)` helper colocated in `EmbedNodeView.tsx`; covers `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`, `vimeo.com/<digits>`, `open.spotify.com/<kind>/<id>` and `/embed/<kind>/<id>`.
- **Animations**: Tailwind `transition-*` + `animate-in fade-in zoom-in-95 duration-150`. No framer-motion.

## Deps to add

```
@tiptap/extension-bubble-menu  ^3.x (match existing TipTap version)
@tiptap/suggestion             ^3.x
tippy.js                       ^6.3.7
```

Will pin to whatever resolves consistent with the existing `@tiptap/*` minor in package.json at install time.

## Out of scope (explicitly NOT this cycle)

Editor page, save/publish/schedule, article list, cover/og_image fields, paste-HTML modal, version history UI, reader, backend, tests.

## Verification

- TS compiles clean.
- `NewsletterEditor` mounts without runtime errors when given an empty doc `{type:'doc',content:[{type:'paragraph'}]}`.
- Manual smoke against article `26fcbaef-fb10-4ab5-aaf6-798e31a2e2f5` for image upload path (deferred to G4-B mount; verified by code inspection here).
- Slash menu shows 16 commands in 4 groups; each inserts the correct node.
- Bubble menu appears on text selection with all 8 controls.
- Each NodeView renders with selection ring, hover handles, and inline editors as specified.

## Site impact

Zero until G4-B mounts this on a route. Existing `RichTextEditor` (lesson blocks) untouched. G4-0 `Image.ts` patch is additive (new optional attr default null) — no schema break for existing/empty docs.
