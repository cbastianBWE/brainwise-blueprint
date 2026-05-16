## Fix cascade-completion detection in `useCompletionReporter`

**File:** `src/hooks/useCompletionReporter.ts` (only)

Replace the body of `collectCompleted(snapshot)` with a shape-aware traversal of the real `get_user_learning_state` payload. Keep its return type `{ content_items: Set<string>, modules: Map<string,string>, curricula: Map<string,string>, certifications: Map<string,string> }` unchanged so the existing diff + tier-priority logic in `reportCompletion` keeps working.

### New traversal

1. Guard: if `!snapshot || typeof snapshot !== "object"`, return the four empty collections.
2. Helper `collectModule(mod)`:
   - If `mod?.module_completion?.status === "completed"`, add `mod.module_id → (mod.name ?? "this module")` to `modules`.
   - For each `item` in `mod?.items ?? []`: if `item?.completion?.status === "completed"`, add `item.content_item_id` to `content_items`.
3. Curricula / module items via `assignments`:
   - For each `a` in `snapshot.assignments ?? []`:
     - Curriculum completed when `a.assignment_status === "completed"` OR (`!a.assignment_status && a.status_group === "completed"`). Add `a.curriculum_id → (a.curriculum?.name ?? "this curriculum")` to `curricula`.
     - For each `m` in `a.modules ?? []`: `collectModule(m)`.
4. Standalone module assignments:
   - For each `ma` in `snapshot.module_assignments ?? []`: `collectModule(ma)` (the row itself carries `module_id`, `module_completion`, and `items`).
5. Certifications:
   - For each `c` in `snapshot.certifications ?? []`: if `c.status === "certified"` or `c.status === "completed"`, add `c.certification_id → (c.certification_type ?? "your certification")` to `certifications`.

Every array access is null-guarded with `?? []`; every nested object access uses optional chaining so a partial snapshot never throws.

### Unchanged

- `fetchLearningState`, `reportCompletion`, the before/after diff, the tier-priority chain (`certification > curriculum > module > content_item`), query invalidations, `ReportResult` / `CascadeResult` types.
- `ContentItemViewer.tsx`, `CASCADE_COPY`, the `Dialog`, every viewer component.
- The known `file_upload`-doesn't-fire limitation is intentionally left alone.

### Verification

As the test trainee, complete the last required item in Test Module C through a viewer that uses `reportCompletion` (quiz / written summary / video / external link / skills practice). The celebration `Dialog` should now open with the module-tier copy and the module's name.
