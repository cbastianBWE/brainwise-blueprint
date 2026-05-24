
# Cycle G6 — Public newsletter reader (revised)

Public-facing newsletter pages on the marketing site. All backend RPCs (`list_articles_for_archive`, `get_article_for_reader`, `subscribe_to_newsletter`, `confirm_newsletter_subscription`, `unsubscribe_from_newsletter`) are live. Marketing pages use inline styles + CSS vars (matching `Podcast.tsx`), not Tailwind utilities. Reader uses `.newsletter-prose` from G4-0 and two lightweight reader-only NodeViews for runtime URL resolution.

## Files to create (9)

1. **`src/components/marketing/newsletter/SubscribeForm.tsx`**
   - Props: `source: string`, `variant?: "inline" | "banner" | "footer"`, `onSubscribed?: () => void`.
   - Email input + Submit + Turnstile widget container.
   - Module-level `loadTurnstile(): Promise<void>` injects `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` once per app (idempotent). On mount, await it, then `window.turnstile.render(divRef, { sitekey: '0x4AAAAAADVBROvQ5jLUUIxJ', callback: setToken })`. Guard StrictMode double-render with a ref.
   - Submit → `supabase.rpc('subscribe_to_newsletter', { p_email, p_turnstile_token, p_source })`. Disable while pending. Success → swap UI for "Check your inbox to confirm." Failure → sonner toast + `window.turnstile.reset(widgetId)`.
   - Three visual variants via inline styles (`inline` cream card / `banner` full-width navy→orange / `footer` compact dark).

2. **`src/components/marketing/newsletter/NewsletterArticleCard.tsx`**
   - Card for archive grid + "More from the newsletter". Cover via `useNewsletterImageUrl`, title (font-display navy), 2-line clamp excerpt, eyebrow with author + relative date + read-time (granted) or "Subscribers only" / "Plan tier required" pill (paywall). Whole card a `<Link>` with hover lift.

3. **`src/components/marketing/newsletter/PaywallCard.tsx`**
   - Cream-bg card. Lock icon, headline, subtitle, primary CTA (Subscribe → expands inline `SubscribeForm` / Upgrade → `/pricing`), secondary "Already subscribed? Sign in" → `/login?redirect=/newsletter/${slug}`.

4. **`src/components/marketing/newsletter/reader-nodeviews/ImageReaderNodeView.tsx`**
   - `NodeViewWrapper` as `<figure>` with `width` class from attrs. Resolves `asset_id` via `useNewsletterImageUrl`. Skeleton while loading; `<img alt={attrs.alt} loading="lazy">` + `<figcaption>{attrs.caption}</figcaption>` when caption present. No editing affordances.

5. **`src/components/marketing/newsletter/reader-nodeviews/EmbedReaderNodeView.tsx`**
   - `NodeViewWrapper`. Calls `buildEmbedSrc(provider, embed_id, url)` (exported from G4-0 schema module — will verify import path during build). If returned src non-empty: `<iframe src ... allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin">` with provider-appropriate aspect ratio. Else: muted "Invalid embed" placeholder. Optional `<figcaption>` for `attrs.title`.

6. **`src/pages/marketing/Newsletter.tsx`** (archive at `/newsletter`)
   - `MarketingNav` + hero (navy bg, `Eyebrow` "Field notes", H1, subtitle, inline `SubscribeForm source="archive_hero"`).
   - Filter chips: All / Public / Subscribers / Plan tier → `p_gate_filter`. Pagination state (limit 12).
   - React Query `["newsletter-archive", gate, page]` → `list_articles_for_archive`. Featured = first item rendered larger; rest 3-col responsive grid of `NewsletterArticleCard`.
   - 6-card skeleton loading, warm empty state with embedded SubscribeForm, Prev / page X of Y / Next.
   - `MarketingFooter`.
   - Meta + JSON-LD `Blog` via small inline `setPageMeta` helper (no new deps).

