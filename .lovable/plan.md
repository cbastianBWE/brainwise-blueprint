# Session 77 — Prompt 4 (Step 5): File Upload + Live Event Viewers

Frontend-only. Two new trainee viewers and a two-line switch wire-up. No chrome interface or prop-passing changes; no backend changes.

## Files

1. **Create** `src/components/learning/viewers/FileUploadViewer.tsx`
2. **Create** `src/components/learning/viewers/LiveEventViewer.tsx`
3. **Edit** `src/pages/learning/ContentItemViewer.tsx` — only the `file_upload` and `live_event` cases in the `renderViewer()` switch. `lesson_blocks` stays on `PlaceholderViewer`. No other edits.

## FileUploadViewer

Layout (`space-y-6`):

- **Instructions card** — title + description (`whitespace-pre-wrap`).
- **Requirements row** — "Accepted: PDF, DOCX, ..." from `file_upload_allowed_extensions` (or "Any file type" if empty/null); "Max X MB" from `file_upload_max_bytes` (omit if null). Uses a `formatBytes(n)` helper.
- **Upload or submitted state:**
  - Not submitted (`!completion?.file_upload_url`): drop zone + "Choose file" (`bg-[var(--bw-orange)]`) with hidden `<input type="file">`. On select: client-side pre-validate extension (case-insensitive, strip leading dot) and size against item limits → on violation, `toast` and abort. Otherwise run `uploadFile(file, contentItemId)` (the 3-step helper from the prompt, inline). Show `Loader2` + "Uploading…". On success, `queryClient.invalidateQueries({ queryKey: ["content-item-viewer", contentItemId] })`.
  - Submitted: green completed panel (`border-[var(--bw-forest)]/30 bg-[var(--bw-forest)]/5`, `CircleCheck`) with `file_upload_filename` + formatted size. **Download** link backed by a `useQuery` keyed by `["file-upload-read", completion.id]` that invokes `{ action: "read", content_item_id }` and renders `<a href={signed_url} target="_blank" rel="noreferrer">Download</a>`. **Replace file** button (hidden in review mode) reopens the picker and re-runs the helper.
- **Error mapping** (via `useToast`): `file_exceeds_item_limit` → "File exceeds the {max} limit for this item"; `extension_not_allowed` → "That file type isn't accepted. Allowed: {list}"; `file_too_large` → "File exceeds the 500 MB ceiling"; otherwise raw `message`. Errors come back from `supabase.functions.invoke` either as `error` (FunctionsHttpError, parse `context.response.json()` when possible) or as `{ error: code, ... }` in `data` — handle both shapes.
- **Review mode** (`viewerRole !== "self"`): instructions + requirements + (if submitted) submitted panel and Download. No "Choose file" / "Replace file".
- Uses `useQueryClient` from `@tanstack/react-query` and `supabase` from `@/integrations/supabase/client`. Does **not** call `reportCompletion`; the finalize RPC writes the completion server-side, and chrome refetch surfaces the new state. Cascade modal won't fire from a file upload in v1 — accepted.

## LiveEventViewer

Read-only for every role. Layout (`space-y-6`):

- **Event card** — title + description.
- **Schedule row** — `Calendar` icon + `new Date(event_scheduled_at).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })`, or "Date to be announced" if null.
- **Event reference** — muted "Event ID: {event_external_id}" line when set. No link.
- **Attendance status panel** — switch on `completion?.live_event_attendance_status`:
  - `null` / no completion → calm teal panel, `Clock`, "Attendance not yet recorded — your mentor will mark this after the session."
  - `registered` → teal panel, `Calendar`, "You're registered for this event."
  - `attended` → green forest panel, `CircleCheck`, "Attendance confirmed."
  - `missed` → neutral gray panel (`border-[var(--bw-gray)]/30 bg-[var(--bw-gray)]/5`), `Info`, "Marked as missed. Contact your mentor if this is incorrect." Not red/destructive.
- No buttons, no `reportCompletion`, no role gating beyond what's above.

## ContentItemViewer.tsx edits

Add the two imports next to the existing viewer imports and replace exactly these two switch arms:

```
case "file_upload":
  return <FileUploadViewer {...props} />;
case "live_event":
  return <LiveEventViewer {...props} />;
```

`PlaceholderViewer`, `lesson_blocks`, the `props` spread, and `ViewerProps`-shaped contract remain untouched.

## Style tokens (recap)

- Completed: `border-[var(--bw-forest)]/30 bg-[var(--bw-forest)]/5`, icon `var(--bw-forest)`.
- Calm/awaiting/registered: `border-[var(--bw-teal)]/30 bg-[var(--bw-teal)]/5`, icon `var(--bw-teal)`.
- Missed: `border-[var(--bw-gray)]/30 bg-[var(--bw-gray)]/5`, icon `var(--bw-gray)`.
- Primary CTA: `bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white`.
- `Card`, `Button` from `@/components/ui/*`; icons `Calendar`, `Clock`, `CircleCheck`, `Info`, `Upload`, `Loader2`, `FileText` from `lucide-react`.

## Out of scope

Mentor attendance marking, lesson_blocks viewer, any change to other viewers, any change to `ViewerProps` or the chrome's prop spread, any client-synthesized cascade.
