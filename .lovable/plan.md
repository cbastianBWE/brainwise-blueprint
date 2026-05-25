# H2-FE-Pass 8 — Poll Node

Spec is fully locked. Plan mirrors it exactly; no architectural deviations.

## New files (3)

1. **`src/components/newsletter/tiptap/nodes/Poll.ts`**
   Atom block node `newsletterPoll`, single attr `poll_id: string | null`, scoped `div[data-newsletter-poll]` parse with priority 60, renders with `class="newsletter-poll"` + `data-poll-id` when set.

2. **`src/components/newsletter/tiptap/nodeviews/PollNodeView.tsx`** (named export)
   - Read `articleId` from `useNewsletterEditorContext()`. Empty → "Save the article first…" placeholder (SubscribeBlock cream/dashed aesthetic), early return.
   - Stable `nodeIdRef = useRef(crypto.randomUUID())`.
   - **Path A** (`poll_id` null): local state seeded (empty question, 2 blank options w/ UUID ids, style=buttons, votesVisible=true, isLocked=false). "Create poll" button gated on `question.trim()` + ≥2 non-empty labels. Calls `create_poll` with `p_reason` ≥10 chars; on success `updateAttributes({ poll_id })`.
   - **Path B** (`poll_id` set): on mount, direct table reads — `newsletter_polls` row (`.eq("id", poll_id).maybeSingle()`) + `newsletter_poll_votes` head-count by `poll_id`. Hydrate local state. If `voteCount>0` lock option label/+/− inputs and show "Options locked — N vote(s) cast" badge. Question stays editable. Debounced 600ms `update_poll` on edits. Handle 22023 ("Cannot modify poll options after votes exist") with toast + revert.
   - Layout: pill bar (Poll badge, buttons/bars toggle, "Show vote counts" toggle, "Lock voting" toggle, delete), auto-resize question textarea, options list (drag indicator placeholder only, label input, × disabled when length===2; + Add disabled when length≥6), Path-A primary CTA / Path-B "Saving…" indicator. Use design tokens; chrome matches CTA/SubscribeBlock NodeViews.
   - Cast PostgREST reads via `as unknown as T`.

3. **`src/components/marketing/newsletter/reader-nodeviews/PollReaderNodeView.tsx`** (default export)
   - `useQuery(["newsletter-poll-results", poll_id], get_poll_results)` gated by `!!poll_id`. Two-step cast result.
   - Loading → 3-line skeleton. `found===false` or null `poll_id` → render nothing.
   - Render `.newsletter-poll[data-style][data-locked]` with `.newsletter-poll__question`, `.newsletter-poll__options`, per-option `<button class="newsletter-poll__option">` (bars variant gets absolute `.newsletter-poll__bar-fill` underlay sized from `results[id]/total_votes`).
   - Reveal counts only when `votes_visible && total_votes>0 && (user_vote || is_locked)`.
   - Vote click: disabled if `user_vote || is_locked || !found`. Call `vote_on_poll`. 42501 → local `showSigninCta=true` rendering `.newsletter-poll__signin-cta` linking `/login?next=${pathname}`. 23505 → silent `refetch()`. Success → `refetch()`. Other → toast.
   - Voted button gets `data-voted="true"`. Footer `.newsletter-poll__total` only when `votes_visible && total_votes>0`.

## Modified files (8)

4. **`buildExtensions.ts`** — import `NewsletterPoll`; register in array after `NewsletterSubscribeBlock`, before `NewsletterDisclosure`.
5. **`tiptap/index.ts`** — re-export `NewsletterPoll` after `NewsletterSubscribeBlock` export.
6. **`tiptap/types.ts`** — add `NewsletterPollAttrs { poll_id: string | null }` near other attrs; add `| BaseNode<"newsletterPoll", NewsletterPollAttrs>` after the `newsletterSubscribeBlock` row in `CustomNewsletterNode`.
7. **`editor/NewsletterEditor.tsx`** — import `PollNodeView`; verify/add `NewsletterPoll` named import; declare `NodePollEdit = NewsletterPoll.extend({ addNodeView: () => ReactNodeViewRenderer(PollNodeView) })`; append to `EDITABLE_NODE_OVERRIDES` after `NodeSubscribeBlockEdit` (→ 33 entries).
8. **`editor/NewsletterSlashMenu.tsx`** — add `Vote` to lucide import (do NOT reuse `BarChart3`); add INTERACTIVE entry right after SubscribeBlock with keywords `["poll","vote","survey","question"]`, inserts `{ type: "newsletterPoll", attrs: { poll_id: null } }`.
9. **`editor/NewsletterBubbleMenu.tsx`** — append `"newsletterPoll"` to `blockedParents`.
10. **`pages/marketing/NewsletterArticle.tsx`** — default-import `PollReaderNodeView`; add render-switch case for `newsletterPoll` after the `newsletterFootnotes` case (→ 6 cases).
11. **`styles/newsletter-prose.css`** — append Poll block per spec using `--bw-*` tokens:
    - `.newsletter-poll` cream container, hairline border, `--radius-lg`, padding/margin `--s-6`.
    - `.newsletter-poll__question` Poppins bold matching h3.
    - `.newsletter-poll__options` flex column gap `--s-3`.
    - `.newsletter-poll__option` button variant (white bg, hairline, hover tint, focus ring `--bw-orange`) and `[data-style="bars"]` row variant w/ `position:relative` and `.newsletter-poll__bar-fill` absolute underlay at low-opacity orange.
    - `[data-voted="true"]` 2px orange border + `::before` ✓.
    - `[disabled]` / `[data-locked="true"]` muted + `not-allowed`.
    - `.newsletter-poll__total` small-caps mono-feel 12px `var(--fg-3)`.
    - `.newsletter-poll__signin-cta` orange accent link style.
    - Then scan file for selectors duplicated across P6a/P6b/P7a/P7b/P7c appends; consolidate only obvious duplicates in place; otherwise leave untouched.

## Verification

- `npx tsc -b --noEmit` exits 0.
- No new npm packages, no SQL migrations, no edits to `integrations/supabase/types.ts`.
- Editor never calls `get_poll_results`; reader never reads tables directly.
