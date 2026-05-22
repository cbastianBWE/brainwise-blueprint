# Phase 11.D — Legacy delete + brand color tokens

Verified the prompt against the current tree. Plan is accurate with two small caveats called out below.

## Pre-flight findings

- `GraduationCap` is still used on line 156 of `AppSidebar.tsx` (Mentor Portal nav item). **Keep the import** — only `UserSearch` becomes orphaned and gets removed.
- `ResultPanel.tsx`'s only consumer is `LearningAdmin.tsx` (being deleted). Plan defers its removal to 11.E — honoring that.
- `ContentItemArtifactPanel.tsx` exists in `learning-admin/` but is not in the delete list and not mentioned by the prompt. Leave it alone.
- All 6 delete targets exist. All 4 token-migration files contain the raw Tailwind classes the prompt describes (exact line numbers confirmed).

## Part 1 — Legacy delete + route/nav cleanup

**Delete (6 files):**
- `src/pages/super-admin/LearningAdmin.tsx`
- `src/pages/super-admin/Users.tsx`
- `src/components/super-admin/UserDetailsModal.tsx`
- `src/components/learning-admin/CompletionControlTab.tsx`
- `src/components/learning-admin/TraineeMultiSelect.tsx`
- `src/components/learning-admin/learnerSearchShared.ts`

**Keep (explicitly):** `AdminLearningTree.tsx`, `CompletionConfirmDialog.tsx`, `ResultPanel.tsx`, `ContentItemArtifactPanel.tsx`.

**`src/App.tsx`:**
- Remove imports on lines 75 and 82 (`SuperAdminUsers`, `LearningAdmin`).
- Replace the two route elements (lines 197, 205) with `<Navigate to="/super-admin/members" replace />` wrapped in the same `RoleGuard`+`SuperAdminSessionProvider` is unnecessary for a redirect — simplify to a bare `<Route path="..." element={<Navigate to="/super-admin/members" replace />} />`. Keep the existing wildcard fallback untouched.

**`src/components/AppSidebar.tsx`:**
- Delete lines 87 and 94 (the two Legacy entries).
- Remove `UserSearch` from the icon import on line 6.
- Keep `GraduationCap` (still used by Mentor Portal item).

## Part 2 — Brand color tokens (4 files)

Apply the `color-mix(in oklab, var(--bw-*) X%, white)` pattern from the prompt.

**`src/components/members/MemberDrawer.tsx`** (line 94): Active badge → forest tint + forest text. "Not active" stays on shadcn `secondary`.

**`src/components/members/MembersTable.tsx`**:
- Line 60: Active badge → forest tint.
- Lines ~70–90: Refactor the cert-status conditional className into a small `getCertBadgeStyle(status)` helper returning `React.CSSProperties` — `certified` → forest, `in_progress` → amber tint + mustard text, `revoked` → destructive tint. Apply via `style=` with `className="border"` retained so borderColor takes effect.

**`src/components/members/bulk/ScheduleAssignmentModal.tsx`**:
- Replace `STATUS_BADGE_CLASS` map (lines 55–58 + the rest of the map) with `STATUS_BADGE_STYLE: Record<Status, React.CSSProperties>` covering pending/processing/completed/partial/failed/cancelled per the prompt's spec.
- Switch the Badge usage from `className={STATUS_BADGE_CLASS[status]}` to `style={STATUS_BADGE_STYLE[status]} className="border"`.
- Line 454 missing-users amber banner → amber tint bg + mustard text + amber tint border.

**`src/components/members/bulk/BulkUnassignModal.tsx`**:
- Line 252 missing-users amber banner → same amber-tint pattern.
- Line 278 `text-amber-600` heading → `var(--bw-mustard)`.

## Verification

After edits, run grep to confirm:
- The 6 deleted paths return no matches.
- `rg "bg-(emerald|amber|teal)-(50|100)|text-(emerald|amber|teal)-(600|800|900)"` returns zero hits in the 4 migrated files.
- `rg "SuperAdminUsers|Legacy:"` returns zero hits in `src/App.tsx` and `src/components/AppSidebar.tsx`.
- `AdminLearningTree.tsx` and `CompletionConfirmDialog.tsx` untouched.
- TypeScript build clean.

No new files, no backend work, no a11y/mobile passes.
