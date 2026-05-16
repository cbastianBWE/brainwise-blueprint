# Session 77 — Prompt 0: Content Item Viewer Chrome + 3 Viewers

## Overview

Ship `/learning/content-item/:contentItemId` — the trainee-facing viewer page that completes the learning hierarchy below ModuleDetail. All backend RPCs already exist and are verified. This prompt is purely frontend: 1 page (chrome), 3 viewers, 2 hooks, 1 route, and 1 button label fix.

## Files

### New
1. `src/hooks/useAssetResolver.ts` — thin `useQuery` wrapper around existing `resolveThumbnailUrls`; returns `{ urls, isLoading }` map of asset_id → URL.
2. `src/hooks/useCompletionReporter.ts` — captures `get_user_learning_state` before/after a completion RPC, diffs to find highest cascaded tier (content_item → module → curriculum → certification), invalidates query keys, returns `CascadeResult | null`.
3. `src/pages/learning/ContentItemViewer.tsx` — the chrome: data fetch via `get_content_item_for_viewer`, breadcrumb pills (cert path › curriculum › module), header band (title, item-type label, Required/Optional, Completed badge), `item_type` branch into viewer, Prev/Next footer, single celebration modal on cascade.
4. `src/components/learning/viewers/VideoViewer.tsx` — handles 5 source types (supabase_storage native player w/ timeupdate tracking; YouTube/Vimeo/Cloudflare iframes; Mux HLS fallback link). Reports progress every ~15s and at threshold. Embed sources get a "Mark as watched" button. Renders "Quick summary" bullet card from `video_ai_summary` after completion.
5. `src/components/learning/viewers/WrittenSummaryViewer.tsx` — Textarea + char count gated on `written_min_chars`/`max_chars`; Submit calls `submit_written_summary`; "Need a starting point?" button calls `draft-text` edge function and shows suggestion in a panel above (not inserted into) the textarea.
6. `src/components/learning/viewers/ExternalLinkViewer.tsx` — "Open resource" external link button + optional reflection Textarea + "Mark as done" button calling `confirm_external_link`. Completed state shows saved reflection.

### Edited
7. `src/App.tsx` — add `ContentItemViewer` import and `<Route path="/learning/content-item/:contentItemId" element={<ContentItemViewer />} />` alongside existing learning routes.
8. `src/pages/super-admin/editors/ContentItemEditor.tsx` — rename the video "Quick summary" generate button label from "Generate with AI" to "AI Draft" (single string change; matches title/description buttons).

## Chrome contract — props passed to every viewer

```ts
interface ViewerProps {
  contentItem: ContentItemShape;
  completion: CompletionShape | null;
  viewerRole: "self" | "mentor" | "super_admin";
  reportCompletion: (rpcName: string, rpcArgs: Record<string, unknown>) =>
    Promise<{ ok: boolean; cascade: CascadeResult | null; error?: string }>;
  isReporting: boolean;
  resolveAsset: (assetId: string | null | undefined) => string | undefined;
}
```

`viewerRole !== "self"` puts all viewers in read-only review mode (no completion writes, no Submit/Mark buttons).

## Cascade collapse

After `reportCompletion` resolves, if cascade is non-null, show ONE modal at the highest transitioned tier with copy keyed by tier ("Item complete!" / "Module complete!" / "Curriculum complete!" / "You're certified!") naming `cascade.entityName`. Continue button dismisses; Next item button (when `next_item` exists) navigates onward.

## Errors

Mapped from RPC error messages: `content_item_not_assigned` → "You don't have access to this item." · `content_item_not_found` → "This item could not be found." · `parent_module_unavailable` → "This item isn't available right now." · default → generic. Each error card has a Back button.

## Placeholder viewers

`quiz`, `skills_practice`, `file_upload`, `live_event`, `lesson_blocks` render a "This {type label} viewer is coming soon." card. Prev/Next still work.

## Styling

Mirrors ModuleDetail: `px-4 sm:px-6` spacing, ghost Back button with `ArrowLeft`, pills `rounded-full px-3 py-1 text-xs bg-muted border` separated by `ChevronRight`. Completed badge `bg-[var(--bw-forest)]` + `CircleCheck`. Primary CTAs `bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white`. Reuses `getItemTypeIcon` map (copied from ModuleDetail) and `CONTENT_ITEM_TYPE_LABEL` from `@/components/tile/tileVariants`. No bg-image hero (compact header band only — viewer is one tier below ModuleDetail).

## Out of scope

The five not-yet-built viewers (quiz/skills/file/event/lesson), reading back the written summary body (no v1 RPC), any HLS playback library for Mux, any backend or schema change.
