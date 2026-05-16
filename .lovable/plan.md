## Group Z — Curriculum Detail Page

Ship `/learning/curriculum/:curriculumId` mirroring `CertPathDetail.tsx`. Two changes only.

### 1. NEW: `src/pages/learning/CurriculumDetail.tsx`

Structure mirrors CertPathDetail (same imports, query pattern, loader, error card, modal, helpers). Differences:

- Local `titleCaseSlug` helper (duplicate, no extraction).
- Back button → `navigate(-1)` (no fixed `/resources`).
- RPC: `get_curriculum_detail` with `p_curriculum_id`, `p_user_id`. Data shape: `{ curriculum, user_assignment, recommended_next, modules[], parent_cert_paths[] }`.
- Thumbnail asset IDs: curriculum + each module.
- Hero (180/240/320, dark overlay, navy fallback gradient):
  - No instrument badges (top-left empty).
  - Bottom-left: parent pill `Part of {parent_cert_paths[0].name}` linking to `/learning/cert-path/${id}`; append ` +{n-1} more` if multiple. Pill class: `inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white bg-white/15 backdrop-blur-sm`.
  - Bottom-right: "Completed" pill (forest bg, `CircleCheck` icon) when `user_assignment.status === 'completed'`.
  - Title + description: same classes as CertPathDetail.
- Action strip (same layout/colors as CertPathDetail). State branches:
  - `completed` → outline "Review" → `/learning/module/${modules[0].module_id}`; label "You've completed this curriculum."
  - enrolled + `recommended_next` → orange "Resume" → `/learning/module/${recommended_next.module_id}` with TODO Group W comment for content item viewer; label "Continue your progress."
  - not enrolled + `is_self_enrollable === false` + has parent → orange "Enroll in {parent.name}" → parent cert path route; label "This curriculum is part of a certification path."
  - not enrolled + `is_self_enrollable === false` + no parent → muted notice "This curriculum is not currently open for enrollment." (no button).
  - not enrolled (self-enrollable) → orange "Enroll" → `handleEnroll`; label "Ready to begin?"
  - enrolled, no `recommended_next`, not completed → orange "Start" → `/learning/module/${modules[0].module_id}`; label "Continue your progress."
- Metadata chips (same class as CertPathDetail):
  - `{modules.length} modules`
  - total minutes: `curriculum.estimated_minutes ?? sum(modules.estimated_minutes)`, only when > 0.
  - mode chip: `titleCaseSlug(curriculum.mode)`.
  - Required/Optional chip only when `parent_cert_paths.length > 0`: orange "Required" pill if `parent_cert_paths[0].is_required`, else outlined "Optional".
- Modules section: header "Modules"; grid `grid-cols-1 sm:2 lg:3 xl:4 gap-4`. Each `<Tile variant="module">` with `name`, `summary=description`, `thumbnailUrl`, `status=enrolledStatusToCompletionStatus(module.module_completion?.status)`, `required`, `estimatedMinutes`, `prerequisiteName=prereqLabel(...)`, `detailPageMode`, `onClick` → `/learning/module/${module_id}`. `prereqLabel` looks up `prerequisite_module_id` in the modules array; returns name or null. Empty state: dashed-border card "This curriculum has no modules yet."
- `handleEnroll`: calls `self_enroll_in_curriculum` RPC; error map handles `not_self_enrollable`, `already_assigned_active`, `is_not_standalone`, `not_published`; `payment_required` → opens `PaidEnrollmentNudgeModal`; success → toast + invalidate `["get_curriculum_detail", curriculumId]`, `["get_user_learning_state"]`, `["list_available_learning"]`.
- Render `<PaidEnrollmentNudgeModal>` at end of JSX.

### 2. EDIT: `src/App.tsx`

- Add import after CertPathDetail import: `import CurriculumDetail from "./pages/learning/CurriculumDetail";`
- Add route after `/learning/cert-path/:certPathId` line: `<Route path="/learning/curriculum/:curriculumId" element={<CurriculumDetail />} />`. No SubscriptionGate.

### Out of scope

Module detail page, content item viewers, Tile/RPC changes, CertPathDetail edits, shared helper extraction, gamification.
