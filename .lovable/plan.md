# Phase 11.E — Execute approved cleanup

Backend overload drop is done. Execute the 5 frontend changes exactly as approved in the diagnostic round:

**New (1)**
- `src/components/learning-admin/learning-tree-types.ts` — pure type file exporting `MarkTier` + `MarkTarget` verbatim from CompletionConfirmDialog.tsx.

**Modified (2, one-line each)**
- `src/components/learning-admin/AdminLearningTree.tsx` line 9 → import path swapped to `"./learning-tree-types"`.
- `src/components/members/MemberDrawerLearning.tsx` line 5 → import path swapped to `"@/components/learning-admin/learning-tree-types"`.

**Deleted (2)**
- `src/components/learning-admin/CompletionConfirmDialog.tsx`
- `src/components/learning-admin/ResultPanel.tsx`

No other files touched. No backend work. Post-edit grep verifies zero `CompletionConfirmDialog` / `ResultPanel` references and exactly 2 `learning-tree-types` imports.
