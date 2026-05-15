# Add Detach & Duplicate UI to Content Authoring

Wire up the 5 already-deployed RPCs into the three super-admin editors. Three files change; no backend or RPC signature changes.

## File 1 — `src/pages/super-admin/editors/CertPathEditor.tsx`

**AttachedCurriculaSection (detach)**
- Extend props with `certPathName: string` and `onDetach(curriculumId, curriculumName)`.
- In each row, render an `X` ghost icon button (destructive color) next to the existing Pencil edit button, calling `onDetach`.

**CertPathEditor parent**
- Add `detachState` (open, curriculumId, curriculumName, reason, loading).
- Add `handleDetachCurriculum` → `supabase.rpc("detach_curriculum_from_certification_path", { p_certification_path_id, p_curriculum_id, p_reason })`. On success: success toast, reset state, `onRefetch?.()` + `onInvalidateAttachedList?.()`.
- Pass `certPathName` and `onDetach` down to `AttachedCurriculaSection`.
- Render an `AlertDialog` at the end of `CardContent` with a Textarea reason (≥10 chars enforced), Cancel / Detach actions, loading spinner.

**Duplicate**
- Add `duplicateState` (open, newSlug, newName, reason, loading).
- Import `Copy` from lucide-react (and `X` if missing).
- Add `openDuplicateDialog` (prefills `${slug}-copy`, `${name} (Copy)`) and `handleDuplicate` → `supabase.rpc("duplicate_certification_path", { p_source_certification_path_id, p_new_slug, p_new_name, p_reason })`.
- Map errors: `slug_already_in_use` → "That slug is already in use…"; `reason_required_min_chars` → "Reason must be at least 10 characters."; else fall back to `error.message`.
- On success: toast with `data.new_name`, reset state, `onRefetch?.()` (do not navigate).
- Add an outline `Duplicate` button (with `Copy` icon) immediately after the Archive button in the toolbar's left flex group.
- Render a `Dialog` at the end of `CardContent` with Name, Slug (passed through `slugify`), and Reason fields; Cancel + Duplicate buttons with validation (`reason ≥10`, slug & name non-empty).

## File 2 — `src/pages/super-admin/editors/CurriculumEditor.tsx`

Apply the exact same pattern as CertPathEditor, adapted for modules:

- **AttachedModulesSection**: add `curriculumName` + `onDetach(moduleId, moduleName)`; X icon button next to edit pencil.
- **Detach**: `detachState` + `handleDetachModule` → `supabase.rpc("detach_module_from_curriculum", { p_curriculum_id, p_module_id, p_reason })`; AlertDialog at end of CardContent.
- **Duplicate**: `duplicateState` + `openDuplicateDialog` (prefills from current curriculum) + `handleDuplicate` → `supabase.rpc("duplicate_curriculum", { p_source_curriculum_id, p_new_slug, p_new_name, p_reason })`; same error mapping; Duplicate button next to Archive; Duplicate Dialog at end of CardContent.

## File 3 — `src/pages/super-admin/editors/ModuleEditor.tsx`

Duplicate only (no detach UI):
- Add `duplicateState`, `openDuplicateDialog`, `handleDuplicate` → `supabase.rpc("duplicate_module", { p_source_module_id, p_new_slug, p_new_name, p_reason })`.
- Same error mapping. Success toast: "Module duplicated — Created as draft: {new_name}. Review and publish when ready."
- Add Duplicate button next to Archive in the toolbar.
- Add Duplicate Dialog at the end of `CardContent`.

## Conventions

- Verify existing imports for `slugify`, `cn`, `useToast`, `supabase`, `Button`, `Dialog*`, `AlertDialog*`, `Label`, `Input`, `Textarea`, `Loader2` before adding; only add `Copy` and `X` to existing lucide-react import.
- Use semantic tokens (`text-destructive`, etc.) — no raw colors.
- Cast RPC args with `as any` to match existing pattern (types regenerate from DB).
- After detach/duplicate, the user stays on the current entity; refetch refreshes the tree/attached list.

## Verification

Type-check passes; no other files touched.
