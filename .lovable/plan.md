## Goal

Fix `MatchTrainee` in `src/components/super-admin/lesson-blocks/BlockRenderer.tsx` so the right-column answers are actually shuffled (not just sorted by `client_id`, which preserves authored order). Use the existing `stableShuffle` helper with a seed derived from the block + question client_ids, so the order is stable across re-renders but decoupled from authoring order.

Scope: this one file only. No other files, no behavior changes elsewhere.

## Changes

### 1. `MatchTrainee` — accept `blockClientId` and shuffle rights

In the component signature (around line 2297–2307), add `blockClientId: string` to props.

Replace the current `rightsSorted` (lines 2311–2313):

```ts
const rightsSorted = [...pairs].sort((a, b) =>
  a.client_id < b.client_id ? -1 : a.client_id > b.client_id ? 1 : 0,
);
```

with a seeded shuffle using the existing helper already defined at line 1825:

```ts
const rightsSorted = useMemo(
  () => stableShuffle(pairs, `${blockClientId}:${question.client_id}:match-right`),
  [pairs, blockClientId, question.client_id],
);
```

(Keep the variable name `rightsSorted` so the JSX at line 2385 is unchanged.)

### 2. Thread `blockClientId` into the render site

At the `<MatchTrainee ... />` usage (around line 2236), pass `blockClientId={blockClientId}` — the parent `KnowledgeCheckRender` already has `blockClientId` in scope (per its props signature at line 1199–1208).

## Notes

- `stableShuffle<T extends { client_id: string }>(items, seed)` already exists in this file (line 1825) and is used the same way for ranking/timeline questions (e.g. line 1855), so the seed convention `${blockClientId}:${q.client_id}:...` matches existing patterns.
- The seed is stable per (block, question), so the right-column order won't churn across re-renders, attempts, or hot reloads, but it no longer mirrors authored order.
- The authoring preview uses the same renderer and will correctly show a shuffled right column — this is the intended behavior per the task.
- `useMemo` is already imported in this file (used heavily elsewhere); no new imports required.
- No changes to left column, link/clear handlers, completion logic, `KCPerQuestionState`, or any other component.