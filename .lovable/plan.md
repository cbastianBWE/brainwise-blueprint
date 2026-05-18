## Mentor Portal — Prompt 2: Review drawer, panels, mentor upload

Build write-action surfaces for mentors. No backend changes — all RPCs and the `skills-practice-attachment-upload` Edge Function already exist.

### New files

**1. `src/components/mentor/ReviewDrawer.tsx`**
- Right-side shadcn `Sheet`. Props: `{ open, onOpenChange, contentItemId, itemType, traineeId, onActionComplete }`.
- Dispatches by `itemType` to the matching panel; unknown types render a read-only "no mentor review action" message.
- Does no fetching itself. Sheet header shows item type label; body renders the panel.

**2. `src/components/mentor/SkillsPracticeReviewPanel.tsx`**
- `useQuery(["get_content_item_for_viewer", contentItemId, traineeId])` → `supabase.rpc("get_content_item_for_viewer", { p_content_item_id, p_user_id: traineeId })`.
- Renders: title, description (scenario), trainee attachment (if `completion.skills_attachment_url` — fetched via Edge Function `action: "read"`, `role: "trainee"`), attempt history from `skills_iterations` newest-first (each as "Attempt N" with trainee/mentor sign-off times, revision comment, outcome).
- Mentor actions:
  - **Sign Off** → `rpc("mark_skills_practice_signoff", { p_content_item_id, p_signoff_type: "mentor", p_trainee_user_id: traineeId })`. Hidden when `completion.skills_mentor_signed_off === true` (show signed-off state instead).
  - **Request Revision** → reveal `Textarea` (required, non-empty), submit → `rpc("request_skills_revision", { p_content_item_id, p_trainee_user_id: traineeId, p_revision_comment })`.
- **Mentor attachment upload** — mirrors `SkillsPracticeViewer.tsx` (lines 127–206) three-step flow exactly, with `role: "mentor"` and `trainee_user_id: traineeId` added to every Edge Function body:
  1. `invoke("skills-practice-attachment-upload", { body: { action: "request", content_item_id, role: "mentor", trainee_user_id, mime_type, size_bytes, original_filename } })`
  2. `supabase.storage.from(bucket).uploadToSignedUrl(storage_path, upload_token, file)`
  3. `invoke(..., { body: { action: "finalize", content_item_id, role: "mentor", trainee_user_id, storage_path } })`
- Display existing mentor attachment if `completion.skills_mentor_attachment_url` set: `invoke(..., { body: { action: "read", content_item_id, role: "mentor", trainee_user_id } })`; render `<img>` if MIME starts with `image/`, else "Open attachment" link.
- Same client limits: `MAX_BYTES = 200 * 1024 * 1024`, identical `ALLOWED_MIME` set as the trainee viewer.

**3. `src/components/mentor/LiveEventReviewPanel.tsx`**
- Loads same RPC. Displays title, description, `content_item.event_scheduled_at`, and current `completion.live_event_attendance_status`.
- Three buttons: Registered, Attended, Missed → `rpc("mark_live_event_attendance", { p_content_item_id, p_trainee_user_id, p_attendance_status })`. Current status visually highlighted.

**4. `src/components/mentor/WrittenSummaryReviewPanel.tsx`**
- Loads same RPC, reads `written_submission`.
- If null → "The trainee has not submitted this written summary yet."
- Otherwise show `content` and `char_count`.
- If `review_decision` set → read-only display of decision + `reviewer_comments`.
- If null → Approve (optional comment) and Request Revision (required `Textarea`) → both call `rpc("mentor_review_submission", { p_submission_id, p_decision, p_comments })`.

### Edited files

**5. `src/pages/mentor/MentorPortal.tsx`**
- Add state `{ contentItemId, itemType, traineeId } | null` for open drawer; `useQueryClient()`.
- Pass `onItemClick={(itemId, itemType) => setOpen({ contentItemId: itemId, itemType, traineeId: t.trainee_user_id })}` to each `<MentorProgressTree>` inside its expanded `TraineeRow`.
- Render one `<ReviewDrawer>` at page level controlled by the state.
- `onActionComplete` invalidates `["get_content_item_for_viewer", contentItemId, traineeId]`, `["get_user_learning_state", traineeId]`, `["list_mentor_trainees"]`.

**6. `src/pages/mentor/MentorTraineeDetail.tsx`**
- Same drawer state + `useQueryClient()`. Pass `onItemClick` to `<MentorProgressTree>` using route param `traineeId`. Render one `<ReviewDrawer>`. Same three invalidations on `onActionComplete`.

### Common panel behavior
- Each action button: loading spinner + disabled while RPC/upload in flight.
- Errors → `useToast` destructive toast with message; never crash.
- Success → success toast, then `onActionComplete()`. Drawer stays open and shows refreshed state.
- All access to `completion`, `written_submission`, and `skills_iterations` entries is null-guarded.

### Constraints
- `useQuery`/`useQueryClient` from `@tanstack/react-query`; `supabase` from `@/integrations/supabase/client`; shadcn from `@/components/ui/*` (Sheet, Textarea, Button, Badge).
- Copy uses "trainee"/"learner", never "coach".
- Match styling already in `MentorProgressTree.tsx` (status-badge color map, `cn` helper).
- No `localStorage`/`sessionStorage`. No new backend, RPCs, migrations, or Edge Functions.
- `MentorProgressTree.tsx` is not modified — it already plumbs `onItemClick`.

### Verification
After implementation, confirm: build passes; drawer opens from both pages; skills sign-off, revision, and mentor upload work; live event attendance updates; written summary approve/revision works; roster pending count refreshes after each action; non-reviewable item types render the read-only message.
