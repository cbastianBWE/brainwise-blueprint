Phase 11.C cycle 2a — wire four single-row justified actions through a new shared `JustifiedActionDialog` primitive, plus the cycle 1.5 patch for the full-page member route. Backend is already shipped (15-arg `search_impersonation_targets`, all seven action RPCs verified live).

## Part 1 — Cycle 1.5 patch (Members.tsx)

Two surgical edits:
- Main search query (~line 158): add `p_specific_user_id: null` as the final arg.
- `directMember` query (~lines 200–225): rewrite `queryFn` to pass all 15 named params with `p_specific_user_id: routeUserId` and return `arr[0] ?? null`. Removes the client-side `.find()` and the alphabetical-first fallthrough.

## Part 2 — New shared primitive

**New file:** `src/components/justified-action/JustifiedActionDialog.tsx` (≤220 lines)

Action-agnostic dialog. Caller owns the mutation (per §121); the dialog only owns the justification UX.

Exports:
- `JustifiedActionResult` — `{ changed: boolean; note?: string }`
- `JustifiedActionDialogProps` — `{ open, onOpenChange, title, description?, onSubmit, mapError?, successTitle, noopTitle?, confirmLabel? }`
- default export `JustifiedActionDialog`

Behavior:
- shadcn `Dialog` shell with title, optional description, labeled `Textarea` (rows=3), `{trimmed.length}/10 minimum characters` counter, inline error region, `[Cancel]` + `[Confirm]` footer (Confirm shows `Loader2` while submitting).
- Confirm disabled when `reason.trim().length < 10` OR submitting. Cancel disabled while submitting.
- `handleOpenChange` blocks close while submitting.
- `useEffect` on `open` resets `reason`, `submitting`, `errorMessage` when closing.
- `handleConfirm`: calls `onSubmit(reason.trim())`. On success: toast with `successTitle` if `changed`, else `noopTitle ?? "No change made"` with `note` as description. On throw: try built-in `defaultMapError` first, then caller `mapError`, fall back to raw message.
- `defaultMapError` covers `reason_required_min_chars`, `authentication_required`, `target_user_not_found`.
- NO internal switch on action type.

## Part 3 — Wire four single-row actions

### 3A — Mentor toggle (`MemberDrawer.tsx`)
- Remove `disabled` + Tooltip wrapper on header Switch; `onCheckedChange` opens `mentorDialogOpen`.
- New state: `mentorDialogOpen`, `queryClient = useQueryClient()`.
- Compute `nextIsMentor = !member.is_mentor`.
- Render `JustifiedActionDialog` outside `SheetContent` calling `set_mentor_role(p_user_id, p_is_mentor: nextIsMentor, p_reason)`. Map result to `{changed, note}` — synthesize note for `changed=false` ("This user is already a mentor." / "…not a mentor."). Invalidate `["members-search"]`. Success title flips by direction.
- `useEffect` on `mentorDialogOpen` → `setHasUnsavedChanges(mentorDialogOpen)`.

### 3B — Mark actions (`MemberDrawerLearning.tsx`)
- New prop `setHasUnsavedChanges: (v: boolean) => void`.
- Replace toast-firing `onMark` with `setMarkTarget(t)`. Add `markTarget` state and `queryClient`.
- `useEffect` on `markTarget` → propagates non-null to parent's `setHasUnsavedChanges`.
- Render `JustifiedActionDialog` when `markTarget` non-null. `onSubmit` branches on `markTarget.tier`:
  - `cert_path` → `grant_certification` / `revoke_certification` with `p_certification_id`
  - `curriculum` → `set_curriculum_completion` with **`p_assignment_id`** (not curriculum_id)
  - `module` → `set_module_completion` with `p_module_id`
  - `content_item` → `set_content_item_completion` with `p_content_item_id`
- Invalidate `["get_user_learning_state", userId]`.
- `mapError` covers `manual_incomplete_blocked_certified_cert_path`, `content_item_not_found_or_archived`, `module_not_found_or_archived`, `curriculum_assignment_not_found`, `curriculum_assignment_unassigned`, `certification_already_granted`, `certification_already_revoked`.
- Local `getActionLabels(t)` helper builds title/description/successTitle per tier and direction.
- `AdminLearningTree` props are NOT extended.

### 3C — Grant attempts (`MemberDrawerCoach.tsx`)
- New prop `setHasUnsavedChanges`.
- Remove `disabled` from cert Select, instrument Select, count Input.
- **Remove inline reason Textarea entirely** (reason lives in dialog now).
- Remove Tooltip wrapper around Grant button; gate via `canOpenDialog = !!cert && !!instrument && Number.isFinite(countNum) && countNum >= 1`.
- Click opens `grantDialogOpen`. Dialog `onSubmit` calls `grant_additional_free_attempts` with `p_instrument_id` as the **text code** (`PTP`/`NAI`/`AIRSA`/`HSS`). Invalidate `["coach-certifications", userId]`. Reset `count`/`selectedInstrument` after success.
- `mapError` handles `count_must_be_positive`, `invalid_instrument_id`, `certification_not_found`.
- `useEffect` on `grantDialogOpen` propagates to parent.
- Caption reworded from "requires MFA and is audit-logged" → "is audit-logged".

### 3D — Prop drilling (`MemberDrawer.tsx`)
Pass `setHasUnsavedChanges` to `MemberDrawerLearning` and `MemberDrawerCoach`. Mentor toggle uses its own effect directly. `hasUnsavedChanges` setter from cycle 1 is repurposed (lift to allow setter access).

## Hard guardrails (no scope creep)

- Don't migrate `JustificationModal`; per-row Impersonate stays on it.
- Don't touch bulk actions, legacy LearningAdmin/Users/UserDetailsModal/CompletionConfirmDialog/CompletionControlTab.
- Don't extend `AdminLearningTree` props or move the file.
- Don't add filter chips above the learning tree.
- Don't call any `_bulk` RPC or `get_user_completion_export`.
- Don't touch the four disabled overflow menu items.
- Don't internally switch on action type inside the dialog.

## File set

- **New:** `src/components/justified-action/JustifiedActionDialog.tsx`
- **Edit:** `src/pages/super-admin/Members.tsx`
- **Edit:** `src/components/members/MemberDrawer.tsx`
- **Edit:** `src/components/members/MemberDrawerLearning.tsx`
- **Edit:** `src/components/members/MemberDrawerCoach.tsx`

## Verification

Run the verification grep block from the prompt after build; fix any FAIL before shipping. Key items: 15-arg RPC calls; dialog exports + action-agnostic; curriculum branch uses `p_assignment_id`; instrument arg is text code; reason Textarea removed from coach tab; invalidations on the right query keys; no forbidden file touches.
