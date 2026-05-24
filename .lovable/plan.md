
# Cycle G5 — Version history + diff viewer

Build the version history UI for the newsletter article detail page. All backend RPCs (`list_article_versions`, `get_article_version`, `commit_article_version`, `restore_article_version`) already exist.

## Files to create

1. **`src/components/newsletter/versions/types.ts`** — local TS types: `VersionType`, `VersionListItem`, `VersionFull`, `CurrentDraft`. Mirrors RPC return shapes.

2. **`src/components/newsletter/versions/tipTapDocToPlainText.ts`** — recursive walker. Block separator `\n\n`. Text nodes contribute `text`. Custom nodes serialized as semantic tokens:
   - `newsletterImage` → `[image: {alt}] {caption}`
   - `newsletterEmbed` → `[embed: {provider} — {title || url}]`
   - `newsletterStatCallout` → `[stat: {value} — {label}]`
   - `newsletterCallout` → `[{variant}{: title}]` then children
   - `newsletterPullquote`, `newsletterKeyMoments`, `newsletterKeyMoment`, `newsletterTwoColumn[Pane]` recurse into children with appropriate prefix labels
   - Kept inline in the diff panel file per spec; extracted to its own file because I want to unit-friendly-test it later.

3. **`src/components/newsletter/versions/SaveSnapshotDialog.tsx`** — shadcn `Dialog` with name (1–80) + reason (≥10) inputs. Save calls `commit_article_version`. Toast + `onSaved()`.

4. **`src/components/newsletter/versions/RestoreVersionDialog.tsx`** — shadcn `Dialog`. Version preview card, default-ON checkbox "Save current draft as a named revision first" with conditional name input (default `Pre-restore checkpoint — {now}`), reason textarea (≥10). On confirm: optional `commit_article_version` first (abort on failure), then `restore_article_version`. Toast + `onRestored()`.

5. **`src/components/newsletter/versions/VersionDiffPanel.tsx`** — right pane. Loads selected version via `get_article_version` (React Query, key `["newsletter-article-version", versionId]`). Header strip (name/type badge/v#, Restore button). Sticky amber caveat banner. Inline `diffWords` of title, excerpt, and `tipTapDocToPlainText(body)` for both sides. Added → `bg-emerald-50 text-emerald-900`; removed → `bg-rose-50 text-rose-900 line-through`. Diff body rendered inside `.newsletter-prose`. Empty state when all chunks equal. Skeleton while loading. Opens `RestoreVersionDialog` on Restore click.

6. **`src/components/newsletter/versions/VersionHistorySheet.tsx`** — default export. shadcn `Sheet` (side="right"). Width mechanic: apply a custom `className` on `SheetContent` that conditionally toggles `sm:max-w-[400px]` vs `sm:max-w-[960px]` (the default `w-3/4` is overridden by `!w-[400px]` / `!w-[960px]` with a `transition-[width,max-width] duration-200 ease-[var(--ease-standard)]`). When no version selected → narrow; selected → wide with split panes.
   - `onOpenChange` wrapper: when transitioning to `true`, first `await onBeforeOpen()` (shows a brief spinner state on the trigger via parent), then sets internal `open`.
   - Versions fetched with React Query `["newsletter-article-versions", articleId]` → `list_article_versions`.
   - Header: "Version history" + subtitle `{total} versions saved · {published count} published landmarks` + "Save snapshot" button (opens `SaveSnapshotDialog`).
   - Left pane (320px, ScrollArea): grouping algorithm:
     1. Sort all items desc by `created_at`.
     2. Group by day: `isToday` → "Today", `isYesterday` → "Yesterday", else `format(d, 'PPPP')`. Headers: font-display uppercase 11px tracking-widest text-slate-400.
     3. Within day, walk sorted items and collapse consecutive `draft` items into a single disclosure row "{N} draft auto-saves". Landmarks rendered as full cards.
   - Type badge palette per spec.
   - Selected row: 4px left border `--bw-orange`, `bg-orange-50/30`. Arrow-up/down keyboard nav within visible (non-collapsed) rows; Enter selects.
   - Empty state, capped footer, 6-row Skeleton while loading.
   - Right pane: `<VersionDiffPanel />` when selectedVersionId; otherwise centered "Select a version to compare".

## Files to modify

7. **`src/pages/super-admin/AdminNewsletterArticle.tsx`**
   - Add `History` icon import.
   - Add `versionHistoryOpen` state + `versionHistoryOpening` (button spinner) state.
   - Add ghost "Version history" button in header next to Preview. Disabled when `articleId === "new"` with Tooltip "Save the draft first".
   - `handleOpenVersionHistory`: set opening true → `await flushNow()` (already exists in `useAutoSave`) → set opening false → open sheet.
   - Mount `<VersionHistorySheet>` at page bottom. Pass `articleId`, `currentDraft: { body_tiptap: draft.body_tiptap, title: draft.title, excerpt: draft.excerpt }`, `onBeforeOpen: flushNow`, `onRestored`: invalidate `["newsletter-article", articleId]` query and reset local `draft` from the refetched article (re-using existing hydration path).

8. **`package.json`** — add `"diff": "^7.0.0"` and `"@types/diff": "^7.0.0"` (devDependencies). Pin: `diff@7.0.0`.

## Architectural decisions

- **Sheet width mechanic**: rather than two separate Sheets or a portal, single Sheet whose `SheetContent` width animates between 400px and 960px via Tailwind transition on `max-width`/`width` with `!important` overrides. Diff panel mounted in DOM only when a version is selected, so no wasted RPC.
- **Flush-before-open**: trigger button owns the spinner; Sheet's `onOpenChange(true)` is gated behind `await onBeforeOpen()`. If flush rejects, toast error and don't open.
- **`tipTapDocToPlainText`**: extracted into its own file (not inline). Custom newsletter nodes emit bracketed semantic tokens so word-diff still surfaces meaningful structural changes (e.g., a swapped image alt or stat value) without being a real structural diff. Caveat banner covers everything else.
- **Restore checkpoint**: pre-restore snapshot uses fixed reason `"Pre-restore checkpoint"` (12 chars, passes ≥10 validation). User's typed reason is forwarded to `restore_article_version` only.
- **Grouping within a day**: collapse only *consecutive* drafts between landmarks, matching the spec's example layout. A landmark interrupts the run.

## Risks / open questions

- `list_article_versions` shape assumed exactly as documented; if `items` array is named differently (e.g. `versions`), adapt the destructure in one place.
- `useAutoSave` is assumed to expose `flushNow(): Promise<void>` (built in G4-B). If it's synchronous or named differently, will adapt.
- Whether `--bw-orange` / `--bw-plum` CSS vars exist in `index.css`. If not, fall back to Tailwind `orange-500` / `violet-700` classes.

## Out of scope

Side-by-side diff, structural-aware diff, load-more pagination, prune UI, two-version compare, preview-as-viewer, public reader, paste-HTML modal.
