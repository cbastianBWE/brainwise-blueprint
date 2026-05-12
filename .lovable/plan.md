# Diagnosis: AI authoring panel bottom clipping

## Root cause (a flex sizing bug, not a max-height bug)

The `<aside>` in `AiPane.tsx` is `position: fixed; top: 56; bottom: 0` and `flex flex-col`. Its children, in order, are:

1. Header (`flex items-center justify-between border-b px-3 py-2`) — natural height ~40px
2. Optional impersonation banner / stale-conversation banner (when shown)
3. The active stage component, e.g. `Stage1Chat`, whose root is:
   ```
   <div className="flex h-full flex-col">
   ```

`h-full` on the stage root = `height: 100%` of the aside's content box. That 100% does **not** subtract the header above it — it equals the *full* aside height. So the stage's intrinsic height = aside_height, and stacking it after the header pushes its bottom past `aside.bottom: 0`. Anything inside the stage that isn't `flex-1 overflow-auto` (Stage 1's input area, Stage 2's footer with the orange Approve button, etc.) gets clipped by the viewport.

This is why fix3's `max-h-[45vh]` and `flex-shrink-0` did not help: the `flex-shrink-0` on the input/footer is correct, but the *parent* of those children (the stage root) is itself oversized, so its overflow is what's getting cut off — not its internal flex distribution.

The same `h-full` root exists in **all four** stage components:

- `Stage1Chat.tsx:257` — `flex h-full flex-col`
- `Stage2Outline.tsx:121` — `flex h-full flex-col`
- `Stage3FullContent.tsx:66` — `flex h-full flex-col`
- `Stage4Built.tsx:17` — `flex h-full flex-col`

## Fix (4 one-line edits)

In each of the four files above, change the root div's class from:

```
flex h-full flex-col
```

to:

```
flex flex-1 min-h-0 flex-col
```

`flex-1` tells the aside's flex layout to give this child the remaining space after the header (and any banner) take their natural heights. `min-h-0` is required so the flex child is allowed to shrink below its intrinsic content height, which is what enables the inner `flex-1 overflow-y-auto` regions (chat thread, outline list, blocks list) to actually scroll instead of forcing the parent to grow past the viewport.

No changes needed to the aside, the header, the banners, or the inner flex-shrink-0 footers added in fix3 — those are already correct and become effective once the stage root is sized properly.

## Optional cleanup (not required for the fix)

Once the root is `flex-1 min-h-0`, the `max-h-[45vh] overflow-y-auto` workaround on Stage1Chat's top-controls block (line 259) is no longer load-bearing for keeping the chat input visible — the input's own `flex-shrink-0` is enough. We can leave it (it still helps when many docs are attached) or drop the `max-h-[45vh]` cap. Recommendation: leave as-is to avoid scope creep.

## Verification after the change

- Stage 1: chat input textarea + Send button fully visible at the bottom; "Generate outline" button (when shown) sits above the input; with many attached docs the top-controls block scrolls internally.
- Stage 2: orange "Approve outline & generate full content" button fully clickable at the bottom; outline list scrolls.
- Stage 3: build button reachable; blocks list scrolls.
- Stage 4: success card visible; Start over button reachable.

## Why I didn't take live measurements

The browser automation session does not share your preview's auth cookie — navigating to the lesson route lands on the login screen. Rather than ask you to type credentials into the automation browser, I diagnosed from the layout code, where the bug is unambiguous: a `h-full` flex child sibling-of-header inside a bounded flex column will always overflow by the header's height. The math doesn't depend on viewport size, which also matches the symptom (clipping persists across window sizes).
