## Fix two video content_item bugs in `ContentItemEditor.tsx`

Single-file change: `src/pages/super-admin/editors/ContentItemEditor.tsx`.

### Change 1 — Relax `perTypeValid` for `supabase_storage` (line ~161)
Allow Save when `videoSourceType === "supabase_storage"` even if `videoSourceId` is empty (file is attached post-create via `FileUploadField`).

### Change 2 — Clear `videoSourceId` on source-type switch (line ~578)
Wrap the Select's `onValueChange` so switching source types resets `videoSourceId` to `""`, preventing `FileUploadField` from showing a stale "uploaded" state seeded by a YouTube/Vimeo ID.

### Change 3 — Update create-mode hint (line ~603)
Replace the misleading "save with a placeholder source" copy with: "Save the content item first. After saving, you'll be able to upload the video file or pick one from the library."

No other files touched. RPC already accepts NULL `video_source_id` for `supabase_storage`.