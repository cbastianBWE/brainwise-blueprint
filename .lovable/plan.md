## User Details modal with free-attempts grant

Frontend only. Backend RPC `grant_additional_free_attempts` is live.

### New: `src/components/super-admin/UserDetailsModal.tsx`

Props: `open`, `onOpenChange`, `target` (`{ user_id, email, full_name, account_type, organization_name } | null`).

Dialog with `DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"`, structured in sections for extensibility.

**Section 1 — User information (always):** read-only display of full_name, email, formatted account_type, organization_name.

**Section 2 — Free assessment attempts (only when `account_type === "coach"`):**

- `useQuery` keyed `["coach-certifications", target?.user_id]`, enabled only when modal is open and target is a coach. Queries `coach_certifications` (`id, certification_type, status, free_assessment_uses, free_uses_expire_at`) filtered by `user_id`, ordered by `created_at` asc.
- Empty state: "This coach has no certifications."
- Otherwise list each certification: type, status, and readable rendering of `free_assessment_uses` (mapping instrument codes INST-001 PTP / INST-002 NAI / INST-003 AIRSA / INST-004 HSS to labels, e.g. "PTP: 3, NAI: 0").
- Grant control:
  - Select certification (from list)
  - Select instrument (INST-001..INST-004 with readable labels)
  - Number Input `count` (min 1)
  - Textarea `reason`
  - "Grant attempts" button disabled until certification, instrument, count ≥ 1, and `reason.trim().length >= 10`.
  - Helper line under control: action requires MFA and is audit-logged.
- Submit: `supabase.rpc("grant_additional_free_attempts", { p_certification_id, p_instrument_id, p_count, p_reason })`.
- Error code → toast mapping: `reason_required_min_chars`, `count_must_be_positive`, `invalid_instrument_id`, `certification_not_found`, fallback `"Could not grant attempts: " + error.message`.
- Success: toast `"Granted {count} attempt(s)."`, reset count + reason, invalidate `["coach-certifications", target.user_id]`.

### Edit: `src/pages/super-admin/Users.tsx`

- Add `const [detailsTarget, setDetailsTarget] = useState<SearchRow | null>(null);`.
- In the kebab `DropdownMenuContent`, add `<DropdownMenuItem onSelect={() => setDetailsTarget(row)}>View user details</DropdownMenuItem>` directly under the (enabled) Impersonate item — shown for all users.
- Near the existing `JustificationModal`, render `<UserDetailsModal open={!!detailsTarget} onOpenChange={(o) => !o && setDetailsTarget(null)} target={detailsTarget} />`.
- Do not touch Impersonate, the justification modal, or disabled "coming soon" items.

### Acceptance

- "View user details" appears on every kebab row and opens the modal.
- Basic info always shown; free-attempts section only for coaches.
- Granting calls the RPC and refreshes the displayed pool on success.
- Grant button gated by all four inputs (cert, instrument, count ≥ 1, reason ≥ 10 chars).
- Empty-state shown for coach with no certifications.
- Modal scrolls on small viewports.
- No migrations or RPCs created.
