
# Session 83 P1 — Completion Control tab (build plan, ready to implement)

Plan was previously approved; the system kept me in plan mode so I'm re-issuing the full build plan with the two adjustments folded in. Hit "Implement plan" to ship.

## Files

**Edit**
- `src/pages/super-admin/LearningAdmin.tsx`
  - Delete the inline `SearchRow` interface, `PAGE_SIZE`, `formatAccountType`, `accountTypeBadgeVariant` (lines ~172–207).
  - Add `import { SearchRow, PAGE_SIZE, formatAccountType, accountTypeBadgeVariant } from "@/components/learning-admin/learnerSearchShared";`
  - Add the 4th tab: `<TabsTrigger value="completion-control">Completion Control</TabsTrigger>` and matching `<TabsContent value="completion-control" className="pt-4"><CompletionControlTab /></TabsContent>`.
  - Import `CompletionControlTab` from the new file.
  - No other change. MentorRoleTab keeps working — it just imports the helpers from the new module instead of using the module-local copies.

**Create**
- `src/components/learning-admin/learnerSearchShared.ts` — `SearchRow`, `PAGE_SIZE`, `formatAccountType`, `accountTypeBadgeVariant`. Verbatim lift.
- `src/components/learning-admin/CompletionControlTab.tsx` — page-level container. Owns: learner search (same shape as `MentorRoleTab`), selected-learner state, the impersonation banner, the active `MarkTarget` state, renders `<AdminLearningTree>` and `<CompletionConfirmDialog>`.
- `src/components/learning-admin/AdminLearningTree.tsx` — fetches `get_user_learning_state(p_user_id)` keyed by `["get_user_learning_state", userId]`, renders 4 tiers (cert path → curriculum → module → content item) with status pills. Each row carries two distinct controls: a chevron expander (content items only, to inspect artifacts) and a contextually-correct "Mark complete/incomplete" / "Grant/Revoke" button. Mark buttons are disabled when `isImpersonating` is true (passed in from the parent). Cert paths with `status === 'revoked'` show the badge only — no action button. Calls `onMark(MarkTarget)` upward; never opens its own dialog.
- `src/components/learning-admin/ContentItemArtifactPanel.tsx` — the lazy artifact inspector that renders inside an expanded content-item row. Switches on `item_type`. Per the spec:
  - **video** — read straight from the tree payload (`completion.video_watch_pct`, `video_last_position_seconds`, threshold from `video_completion_threshold_pct`). No extra fetch.
  - **written_summary / external_link / live_event** — one call to `get_content_item_for_viewer(content_item_id, user_id)`. Render `written_submission` / `external_link_confirmed_at` + `external_link_reflection_text` / `live_event_attendance_status` accordingly.
  - **skills_practice** — same RPC for completion + iterations; attachments via `supabase.functions.invoke("skills-practice-attachment-upload", { body: { action:"read", content_item_id, role:"mentor", trainee_user_id: userId }})` (super-admin authorized by the RPC inside that function).
  - **quiz** — list attempts via `supabase.from("quiz_attempts").select("id,attempt_number,score_pct,passed,pass_threshold_pct,submitted_at,started_at").eq("user_id", userId).eq("content_item_id", id).order("attempt_number", { ascending: false })`. Attempts render collapsed. Expanding one fetches detail via `supabase.rpc("get_quiz_attempt_results", { p_attempt_id })`, cached by attempt id. If `reveal_correctness === false` on the result, render the learner's answers but show the literal "Correct answers hidden by this quiz's reveal settings" instead of the correctness column.
  - **file_upload** — `supabase.functions.invoke("content-item-file-upload", { body: { action:"read", content_item_id, target_user_id: userId }})` → `{ signed_url, filename }`. If `error.code === "no_file"` (HTTP 404), render "The learner has not uploaded a file." Any other error → toast, do not silently empty-state. Inline `<img>` for `.png/.jpg/.jpeg/.gif/.webp` (matched against the returned `filename`); otherwise a download link labeled with the filename.
  - **lesson_blocks** — `supabase.from("lesson_block_progress").select("block_id,attempt_number,status,started_at,completed_at,completion_data").eq("user_id", userId).eq("content_item_id", id).order("block_id")`. Plain table: block id (truncated), attempt #, status pill, completed_at. No per-block-type renderer.
  - Empty-completion rule (any type): if there's no completion row for the item, render "The learner has not started this item."
