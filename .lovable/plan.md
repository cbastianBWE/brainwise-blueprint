## Plan: Learning Folder Manager (Content Authoring)

Add a super-admin dialog to create/organize learning folders and file cert paths, curricula, and modules into them. Mirrors `ResourceFolderManager.tsx` patterns; only two files change.

### File 1 (NEW): `src/pages/super-admin/editors/LearningFolderManager.tsx`

Dialog component with this signature:

```ts
interface LearningFolderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}
```

Self-fetches everything via `useQuery`:

- `learning_folders` (archived_at is null, ordered by display_order)
- `learning_folder_items` (all rows, used for direct-filing counts and "currently in: X" lookups)
- `organizations` (for the org grant select)
- `certification_paths`, `curricula`, `modules` (for the Items add picker)
- `learning_folder_access_grants` filtered by folder_id (inside `GrantsDialog`, just like the resource version)

Shared helpers, copied/adapted from `ResourceFolderManager.tsx`:

- `slugify`, `slugOk = slugify(name).length > 0`
- `GrantRow`, `newGrantRow`, `rowComplete`, `rowToPayload`
- `mapFolderError` adjusted: drop `resource_folder_tab_mismatch`; add `learning_entity_not_found → "That item no longer exists."`; keep duplicate (23505), reason_required_min_chars, folder_has_children, max_folder_depth, fallback.
- Imports `GRANT_TYPE_OPTIONS, ACCOUNT_TYPE_OPTIONS, PLAN_TIER_OPTIONS, CORPORATE_LEVEL_OPTIONS, CERTIFICATION_TYPES` from `../resource-editors/_resourceShared`.

Main dialog structure (no tab selector; learning folders have no tab):

- Header: "Manage Learning Folders" + "New folder" button (creates a top-level folder).
- Tree: top-level folders sorted by `(display_order, name)`, each followed by its subfolders (same `FolderRow` two-level pattern). Each row shows a small count badge: number of `learning_folder_items` rows directly filed in that folder.
- Top-level row actions: Add subfolder, Rename, Items, Grants, Archive.
- Subfolder row actions: Rename, Move, Items, Grants, Archive.

Sub-dialogs (each has the standard reason `Textarea` with `{n}/10` helper; primary action disabled while saving or `reason < 10`):

- **Create / Rename** (`NameDialog`): name `Input` + reason. Calls `supabase.rpc("upsert_learning_folder", { p_id, p_parent_folder_id, p_name, p_slug, p_display_order, p_reason })`. Create → `p_id: null`, parent is null (top) or the parent id; `p_display_order = sibling count`. Rename → preserve `p_id`, `p_parent_folder_id`, `p_display_order`. Confirm disabled unless `slugOk`.
- **Move** (subfolder only): parent `Select` with "(top level)" + every other top-level folder; reason. Calls `upsert_learning_folder` with the new `p_parent_folder_id` and existing name/slug/display_order. Guards a subfolder that has children (would never happen at two levels, but the same hasChildren check is preserved for safety).
- **Archive**: `AlertDialog` warning: "Subfolders will also be archived; any cert paths, curricula, or modules filed inside will fall back to unfiled. Recorded in the audit log." Calls `archive_learning_folder({ p_folder_id, p_reason })`.
- **Grants**: identical to the resource version, importing the option lists from `_resourceShared`. Preloads from `learning_folder_access_grants` for the folder, saves with `set_learning_folder_access_grants({ p_folder_id, p_grants, p_reason })`. Includes the note: "Learning folder grants scope this folder's contents to matching users. Anything assigned to a user stays visible regardless."
- **Items** (the new part): a dialog for one folder.
  - Top section: list of entities currently filed in this folder, built by joining `learning_folder_items` rows where `folder_id === folder.id` against the three entity catalogs to resolve names. Each item shows entity name + a small badge ("Cert Path" / "Curriculum" / "Module") + a Remove button. Remove uses a small inline reason field (or a shared reason at the top of the dialog — see below) and calls `set_learning_folder_item({ p_entity_type, p_entity_id, p_folder_id: null, p_reason })`.
  - Add section: entity-type `Select` (Cert Path / Curriculum / Module). Once chosen, a searchable entity `Select` of that type from the catalog (using shadcn `Command` inside a `Popover` for search; falls back to native Select if simpler). For the chosen entity, look up its current `learning_folder_items` row: if present and not equal to this folder, render "Currently in: <folder name> — filing here will move it." On confirm → `set_learning_folder_item({ p_entity_type, p_entity_id, p_folder_id: folder.id, p_reason })`.
  - Single shared `reason` `Textarea` at the bottom of the dialog used by both Remove and Add actions, with the standard `{n}/10` helper; each action button disabled while saving or `reason < 10`.

After every successful mutation: `toast`, refetch the relevant queries (folders, items, grants), and call `onChanged()`. Explicit buttons only — no drag-and-drop.

### File 2 (EDIT): `src/pages/super-admin/ContentAuthoring.tsx`

- Add imports: `LearningFolderManager` from `./editors/LearningFolderManager` and `FolderTree` from `lucide-react`.
- Add state: `const [folderManagerOpen, setFolderManagerOpen] = useState(false);`
- In the navigator `CardHeader` button row (lines 423-433, next to the Cert Path / Curriculum / Module add buttons), add a "Manage Folders" button:

```tsx
<Button size="sm" variant="outline" onClick={() => setFolderManagerOpen(true)}>
  <FolderTree className="h-3.5 w-3.5" /> Manage Folders
</Button>
```

- At the bottom of the page (just before the outer closing element), render:

```tsx
<LearningFolderManager
  open={folderManagerOpen}
  onOpenChange={setFolderManagerOpen}
  onChanged={() => refetch()}
/>
```

- Do not touch the tree navigator, the editors, or the existing data `useQuery`.

### Out of scope

No SQL, no edits to `src/integrations/supabase/types.ts`, no changes to `CertPathEditor` / `CurriculumEditor` / `ModuleEditor` or their `handleSave` paths, no other files.

### Acceptance

- Two-level folder hierarchy enforced (no "Add subfolder" on a subfolder; subfolder Move only lists top-level parents).
- Every mutation requires ≥10-char reason; duplicate-name → friendly message; missing entity → "That item no longer exists."
- Filing an already-filed entity moves it and surfaces the "Currently in: …" note before confirmation.
- Folder grants use the same grant types and UI as resource folders.
- Manage Folders button visible in Content Authoring header; closing the dialog refetches the existing data query.
