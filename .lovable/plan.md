## Cycle G4-B: Newsletter authoring pages

Two new super-admin pages + a small extension to `FileUploadField` + route registrations. No backend changes — all 15 RPCs and the v5 upload Edge Function already accept the newsletter article scope.

### Files

**Modify**
1. `src/components/super-admin/FileUploadField.tsx` — add optional `newsletterArticleId?: string | null` prop. Forward as `newsletter_article_id` in the `request-asset-upload` body for both `startUpload` and `handleReplaceUpload`. Add a reason-fallback branch: `Asset upload for ${refField ?? "field"} on newsletter_article ${newsletterArticleId}`. No other behavioral changes; existing callers unaffected.
2. `src/App.tsx` — import `AdminNewsletter` and `AdminNewsletterArticle`; register the two routes inside the protected `AppLayout` block with `RoleGuard(["brainwise_super_admin"])` + `SuperAdminSessionProvider`.

**Create**
3. `src/pages/super-admin/AdminNewsletter.tsx` — list page at `/super-admin/newsletter`.
4. `src/pages/super-admin/AdminNewsletterArticle.tsx` — detail/editor page at `/super-admin/newsletter/:articleId` (`"new"` = create).

I will also extract a few small co-located helpers inside `AdminNewsletterArticle.tsx` to keep the file manageable (status pill, transition dialog, schedule dialog, author picker, slug row, auto-save hook). If any single one grows past ~150 lines I'll split it into a sibling file under `src/components/newsletter/admin/`; I'll flag in the response if I do.

### List page shape

- Header: H1 "Newsletter" font-display 3xl navy, subtitle slate-500, right "New article" CTA → `/super-admin/newsletter/new`.
- Sticky controls bar: search (250ms debounce, magnifier icon), status Select (default "All non-archived"), gate Select (default "Any gate"), right-aligned "X articles" count.
- shadcn Table: Title (+ slug muted below), Status badge, Gate badge, Authors avatar stack, Updated relative (date-fns), kebab (Open / Copy slug / Archive-with-confirm).
- Row click → detail page.
- Loading = 5-row Skeleton. Empty-ever vs filtered-empty differentiated.
- Pagination Prev/Next, `limit=20`, URL synced via `?page=N&status=&gate=&q=`.
- React Query key `["newsletter-articles", { status, gate, search, page }]` → `supabase.rpc("list_admin_newsletter_articles", ...)`.
- Status badge palette exactly as specified (slate/teal/emerald/amber/slate-dark).

### Detail page shape

- Sticky header (white, border-b): ← Back link · title input inline · right cluster (auto-save pill, status pill dropdown, Preview button stub).
- Body two-column lg+ (editor 70% / sidebar 30%), stacked below lg.
- Editor column:
  - Cover image FileUploadField (refField=`cover`, min-h-[280px] wrapper, label "Cover image").
  - Title input: large font-display 700 36px navy, borderless, placeholder "Untitled article", autoFocus on create.
  - Slug row: `brainwiseenterprises.com/newsletter/<slug>` — click-to-edit inline swap. Auto-derive from title only while slug is empty OR equals the previous derivation; once user edits manually, lock derivation for the article's session.
  - Excerpt textarea with live char count + min-20 warning when gated.
  - `<NewsletterEditor articleId={realArticleId} initialContent={bodyTiptap} onChange={setBodyTiptap} />`.
- Sidebar tabs (Settings / SEO):
  - Settings: Visibility RadioGroup (public/subscribers/plan_tier) with Checkbox stack for tiers when plan_tier; Authors multi-picker (query `users` where `account_type='brainwise_super_admin'`, chips with remove); Schedule card (visible only when draft|unpublished) opening a Calendar+time+reason Dialog; OG image FileUploadField (refField=`og_image`, 160px tall).
  - SEO: seo_title, seo_description, canonical_url.
- Status pill dropdown — state-aware actions exactly as specified per current status. Each opens an AlertDialog with a required reason input (min 10 chars validated client-side before enabling Confirm). Calls the right RPC, then invalidates `["newsletter-article", id]` and `["newsletter-articles"]`, sonner toast on success/error.

### Auto-save

Single `useAutoSave` hook inside the file:
- Watches a `draft` object containing every editable field.
- On change → status="unsaved", clear timer, schedule 2000ms.
- On flush → status="saving", call `upsert_article` with ALL current fields (decision: use `upsert_article` exclusively, not `auto_save_article` — `upsert_article` is the only RPC that covers slug/gate/cover/og/authors; the spec explicitly endorses this) with reason `"Auto-save: editor pause"`.
- On success → status="saved" + timestamp. On error → toast + status="unsaved".
- Force-flush triggers: `visibilitychange` (hidden), unmount cleanup, and a `flushNow()` exposed for state-transition handlers to call before opening their dialog.
- `p_reason` requirement (min 10): "Auto-save: editor pause" = 24 chars ✓.

### Create mode (`articleId === "new"`)

- No RPC calls until first user edit.
- First auto-save calls `upsert_article(p_article_id: null, …)`, receives `article_id`, then `navigate('/super-admin/newsletter/${article_id}', { replace: true })`.
- Cover/OG `FileUploadField` is disabled (with tooltip "Save the draft first to enable image uploads") until we have a real article id, because uploads need `newsletter_article_id`. Same constraint surfaces inside the editor — `<NewsletterEditor>` receives `articleId={null}` in create mode, and the toolbar/slash-menu image entries are already wired by G4-A to show "Save the draft first" notices; if they aren't, I'll add a thin `articleId == null → disabled` guard at this page's level by passing a sentinel and a wrapping `<TooltipProvider>` notice. (Flagging in response if G4-A's editor doesn't already handle null `articleId`.)
- Defaults exactly as spec: gate=`public`, allowed_plan_tiers=`[]`, source_type=`native`, authors=`[currentUserId]`, body=`{type:"doc",content:[{type:"paragraph"}]}`.

### Preview button

Stub: `onClick={() => window.open(`/newsletter/${slug}`, "_blank")}` if slug exists, else disabled with tooltip "Set a slug to preview". Will 404 until G6, which is acceptable for dev.

### Sidebar nav

Search `AppSidebar.tsx` for the super-admin section and add a "Newsletter" entry with `Newspaper` icon pointing to `/super-admin/newsletter`. If the structure isn't an obvious add (e.g. it's data-driven from a config I can't fully understand from one read), I'll leave a `TODO(nav)` comment in `AdminNewsletter.tsx` instead of guessing — per spec.

### Out of scope (not building)

Paste-HTML modal, version-history UI, public reader, real preview, tests, backend changes, broader nav redesign.

### Open risks / will flag in response

- Whether G4-A's `NewsletterEditor` already gracefully handles `articleId == null` in create mode (toolbar/slash image entry). If not, I'll add a minimal disabled-state wrapper at the page level.
- Whether `upsert_article`'s `p_reason` is enforced on auto-save (spec says min 10; my reason string is 24 chars, fine).
- Whether `list_admin_newsletter_articles` returns `authors` already shaped for avatar display, or if I need a second query. I'll inspect the RPC return shape on first run and adapt — if it's missing, I'll join `users` in the page via a secondary query keyed off the page's id set.
