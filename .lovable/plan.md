# Cycle G4-C — Paste/upload HTML import modal

Build the frontend UI for the deployed `convert-html-to-tiptap` Edge Function. Entry point is a new toolbar button that opens a modal with file-drop + paste fallback, shows honest progress, then requires explicit confirmation before replacing the editor body.

## Files

### 1. NEW `src/components/newsletter/editor/ImportHtmlModal.tsx`
Single self-contained modal. Internals:

- **State machine** as in spec (`idle` | `reading_file` | `converting` | `success` | `error`).
- **idle**: cream drop zone (`bg-[var(--bw-cream-100)]`, `border-dashed border-2 border-[var(--bw-orange)]/40`, hover intensifies), `FileUp` icon, hidden `<input type="file" accept=".html,.htm,text/html">`. Drag handlers on the zone (`dragenter/over/leave/drop` with counter to avoid flicker). Validation: extension `.html`/`.htm` OR MIME `text/html`, size ≤ 5MB. Below: collapsible "Or paste HTML directly" → `Textarea` (monospace, min-h 200px) + "Convert paste" button.
- **reading_file**: `FileReader.readAsText(file, 'UTF-8')`, spinner + filename.
- **converting**: indeterminate `Progress`, copy "Converting HTML… This can take up to 2 minutes if the article has many images.", Cancel button calls `AbortController.abort()`. Implementation: bypass `supabase.functions.invoke` and use raw `fetch` to `${SUPABASE_URL}/functions/v1/convert-html-to-tiptap` with `Authorization: Bearer ${session.access_token}`, `apikey`, JSON body, and `signal`. This is the only way to get real cancel semantics with supabase-js's current `functions.invoke`. Session pulled via `supabase.auth.getSession()`.
- **success**: green banner, 4-card stats grid (`total_images_attempted`, `images_succeeded`, `images_failed`, `tags_dropped`), conditional yellow `failures` banner with expandable `<details>` listing kind/detail/original_src/tag_name in monospace. Preview card renders the converted doc in a read-only TipTap instance using `buildExtensions({ editable: false })` plus the existing G6 reader NodeViews for `newsletterImage`/`newsletterEmbed` (imported from `src/components/marketing/newsletter/reader-nodeviews/`). Preview is truncated to the first ~200 words via `tipTapDocToPlainText` (G5). Footer: Cancel + orange "Import into editor (replaces current draft body)".
- **error**: red banner, mapped friendly message table per spec, "Try again" → reset to idle, "Close".
- Mid-conversion close guard: intercept `onOpenChange(false)` while `phase === "converting"` and show inline AlertDialog "Cancel conversion?" (flagged as optional polish).

### 2. EDIT `src/components/newsletter/editor/NewsletterToolbar.tsx`
- Add `onOpenImportHtml?: () => void` to props.
- Render new `FileCode` icon button between Image and Divider, only when `onOpenImportHtml` is defined. Tooltip "Import HTML". Disabled when `disabled` prop is true.

### 3. EDIT `src/components/newsletter/editor/NewsletterEditor.tsx`
- Add `onOpenImportHtml?: () => void` to `NewsletterEditorProps`, forward to `NewsletterToolbar`.

### 4. EDIT `src/pages/super-admin/AdminNewsletterArticle.tsx`
- `const [importOpen, setImportOpen] = useState(false);`
- Pass `onOpenImportHtml={articleIdRef.current ? () => setImportOpen(true) : undefined}` to `<NewsletterEditor>` (hides button in create mode per spec).
- Mount `<ImportHtmlModal>` at page level. `onImported` sets `draft.body_tiptap`, marks dirty, calls `flushSave("HTML import: replace body")`, toasts success.

## Architectural decisions

- **AbortController**: use raw `fetch` against the function URL with session token, since `supabase.functions.invoke` doesn't accept `AbortSignal`. Keeps real cancel.
- **Plumbing**: prop drilling page → NewsletterEditor → NewsletterToolbar, mirroring how `imageInputRef` is already passed.
- **Preview NodeViews**: import from `src/components/marketing/newsletter/reader-nodeviews/` (created in G6) — no duplication. Same `.extend({ addNodeView })` pattern used in G6's `NewsletterArticle.tsx`.
- **Destructive confirm**: the entire success screen IS the confirm step — primary button copy spells out "(replaces current draft body)". No second AlertDialog needed.

## Non-deliverables (per spec)
No tests, no backend changes, no auto-retry of failed images, no separate review page, no import undo (handled by G5 version history snapshots).

## Acceptance check at the end
`bunx tsc --noEmit` clean; manual smoke: drop file → progress → success → import → editor reloaded with new body and auto-save fires.
