
# 6a-AI — AI authoring panel (frontend)

Backend already shipped in Session 62: tables `ai_authoring_conversations`, `ai_authoring_session_documents`, `ai_authoring_voice_presets`, plus RPCs `upsert_ai_authoring_conversation`, `get_ai_authoring_conversation`, `delete_ai_authoring_conversation`, `list_ai_authoring_session_documents`, `delete_ai_authoring_session_document` are present in `src/integrations/supabase/types.ts`. The 6 Edge Functions (`ai-authoring-chat`, `scaffold-lesson-outline`, `expand-lesson-from-outline`, `upload-ai-authoring-doc`, `delete-ai-authoring-doc`, `draft-lesson-block`) are deployed remotely.

This plan is **frontend-only**. No DB or Edge Function changes.

## New files (under `src/components/super-admin/lesson-blocks/ai-pane/`)

1. **`AiPane.tsx`** — Fixed right-side panel, 480px, `position: fixed; top: 56px; right: 0/-480px`, animates `right` (not transform). Owns all stage state, mounts persistence + rehydration, routes to one of four stage subcomponents, renders header (title, stage pill, Start over, close X), handles 24h-stale banner and start-over confirm. Pauses autosave around `onBuildLesson`.
2. **`Stage1Chat.tsx`** — Mode segmented control (locks after first message), voice preset Select (5 presets + Custom), attached-docs tray + paperclip upload (manual `fetch` to `upload-ai-authoring-doc`), markdown chat thread with sand/orange tint bubbles, auto-grow textarea, mic button, Send (Cmd/Ctrl+Enter), and the "Generate outline" CTA (visible only after ≥1 user + ≥1 assistant message).
3. **`Stage2Outline.tsx`** — Sortable cards (`@dnd-kit/sortable`, mirroring `StackedLessonEditor`), inline-editable summary/objective, per-card Iterate/Delete, between-item "+ Add" dividers, Back to chat + Approve buttons with cost estimate.
4. **`Stage3FullContent.tsx`** — Read-only previews via existing `BlockRenderer`, per-block Iterate, Back to outline, Build lesson, Discard.
5. **`Stage4Built.tsx`** — Success card, collapsible conversation history, Start a new conversation.
6. **`IterationModal.tsx`** — Single shadcn `Dialog`. Three target kinds (`outline_item`, `outline_add`, `full_block`). Calls `scaffold-lesson-outline` with `max_outline_items: 1` for outline targets and `draft-lesson-block` for full-block targets.
7. **`useVoiceDictation.ts`** — Wraps `webkitSpeechRecognition`/`SpeechRecognition` with `isSupported`, `isListening`, interim `transcript`, `start/stop`, `error`. `onFinal` callback for committed chunks.
8. **`useAiAuthoringPersistence.ts`** — 2s debounced autosave to `upsert_ai_authoring_conversation`, stable JSON diff (`normalizeForCompare` pattern from `useLessonBlockDraft.ts`), `pause/resume`, `enabled` flag (false until rehydration completes).
9. **`types.ts`** — Shared `ChatMessage`, `OutlineItem`, `OutlineState`, `FullContentItem`, `FullContentState`, `SessionDocument` (matches the shipped RPC return shapes).
10. **`costEstimates.ts`** — Static lookup map for the cost strings.
11. **`uploadAiAuthoringDoc.ts`** — Thin helper that performs the manual multipart `fetch` (see Technical details).

## Modified files

### `src/pages/super-admin/LessonBlocksEditor.tsx`
- Add `aiPaneOpen` state.
- Add header **✨ AI Draft** button (toggles pane; opening it forces `mode: "edit"` and closes the EditorSlidePane; opening Manage closes the AI pane).
- When `blocks.length === 0`, augment the empty state with a "✨ Start with AI" CTA.
- Add `handleAiBuildLesson(aiBlocks, mode)` per spec: maps `FullContentItem[]` → `EditorBlock[]` with fresh `client_id`s; `append` spreads, otherwise replaces; closes AI pane, clears selection, shows toast. No auto-Save.
- Apply `md:mr-[480px]` to the stack container when `aiPaneOpen` (in addition to existing Manage `md:mr-[320px]`); AI takes precedence when both would apply (mutual auto-close).
- Render `<AiPane />` after `<ManageBlocksSidebar />`.

### `src/components/super-admin/lesson-blocks/BlockEditorPane.tsx`
- Add **✨ Refine with AI** button at the top of the form.
- Inline (non-modal) refine section: textarea + voice Select + Generate, calling `draft-lesson-block` with `author_prompt = "<JSON config> --- Change request: <text>"`. Replace block config via existing `onChange`. Inline error + retry. Independent of `ai_authoring_conversations`.

