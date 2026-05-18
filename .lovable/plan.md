# Mentor Portal — Prompt 1 of 3 (read-only surfaces)

Build read-only roster, reusable nested progress tree, and trainee detail page. No mutations. Uses deployed RPCs `list_mentor_trainees` and `get_user_learning_state`.

## Files to create

### 1. `src/components/mentor/MentorProgressTree.tsx`

Pure presentational component. Props:
```ts
interface MentorProgressTreeProps {
  learningState: any;              // full result of get_user_learning_state
  onItemClick?: (contentItemId: string, itemType: string) => void; // unused this prompt
}
```

**Input shape (flat, must be grouped):**
```
learningState = {
  user_id, viewer_role, generated_at,
  assignments: [...],          // curriculum assignments
  module_assignments: [...],   // standalone module assignments
  certifications: [...],       // cert enrollment records
  mentor_relationships: [...], // ignore
}
```
Each `assignments[i]`: `assignment_id`, `curriculum_id`, `source` ('certification_path' | 'direct_assignment'), `cert_path_id` (uuid or null), `certification_id`, `status_group`, `curriculum: { name, slug, ... }`, `modules: [...]`.
Each module: `module_id`, `name`, `module_completion` (object | null), `items: [...]`.
Each item: `content_item_id`, `item_type`, `title`, `skills_signoff_required`, `completion` (object | null).

**Rendering — four tiers, grouped client-side:**

- **Cert Path tier**: group `assignments` by non-null `cert_path_id`. Label each group using `certifications` array — match on `certification_id`, take `certification_type`, map to friendly label via `CERT_LABELS`. Copy the `CERT_TYPES` / `CERT_LABELS` map from `src/pages/super-admin/CoachManagement.tsx` (lines 37–46) into a small shared spot (either inline at top of this file or `src/lib/certLabels.ts` — pick inline to keep scope tight). Cert-path status = matched `certifications[].status`.
- **Curriculum tier**: one node per assignment under its cert path. Key on `assignment_id` (NOT `curriculum_id` — same curriculum can appear via cert path AND direct assignment). Status = `assignment.status_group`. Display `curriculum.name`.
- **Module tier**: `assignment.modules[]`. Status = `module.module_completion?.status ?? 'not_started'`. Display `module.name`.
- **Content Item tier**: `module.items[]`. Status = `item.completion?.status ?? 'not_started'`. Display `item.title`. Every `completion` access must be null-safe.

**Two standalone sections** (outside any cert-path group):
- "Directly Assigned Curricula" — assignments where `cert_path_id === null`.
- "Directly Assigned Modules" — top-level `module_assignments[]` (standalone modules with no curriculum parent).

**Status → badge color** (semantic Tailwind tokens, no raw colors):
`in_progress` amber · `completed` green · `not_started` muted · `certified` purple · `revision_requested` orange. Reuse the existing `Badge` from `@/components/ui/badge` with a local `statusBadgeClass(status)` helper. If an existing learning-status pill helper turns up while implementing, prefer it.

**"Needs review" flag** (null-safe). Flag an item when:
- `item.completion?.status === 'revision_requested'`, OR
- `item.item_type` is one of `skills_practice`/`live_event`/`written_summary` AND `item.completion?.status === 'in_progress'`.

Items with `completion === null` are never flagged. Render as a small colored dot or "Needs review" pill next to the title.

**Interactivity**: items become buttons that call `onItemClick(content_item_id, item_type)` only when `onItemClick` is provided. Not passed by any caller in this prompt.

**Defensive**: handle missing/empty `assignments`, `module_assignments`, `certifications`, `modules`, `items` without errors. No data fetching here.

### 2. `src/pages/mentor/MentorPortal.tsx`

Standard `AppLayout` route, content inside a `Card` (mirror `CoachManagement.tsx`).

- `useQuery(["list_mentor_trainees"], () => supabase.rpc("list_mentor_trainees"))` — no arguments.
- Result: `{ viewer_role, generated_at, trainees: [{ trainee_user_id, full_name, email, pending_action_count }] }`.
- If `viewer_role === "none"` → friendly empty state ("You have no assigned trainees yet."). Not an error.
- Header summary: total trainees + total pending actions (sum).
- `Input` search — case-insensitive substring on `full_name`/`email`.
- Tabs: "Needs Review" (`pending_action_count > 0`) and "All Trainees". Default to "Needs Review" if any trainee has pending actions, otherwise "All".
- Sort: `pending_action_count` desc, then `full_name` asc.
- `Table` cols: chevron toggle | name (link to `/mentor/trainee/${trainee_user_id}`) | email | pending count `Badge` (amber when > 0, muted when 0).
- Local `expandedIds: Set<string>` state. Chevron toggles expansion; name link navigates and must NOT toggle — `e.stopPropagation()` on the link.
- Lazy fetch on expand: `useQuery(["get_user_learning_state", traineeUserId], () => supabase.rpc("get_user_learning_state", { p_user_id: traineeUserId }), { enabled: expandedIds.has(id) })`. Inline spinner while loading, then `<MentorProgressTree learningState={data} />` (no `onItemClick`).

### 3. `src/pages/mentor/MentorTraineeDetail.tsx`

Route `/mentor/trainee/:traineeId`.

- `const { traineeId } = useParams()`.
- `useQuery(["get_user_learning_state", traineeId], () => supabase.rpc("get_user_learning_state", { p_user_id: traineeId }))` — exact param name `p_user_id`.
- Also `useQuery(["list_mentor_trainees"], ...)` (cache-shared with roster) to look up `full_name` + `email` by matching `trainee_user_id` — these are NOT in `get_user_learning_state`.
- Header shows trainee name + email + overall certification status (read from `learningState.certifications[]` — display each cert's `certification_type` → `CERT_LABELS` + its status).
- Body: `<MentorProgressTree learningState={data} />` (no `onItemClick`).
- Back button to `/mentor` (mirror `CurriculumDetail.tsx` pattern).
- Standard loading/error states.

## Files to edit

### 4. `src/App.tsx`
Add imports next to other learning imports:
```tsx
import MentorPortal from "./pages/mentor/MentorPortal";
import MentorTraineeDetail from "./pages/mentor/MentorTraineeDetail";
```
Inside the Coach route group, after `/coach/certification`:
```tsx
<Route path="/mentor" element={<PractitionerCoachGuard><MentorPortal /></PractitionerCoachGuard>} />
<Route path="/mentor/trainee/:traineeId" element={<PractitionerCoachGuard><MentorTraineeDetail /></PractitionerCoachGuard>} />
```

### 5. `src/components/AppSidebar.tsx`
Add `GraduationCap` to the existing lucide import block. In `coachNav`, after "My Clients" and before "Orders & Invoices":
```ts
{ title: "Mentor Portal", url: "/mentor", icon: GraduationCap },
```
Existing super-admin appended-coach-nav logic surfaces this entry under "Coach Tools".

## Conventions

- `useQuery` from `@tanstack/react-query`, `supabase` from `@/integrations/supabase/client`, shadcn from `@/components/ui/*`.
- User-facing copy: "trainee" / "learner", never "coach".
- No mutations, no `localStorage`/`sessionStorage`, no new RPCs/migrations.
- Semantic Tailwind tokens only.