7. **`src/pages/marketing/NewsletterArticle.tsx`** (reader at `/newsletter/:slug`)
   - `useParams<{slug}>`, React Query `["newsletter-article", slug]` → `get_article_for_reader`.
   - **Branches**:
     - `not_found` → Nav + centered "Article not found" + "Back to newsletter" + Footer.
     - `paywall` → Nav + hero (cover, eyebrow with `authors_lite` + `published_at`, title, excerpt) + `<PaywallCard>` + Footer. **No body.**
     - `granted` → Nav + hero (full-bleed cover above title, eyebrow authors + date + read time, title font-display 800) + body in `.newsletter-prose` container (max-w 720, centered) rendering `<EditorContent>`. Author byline footer. Cream "Subscribe" CTA section with `SubscribeForm source="article_footer"`. "More from the newsletter" — separate React Query for 4 recent articles, filter current id, take 3, render via `NewsletterArticleCard` grid. Footer.
   - **Extension wiring** (per addendum):
     ```ts
     const extensions = useMemo(() => {
       const base = buildExtensions({ editable: false });
       return base.map(ext => {
         if (ext.name === "newsletterImage") return ext.extend({ addNodeView: () => ReactNodeViewRenderer(ImageReaderNodeView) });
         if (ext.name === "newsletterEmbed") return ext.extend({ addNodeView: () => ReactNodeViewRenderer(EmbedReaderNodeView) });
         return ext;
       });
     }, []);
     const editor = useEditor({ extensions, content: article.body_tiptap, editable: false }, [extensions, article.body_tiptap]);
     ```
   - Defensive `null`-check `body_tiptap` before mounting the editor.
   - Per-page meta (title/description/og:*/twitter/JSON-LD `BlogPosting`) via `setPageMeta`. `og:image` resolved from `og_image_asset_id` (fallback `cover_asset_id`).

8. **`src/pages/marketing/NewsletterConfirm.tsx`** (`/newsletter/confirm/:token`)
   - On mount call `confirm_newsletter_subscription`. States: loading / success ("You're confirmed!" + CTA `/newsletter`) / error ("Link invalid or expired"). Nav + centered card + Footer.

9. **`src/pages/marketing/NewsletterUnsubscribe.tsx`** (`/newsletter/unsubscribe/:token`)
   - On mount call `unsubscribe_from_newsletter`. States: loading / success ("Unsubscribed" + small "Changed your mind?" inline `SubscribeForm source="resubscribe_from_unsubscribe"`) / error. Nav + Footer.

## Files to modify (3)

10. **`src/components/marketing/MarketingFooter.tsx`**
    - Insert full-width subscribe banner row above the wordmark/tagline row. Darker navy bg + `border-bottom: 1px solid rgba(255,255,255,0.1)`, 48px (24px mobile) padding, left-aligned "Join the newsletter" heading + 1-line subtitle + `<SubscribeForm variant="footer" source="footer_banner" />` (stacks on mobile).
    - Add `<Link to="/newsletter">Newsletter</Link>` above Podcast in the Explore column.

11. **`src/components/marketing/MarketingNav.tsx`**
    - Insert `{ label: "Newsletter", to: "/newsletter" }` into `navLinks` between Podcast and Contact.

12. **`src/App.tsx`**
    - Import the four new pages. Add four public routes (NOT under `ProtectedRoute`), ordered specific → generic with an inline comment explaining why:
      ```
      <Route path="/newsletter" element={<Newsletter />} />
      <Route path="/newsletter/confirm/:token" element={<NewsletterConfirm />} />
      <Route path="/newsletter/unsubscribe/:token" element={<NewsletterUnsubscribe />} />
      <Route path="/newsletter/:slug" element={<NewsletterArticle />} />
      ```

## Architectural decisions

- **Turnstile script lifecycle**: one module-level idempotent loader promise; injected only when a SubscribeForm mounts. Explicit `window.turnstile.render` + StrictMode-safe ref guard + `reset()` after failed submit.
- **Reader NodeViews** (per addendum): only `newsletterImage` and `newsletterEmbed` get overrides — all other custom nodes have static `renderHTML` from G4-0 and render correctly via the schema's default serialization. Pattern mirrors G4-A (`.extend({ addNodeView })`), keeping G4-0 headless and unmodified.
- **Route ordering**: confirm/unsubscribe precede `:slug` so they don't get swallowed as slugs. Documented with a code comment.
- **Meta tags**: inline `setPageMeta` helper (upsert by `name`/`property`, cleanup on unmount). No new dep (`react-helmet-async` not currently in tree).
- **OG-image SSR caveat**: client-side `og:image` injection won't help LinkedIn/Slack crawlers. Still useful for Twitter and JS-executing crawlers (Google). Will surface honestly in the response.
- **Paywall security**: RPC never returns `body_tiptap` for paywall items; the reader also defensively null-checks before mounting the editor.

## Risks / open questions

- Exact export path for `buildEmbedSrc` — assumed `@/components/newsletter/tiptap` (alongside `buildExtensions`). Will adapt during build.
- Whether `Podcast.tsx` already defines a meta-tag helper to copy. Will reuse if present, otherwise inline a 30-line `setPageMeta`.
- Turnstile widget interaction with React StrictMode double-mount — guarded with a ref.

## Out of scope

SSR meta (G3), RSS (G9), comments, email dispatch (G8), related-by-tag, author bios, preview-as-viewer.
