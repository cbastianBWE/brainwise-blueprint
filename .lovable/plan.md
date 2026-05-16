## Plan — Video content-item AI summary field

Single-file change: `src/pages/super-admin/editors/ContentItemEditor.tsx`. Backend (column + RPC + draft-text Edge Function) is already shipped — frontend just wires up the field.

### Changes (7 edits, all in ContentItemEditor.tsx)

1. **New state**: `videoAiSummary` initialized from `initial?.video_ai_summary ?? ""`, plus `aiDraftingVideoSummary` boolean flag.

2. **Widen `aiDraftTarget` union** to include `"content_item_video_summary"` at all three sites: `useState` type param, `callDraftText` param type, `openAiDraft` param type.

3. **Extend `callDraftText`** to handle the new target:
   - Toggle `aiDraftingVideoSummary` on start / `finally`.
   - `currentValue` = `videoAiSummary`.
   - `surroundingContext` = module name + video title + video description (no transcript).
   - Result: `setVideoAiSummary(payload.text)`.
   - Include `aiDraftingVideoSummary` everywhere disable logic ORs the other two flags.

4. **Render the field** inside `{itemType === "video" && (...)}`, after the completion-threshold field: Label + "Generate with AI" button (calls `openAiDraft("content_item_video_summary")`) + 5-row Textarea + helper text. Reuses existing imports (Textarea, Button, Label, Loader2, Sparkles).

5. **`buildTypeConfig` `case "video"`**: add `video_ai_summary: videoAiSummary.trim()` to the returned object.

6. **`isDirty` useMemo**: add `videoAiSummary !== (initial.video_ai_summary ?? "")` comparison and include `videoAiSummary` in the dependency array.

7. **AI Draft dialog `DialogDescription` ternary**: expand to handle three values — title / "quick summary" / description. Any other site branching on the exact title vs description literal: treat the new value like the description branch (refines when non-empty).

### Out of scope

No new imports. No changes to title/description AI Draft paths, voice preset query, dialog component, or any non-video code. Purely additive.

### Verification

- Type-check passes (build runs automatically).
- Field only appears for `itemType === "video"`.
- Round-trip: save → reload editor → text persists.
- Empty save is valid (backend normalizes to NULL).
- Dirty state flips when only the summary changes.
