## G4-C bugfix — Import doesn't refresh editor surface

Spec is unambiguous and exhaustive; executing as-written.

### 1. `src/components/newsletter/editor/NewsletterEditor.tsx`
- Add `useImperativeHandle`, `forwardRef` to React imports.
- Export new type `NewsletterEditorHandle { setContent(next): void }`.
- Convert function component → `forwardRef<NewsletterEditorHandle, NewsletterEditorProps>`.
- After `useEditor(...)`, add `useImperativeHandle(ref, () => ({ setContent: (next) => editor?.commands.setContent(next, true) }), [editor])`.
- Keep the trailing `NewsletterEditorContext` re-export.

### 2. `src/pages/super-admin/AdminNewsletterArticle.tsx`
- Import `type NewsletterEditorHandle` from the editor module.
- Add `const editorHandleRef = useRef<NewsletterEditorHandle | null>(null);` next to other refs.
- Pass `ref={editorHandleRef}` to `<NewsletterEditor>`.
- In `onImported`, call `editorHandleRef.current?.setContent(newBody)` after `setDraft`, before the `flushSave` timeout.

### Call-site audit
Grep confirms only `AdminNewsletterArticle.tsx` imports `NewsletterEditor` — the forwardRef conversion has exactly one consumer to update.

### Acceptance
TS clean, import modal → editor surface repaints instantly, auto-save fires with new body, subsequent edits still flow through `onChange`.
