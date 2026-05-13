## Session 69 — Add `card_sort` lesson block (FE only)

Backend already supports it (draft-lesson-block v12, expand-lesson-from-outline v11). Five files to touch.

### File 1: `blockTypeMeta.ts` (edit)
- Add `LayoutGrid` to lucide-react imports (alphabetical near `Layers`).
- Append `"card_sort"` to `BlockType` union and `IN_SCOPE_BLOCK_TYPES`.
- Insert `card_sort` entry in `BLOCK_TYPE_META` after `flashcards`. Default: 2 buckets `{client_id, title:"", description:null, outline_color:null}` + 4 cards `{client_id, content:emptyDoc(), correct_bucket_id:null, image_asset_id:null, caption:null, background_color:null}` + `gating_required:false`, `background_color:null`, `padding:"none"`.

### File 2: `block-forms/CardSortBlockForm.tsx` (new)
Mirrors `FlashcardsBlockForm` structure: separate `DndContext` for buckets and for cards, each with vertical `SortableContext`.
- **SortableBucket**: drag handle, title (1-4 words, max 40), optional description (max 120, textarea), `BrandColorSwatch` outline color constrained to `BUCKET_OUTLINE_COLORS = ["#2D6A4F","#F5741A","#3C096C","#021F36"]` with `allowDefault`.
- **SortableCard**: drag handle, optional `FileUploadField` image (refField `card_sort.cards.${client_id}.image_asset_id`), optional caption (max 80, shown only when image present), `RichTextEditor` content (compact), `BrandColorSwatch` palette="full" allowDefault for `background_color`, `Select` "Correct bucket" dropdown listing buckets (label fallback `Bucket N`). Amber warning if `correct_bucket_id === null`; destructive note if previously-selected bucket was deleted.
- Limits: 2-4 buckets, 4-12 cards (Add/Remove disable at bounds). Deleting a bucket nulls any card's `correct_bucket_id` that referenced it.
- Bottom: gating_required `Checkbox`.

### File 3: `BlockEditorPane.tsx` (edit)
- Import `CardSortBlockForm`.
- Add dispatch branch `block.block_type === "card_sort"` before `<BlockStyleSection />`, passing `value`, `onConfigChange`, `contentItemId`.

### File 4: `BlockRenderer.tsx` (edit)
- Add `useRef` to react import (alongside existing `useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode`).
- Add `@dnd-kit/core` imports: `DndContext, DragOverlay, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, pointerWithin, type DragEndEvent, type DragStartEvent`.
- Add `case "card_sort":` in renderInner switch (after flashcards) → `<CardSortRender buckets cards gatingRequired urlMap mode blockClientId />`.
- Append `CardSortRender` component plus types `CardSortBucket`, `CardSortCardConfig`, `PerCardState`, the `CARDSORT_TEXT_COLOR_FOR_BG` lookup (matches flashcards: Sand→Navy, others→White; null→Navy), and helpers `CardSortDraggableCard` + `CardSortDroppable`.
  - State: `Record<id, {placement, locked, lastWrong}>`. PointerSensor + TouchSensor (100ms delay).
  - Hydrate from `sessionStorage["card_sort-pos:${blockClientId}"]` in trainee mode; reconcile against current bucket/card client_ids (missing → holding). Persist `{placement, locked}` only (not `lastWrong`).
  - Editor mode resets state on card-id list change so deleted cards don't linger.
  - Drag start clears that card's `lastWrong`. Drag end moves to bucket or holding (locked cards skipped).
  - Check button: enabled only when no cards in holding; on click, correct → `locked:true` (stays in bucket), wrong → return to holding with `lastWrong:true`.
  - "Try again" resets state and clears sessionStorage.
  - Bucket render: applies inline `borderColor: bucket.outline_color` when set; title centered above thin divider, then dropped cards. Card render: applies inline `backgroundColor` + auto-paired `color`; locked shows green ✓ badge, wrong shows red ✕ badge with `title` tooltip "Correct bucket: <name>"; uses `<DragOverlay>` for the active card.

### File 5: `lesson-blocks.css` (edit)
Append `bw-cardsort-*` styles:
- Shell, progress text, `.bw-cardsort-buckets` CSS grid driven by `data-bucket-count` (2/3/4).
- `.bw-cardsort-bucket`: Sand background `#F9F7F1`, default 3px Slate `#6D6875` border, min-height 12rem; `.is-over` adds orange box-shadow ring.
- `.bw-cardsort-bucket-title-wrap` centered with bottom divider; title 1.0625rem Poppins, untitled italic Slate.
- `.bw-cardsort-holding`: white with dashed border, `.is-over` orange.
- `.bw-cardsort-card`: relative, white default, 2px subtle border, max-width 16rem; `.is-locked` 3px Forest, `.is-wrong` 3px `#D62828` + shake keyframes; `.is-overlay` rotates 2deg.
- `.bw-cardsort-card-badge` absolute top-right circle (correct green / wrong red).
- Image, caption, body styles use `color: inherit` so per-card text color carries through.
- `@media (max-width: 640px)`: collapse buckets to single column, cards full width.

### Out of scope
Per-bucket fill color, author drag-between-buckets, scoring weights, branching, partial credit. AI Refine returns configs without `outline_color`/`background_color` — renderer falls back to defaults (expected).

### Verification
After implementation, manually verify in preview: insert via AddBlockPopover, default seed correct, reorder buckets/cards, dropdown + min/max + deleted-bucket fallback, color pickers (bucket outline + card bg), trainee preview drag (pointer + touch), Check → green-lock + red-shake-with-tooltip, reload persistence, mobile single-column collapse, DB round-trip preserves all client_ids and color fields.