## Technical details (gotchas + the two amendments)

### Amendment 1 — Drift detection via `lesson_blocks.updated_at` (no localStorage)

On AiPane mount, after `get_ai_authoring_conversation` returns:
```ts
const { data: latestBlockRow } = await supabase
  .from("lesson_blocks")
  .select("updated_at")
  .eq("content_item_id", contentItemId)
  .order("updated_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const idleMs = Date.now() - new Date(conv.out_updated_at).getTime();
const isIdle24h = idleMs > 24 * 60 * 60 * 1000;
const canvasDrifted =
  latestBlockRow &&
  new Date(latestBlockRow.updated_at) > new Date(conv.out_updated_at);

const shouldInjectCanvasNote = isIdle24h && canvasDrifted;
```
If `shouldInjectCanvasNote` is true, the next outgoing `ai-authoring-chat` / `scaffold-lesson-outline` / `expand-lesson-from-outline` call prepends a hidden system-style note to the user's message:
> `Note: the lesson canvas has been edited since this conversation last ran. Current state: <block summaries from canvasBlocks>.`

Block summaries are generated via `extractTextFromTipTap` (already in `blockTypeMeta.ts`) trimmed to ~80 chars per block. The flag is one-shot — cleared after the first AI call following rehydration. The 24h stale banner uses the same `isIdle24h` check independently.

### Amendment 2 — `upload-ai-authoring-doc` uses manual `fetch` only

```ts
// uploadAiAuthoringDoc.ts
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://svprhtzawnbzmumxnhsq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "<anon key from client.ts>";

export async function uploadAiAuthoringDoc(args: {
  contentItemId: string;
  file: File;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const fd = new FormData();
  fd.append("content_item_id", args.contentItemId);
  fd.append("file", args.file);

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/upload-ai-authoring-doc`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        // NOTE: no Content-Type — browser sets multipart boundary
      },
      body: fd,
    }
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...json };
  return json;
}
```
The other 5 Edge Functions (`ai-authoring-chat`, `scaffold-lesson-outline`, `expand-lesson-from-outline`, `delete-ai-authoring-doc`, `draft-lesson-block`) use `supabase.functions.invoke()` — they're all JSON and benefit from auto-attached auth.

### Other technical notes
- **Standing rules honored:** brand-only colors (Navy `#021F36`, Orange `#F5741A`, Sand `#F9F7F1`, Teal `#006D77`, Mustard `#7a5800`, Slate `#6D6875`, Purple `#3C096C`, Forest `#2D6A4F`); 17px / 1.65 body baseline; `position: fixed` (not sticky); animate `right` (not `transform`); non-modal flex sibling (no shadcn Sheet); pause/resume autosave debounce.
- **RPC typing:** generated `Database` types include all 4 client-side RPCs. Call as `supabase.rpc("get_ai_authoring_conversation", { p_content_item_id })` etc.
- **Voice presets:** `supabase.from("ai_authoring_voice_presets").select("preset_key,display_name,display_order").eq("is_active", true).order("display_order")`. Sticky last-used voice per lesson stored in `localStorage` under `ai-authoring:voice:<contentItemId>` (this localStorage use is unrelated to drift detection — it's just a UI default).
- **Markdown rendering:** add `react-markdown` + `remark-gfm` via `bun add` for assistant message rendering (~30KB gzip; only loaded inside the AI pane).
- **dnd-kit:** already a project dep (used in `StackedLessonEditor`); reuse same sensors/strategy.
- **Impersonation:** read existing `ImpersonationProvider` to disable the panel with the IMPERSONATION_DENIED banner without calling the function.
- **Errors:** central `mapAiError(code) → { title, message, retry?: boolean }` helper covering the 8 known codes (`IMPERSONATION_DENIED`, `file_too_large`, `conversation_token_budget_exceeded`, `legacy_ppt_not_supported`, `extraction_failed`, `extraction_empty`, `ai_output_unparseable`, `anthropic_api_failure`). No silent retries.

## Out of scope (per prompt)

Image uploads to AI, server-side audio transcription, Anthropic streaming, cross-lesson conversation copy, knowledge_check trainee rendering, AI on other surfaces.

## Verification

Walk the 30 acceptance criteria against `content_item 32e0e966-4cb8-4e8b-abf8-5617de346f59`, including: tab-close rehydration in each stage, all three modes (fresh/append/replace), the 5 file types + legacy `.ppt` rejection, the new drift-detection path (manually update a block, wait 24h or fudge the conversation row's `updated_at`, verify the canvas note is injected), and per-block Refine on 2+ block types.