- `src/components/learning-admin/CompletionConfirmDialog.tsx` — same shape as the MentorRoleTab dialog. Title + tier + entity name + side-effect line + 10-char-min `Textarea` + Confirm/Cancel. Calls the correct RPC per tier:
  - `content_item` → `supabase.rpc("set_content_item_completion" as never, { p_user_id, p_content_item_id, p_complete, p_reason } as never)`
  - `module` → `supabase.rpc("set_module_completion" as never, { p_user_id, p_module_id, p_complete, p_reason } as never)`
  - `curriculum` → `supabase.rpc("set_curriculum_completion" as never, { p_assignment_id, p_complete, p_reason } as never)`
  - `cert_path` → `supabase.rpc(complete ? "grant_certification" : "revoke_certification", { p_certification_id, p_reason })` (no cast — both in generated types)
  - On success: toast + `qc.invalidateQueries({ queryKey: ["get_user_learning_state", userId] })` + close. On error: map `error.message` prefix per the Part A table; `manual_incomplete_blocked_certified_cert_path` → "This learner is certified on a path that includes this item. Demote the certification first, then retry." (never the raw string).

**Not touched** — every file in `src/components/mentor/` and `src/pages/mentor/`. Confirmed.

## Tree field mapping (verified against `get_user_learning_state` source)

- cert path label/status: `assignments[].cert_path_id` groups assignments; `certification_id` joins into `certifications[]` to read `.status` (`in_progress` / `certified` / `revoked`) and `.certification_type`.
- curriculum: `assignment.assignment_status` (`active` / `completed`) drives the badge and the action direction. The action keys `set_curriculum_completion` by `assignment.assignment_id`.
- module: `module.module_completion.status` (`not_started` / `in_progress` / `completed`). RPC keyed by `(userId, module.module_id)`.
- content item: `item.completion.status` (incl. `submitted_for_review`, `revision_requested`). RPC keyed by `(userId, item.content_item_id)`.
- Also iterates `module_assignments[]` (standalone modules) — those expose only the module + content-item actions.

## Impersonation gating (adjustment 2)

Uses the existing `useImpersonation()` hook from `src/contexts/ImpersonationProvider.tsx`. When `isImpersonating === true`:
1. Render an `<Alert variant="destructive">` (or styled equivalent) at the top of the tab: "You are in an impersonation session. Exit impersonation before marking completion — completion actions are blocked during impersonation."
2. Pass `disabled={isImpersonating}` to every mark button across the tree. Expanders and artifact fetches remain enabled (read-only inspection during impersonation is fine).

The three `set_*_completion` RPCs and `grant/revoke_certification` are all `denylist_during_impersonation=true`, so this disables the only mutating affordances.

## Risks / final notes

- The shared-module lift removes the inline definitions from `LearningAdmin.tsx` in the same edit that adds the import — no duplicate-symbol window. Both `MentorRoleTab` and the new tab end up importing from one file.
- `get_user_learning_state` returns only published modules. That's a known constraint; admin can only act on what the tree shows. Called out so it's not a surprise.
- Tree may be large for learners on multiple cert paths. Cert paths render collapsed by default; expanding reveals curricula/modules/items.
- One `invalidateQueries(["get_user_learning_state", userId])` after any mark refreshes every cascaded tier in one shot (cert path can flip via the existing rollup when a curriculum is marked complete).
- No `localStorage` or `sessionStorage` used anywhere in the new code.
- Part B is live (v2 verified, `verify_jwt:false` preserved, `target_user_id` honored for super admin). `file_upload` view is built as a real view, not a stub.
