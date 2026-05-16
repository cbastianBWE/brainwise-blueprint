# Group Z — Cert Path Detail Page

## Files

### 1. NEW `src/lib/learningStatus.ts`
Export `enrolledStatusToCompletionStatus(status?: string | null): CompletionStatus`. Maps `"completed" | "certified" → "completed"`, `"in_progress" → "in_progress"`, else `null`. Import `CompletionStatus` from `@/components/tile/tileVariants`.

### 2. EDIT `src/components/resources/MyLearningTab.tsx`
Remove the local `enrolledStatusToCompletionStatus` definition and import it from `@/lib/learningStatus`. Pure refactor — no behavior change.

### 3. NEW `src/pages/learning/CertPathDetail.tsx`
New trainee-facing page. Structure top to bottom:

- **Back button** → `navigate("/resources")`.
- **Hero** (320 / 240 / 180 px responsive). Background: resolved `thumbnail_asset_id` URL or navy gradient fallback. Dark gradient overlay. Inside: instrument badges strip (from `cert_instrument_ids` using `INSTRUMENT_BADGE_BG` / `INSTRUMENT_BADGE_LABEL`), cert path name (`text-3xl md:text-4xl font-bold text-white`), description (`text-sm md:text-base text-white/85 line-clamp-2`), and bottom-right "Certified" pill (plum + `Award` icon) when `user_certification.status === 'certified'`.
- **Action strip** (white bg, border-b). Single primary CTA, branched:
  - `certified` → outline "Review" → `/learning/curriculum/${curricula[0].curriculum_id}`.
  - has `user_certification` + `recommended_next` → orange "Resume" → `/learning/curriculum/${recommended_next.curriculum_id}` (inline comment: TODO Group W — route to content item viewer using `recommended_next.content_item_id` once viewers ship).
  - no `user_certification` → orange "Enroll" → `handleEnroll`.
  - has `user_certification`, no `recommended_next`, not certified → orange "Start" → first curriculum.
  - Orange style: `bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white`.
- **At-a-glance metadata chips**: curricula count, total minutes sum (only if >0), cert type label (slug → Title Case), delivery mode chip. Chip class: `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground bg-muted border border-border`.
- **Dimension competencies** (only if `dimension_competencies.length > 0`). Header "Builds competency in". Grid responsive 1/2/3-5 cols. Each card `rounded-lg border bg-card p-4` with `border-l-4` accent in dimension color (`dimensionColorFor`). Shows name + optional short description, score (`text-2xl font-bold`) and band (title-cased) when `user_mean != null`, else muted "Take your {instrument label} assessment to see your score". Below grid, if any dim has null user_mean: link "Take your assessments to see your full competency picture" → `/dashboard`.
- **Curricula grid** (only if `curricula.length > 0`). Header "Curricula". `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`. Each uses existing `Tile` with variant `"curriculum"`, name, summary=description, thumbnailUrl from resolved map, status via `enrolledStatusToCompletionStatus(curriculum.user_assignment?.status)`, required from `is_required`, `estimatedMinutes`, `detailPageMode`, onClick → `/learning/curriculum/${id}`. Empty state if zero curricula.
- **Loading**: centered `Loader2` spinner, min-h 30vh. **Error**: card `bg-card border-destructive/30 text-destructive` with message + Back.

Data:
- `useQuery(["get_cert_path_detail", certPathId, userId], rpc get_cert_path_detail({ p_certification_path_id, p_user_id }))`.
- Second `useQuery` resolves thumbnails: dedupe `certification_path.thumbnail_asset_id` + every `curricula[].thumbnail_asset_id`, call `resolveThumbnailUrls`.

Constants in file: `DIMENSION_COLOR` map (PTP DIM-PTP-01..05, NAI DIM-NAI-01..05), `INSTRUMENT_FALLBACK_COLOR` map, helper `dimensionColorFor(dimensionId, instrumentId)`.

Enrollment wiring (mirrors MyLearningTab):
- Imports: `useToast`, `useQueryClient`, `PaidEnrollmentNudgeModal`.
- State: `paidNudgeState { open, entityName, priceCents }`.
- `handleEnroll` calls `supabase.rpc("self_enroll_in_certification_path", { p_certification_path_id })`. Error mapping for `not_self_enrollable`, `already_assigned_active`, `already_has_active_certification`, `not_published`. On `payment_required` → open modal with price. On success → toast "Enrolled!" + invalidate `["get_cert_path_detail", certPathId]`, `["get_user_learning_state"]`, `["list_available_learning"]`.
- Render `<PaidEnrollmentNudgeModal …>` at end of JSX.

### 4. EDIT `src/App.tsx`
- Add import: `import CertPathDetail from "./pages/learning/CertPathDetail";` (after `ResourceReader` import).
- Add route inside the AppLayout-protected block, after `/resources/:resourceId`:
  `<Route path="/learning/cert-path/:certPathId" element={<CertPathDetail />} />`.
- No SubscriptionGate wrapper.

## Out of scope
- Curriculum/module detail pages and content item viewers.
- Changes to `Tile`, RPC, or any gamification/share features.
- Sidebar TOC.

## Acceptance
All 14 acceptance criteria from the request, including PTP-Coach render, certified pill, dimension cards with locked colors, curricula grid navigation, mobile breakpoints, no new color tokens, and full enroll → paid-modal-or-toast flow with page re-fetch.