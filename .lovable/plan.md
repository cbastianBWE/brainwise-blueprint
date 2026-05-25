# H3-NV-Final + H3-NV-Auto — Article-level fields wiring

Pure frontend wiring. No backend, no migrations, no new deps. Two files modified.

## File 1: `src/pages/super-admin/AdminNewsletterArticle.tsx`

**Draft state (Draft interface, ~L80):** add 7 fields:
- `eyebrow_text: string | null`
- `is_issue_based: boolean`
- `issue_label: string | null`
- `masthead_publication: string | null`
- `masthead_logo_glyph: string | null`
- `default_layout_width: "standard" | "wide" | "narrow"`
- `theme_variant: "default" | "editorial" | "minimal" | "technical"`

**Load `.select(...)` (~L146):** append the 7 columns.

**Load → state hydration (~L155, ~L204):** map all 7 fields from row, using DB defaults for NOT NULL columns (`?? "standard"`, `?? "default"`, `?? false`).

**Empty-draft seed (~L178):** `eyebrow_text: null`, `is_issue_based: false`, `issue_label: null`, `masthead_publication: null`, `masthead_logo_glyph: null`, `default_layout_width: "standard"`, `theme_variant: "default"`.

**upsert_article call (L284–291):** replace the 7 hardcoded `null as unknown as ...` lines with real draft values (per spec snippet). Keep the existing `p_tags` and `p_category_id` lines intact.

**Sidebar Card "Issue metadata"** (insert after Category & tags card ~L712): Eyebrow text input, Masthead publication input, Masthead logo glyph input, `is_issue_based` checkbox, conditional issue label input. Exact JSX per spec §1f.

**Sidebar Card "Layout & theme"** (immediately after): two native `<select>` controls for layout width + theme variant with helper text. Exact JSX per spec §1g.

## File 2: `src/pages/marketing/NewsletterArticle.tsx`

**GrantedArticle interface (~L33):** add the 7 fields as optional/nullable.

**Add top-level helper `buildReaderDoc(body, article, authors, publishedLabel, tags)`** per spec §2b — clones body content, conditionally prepends `newsletterMasthead` + `newsletterEyebrow`, conditionally appends `newsletterFooterMeta` + `newsletterAuthorBio`. Bounded suppression: only inspect first 2 / last 2 node types to avoid duplicating author-inserted instances.

**Wire into `useEditor`** (~L436): replace `content:` with `buildReaderDoc(article.body_tiptap, article, authors, null, null)`. Pass `null` for publishedLabel/tags (not in scope to fetch).

**Reader wrapper div** (~L483): add `data-theme-variant={article.theme_variant ?? "default"}` and `data-layout-width={article.default_layout_width ?? "standard"}`. No CSS this cycle.

**useEditor deps:** extend to `[article.id, extensions, article.eyebrow_text, article.is_issue_based, article.issue_label, article.masthead_publication, article.masthead_logo_glyph, authors.length, authors[0]?.user_id]`.

## Out of scope
- No CSS for theme/width data attrs
- No editor-preview auto-render
- No new node IDs for synthetic nodes
- No fetching extra data for publishedLabel/tags
- Don't touch Category & tags card

## Verification
- `npx tsc -b --noEmit` exits 0
- 7 fields appear/persist/rehydrate in admin sidebar
- `is_issue_based` toggle reveals issue label input
- Reader shows auto-rendered Masthead/Eyebrow at top + FooterMeta/AuthorBio at bottom when conditions met
- Suppression: manually-inserted Masthead in first 2 nodes prevents auto-Masthead
- Wrapper div carries both data-* attrs

## Expected delta
2 files modified, 0 new files. ~120 LOC admin, ~80 LOC reader.
