## Skills-practice trainee text field

Frontend only. Backend (columns, `save_skills_trainee_input` RPC, `upsert_content_item` extension) is already live.

### Part A — `src/pages/super-admin/editors/ContentItemEditor.tsx`

1. **State** (after line 91, with other skills_practice state): add `skillsTraineeInputEnabled` (bool, from `initial?.skills_trainee_input_enabled`) and `skillsTraineeInputLabel` (string, from `initial?.skills_trainee_input_label`).
2. **Dirty check** (lines 244–246): add comparisons for both new fields; add them to the dependency array at line 257.
3. **Payload** (`buildTypeConfig`, `case "skills_practice"` at lines 301–306): add `skills_trainee_input_enabled` and `skills_trainee_input_label` (trimmed or null).
4. **JSX** (inside the `itemType === "skills_practice"` block, after the "Optional attachment allowed" row): add a Switch row labeled "Trainee text response field"; when on, render an Input for the prompt label with placeholder "e.g. List the actors you debriefed" and a muted helper line explaining it's shown to the trainee and visible to the mentor.

### Part B — `src/components/learning/viewers/SkillsPracticeViewer.tsx`

1. **Derived flags** (near `allowAttachment`/`actorRequired`): `traineeInputEnabled`, `traineeInputLabel` (default "Your response"), `savedTraineeInput`.
2. **Local state** (near `uploading`): `traineeInputDraft` (seeded from completion), `savingTraineeInput`.
3. **Handler** `handleSaveTraineeInput`: calls `supabase.rpc("save_skills_trainee_input", { p_content_item_id, p_text })`; maps `item_already_completed` and `trainee_input_not_enabled_for_this_item` to friendly toasts; on success toasts "Response saved" and invalidates the `["content-item-viewer", contentItem.id]` query.
4. **JSX**: new bordered card (`rounded-lg border bg-card p-5 space-y-3`, matching "Supporting evidence") placed after the Practice scenario card and before the Revision block. Render only when `traineeInputEnabled`.
   - Trainee (`isSelf`) and not completed: heading = `traineeInputLabel`, Textarea bound to draft, "Save response" button (disabled while saving).
   - Trainee + completed: show saved text read-only.
   - Mentor / super_admin: read-only saved text under the label; muted "No response provided yet." when empty.

### Acceptance

- Editor: toggle reveals label input; values persist via `upsert_content_item`; reopen shows them.
- Viewer trainee: prompt + textbox + save toast; becomes read-only after completion.
- Viewer mentor: reads trainee response (or empty-state) read-only.
- When disabled: no new UI in either surface.
- No migrations/RPCs created.
