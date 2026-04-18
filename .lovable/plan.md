
## Plan

### File 1: `src/pages/SignUp.tsx`
Inside the existing `useEffect`, after the `email` param read, add an `invite` param read. If present and non-empty, store it in `sessionStorage` under `pending_invite_code` (uppercased + trimmed). No form pre-fill. No other changes.

### File 2: `src/pages/Onboarding.tsx` (full replace)
- On mount: check `sessionStorage.getItem('pending_invite_code')`. Track `prefilled` flag.
- Keep coach_clients auto-link → `selectAccountType("individual")`.
- If `pending_invite_code` present (and no coach_clients hit), skip the two-card screen and render the invite-code entry screen with the value pre-filled.
- Two-card screen:
  - "On my own" → call `set-account-type` with `{ account_type: "individual" }` → navigate `/demographic-form`.
  - "Company gave me access" → switch to invite-code screen.
- Invite-code screen: text input + Continue button (`Submitting...` while in flight). On Continue: POST `set-account-type` with `{ invite_code: <trimmed uppercased> }`. On 200: remove `pending_invite_code`, toast positive, navigate `/demographic-form`.
- Error mapping by HTTP status / `result.code` per spec (404/P0002, 403/42501, 400 expired, 400 redeemed, fallback).
- Back button: if `prefilled` → `/login`, else returns to two-card screen.
- Keep loading spinner, Brain icon, Card styling, `useToast`, `useNavigate`.

### File 3: `src/pages/admin/AdminUsers.tsx` (full replace)
- Fetch the admin's `organization_id` directly from `users` (matching `useUserProfile` pattern, since the shared hook doesn't expose it and the prompt forbids modifying other files).
- If null → render "Your account is not linked to an organization. Contact support." error state.
- Page heading "Users" + subheading. Two stacked sections inside Cards.
- **React Query** with keys `["admin-departments", orgId]` and `["admin-pending-invitations", orgId]`. Use `as any` casts on `supabase.from("departments")` and `supabase.from("corporate_invitations")` because those tables aren't in the generated types yet.
- **Invite form**: email (required), Department `<Select>` (required) populated from departments query with first item "+ Add department" that opens a Dialog modal; supervisor email (optional); org_level select (optional, with "Not specified" + IC/Manager/Director/VP/C-Suite/Other); "Send invitation" button.
- **Add Department modal**: text input + Cancel/Create. Create calls `supabase.rpc("department_create" as any, { p_organization_id, p_name })`. On success: close, invalidate departments query, auto-select new dept by name, toast "Department created". Disable + show "Creating..." while in flight.
- **Send invitation**: validate, get session token, POST to `${VITE_SUPABASE_URL}/functions/v1/invitation_send` with the spec'd body (department NAME string, account_type "corporate_employee"). Handle responses:
  - 200 + `email_sent: true` → toast with email + code, clear email/supervisor inputs, keep dept + org_level.
  - 200 + `email_sent: false` → persistent inline `Alert` (warning tone, manually dismissable) with the code; clear inputs same as above.
  - 409/`23505` → "An account already exists for that email address."
  - 403/`42501` → "You don't have permission..."
  - 400/`22023` → toast `result.error`.
  - Other → `result.error` or generic fallback.
  - Always invalidate pending-invitations query after any 200.
- **Pending invitations table**: query `corporate_invitations` filtered by `organization_id`, `redeemed_at IS NULL`, `expires_at > now`, ordered by `created_at desc`. Columns: Email | Department | Org Level | Sent on | Expires (formatted via `toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })`). Empty state: "No pending invitations."
- Use shadcn Table, Card, Dialog, Select, Input, Label, Button, Alert components.

### Notes / constraints
- No other files modified (no AppSidebar, App.tsx, hook changes, no migrations/edge functions).
- TS-cast unknown tables (`corporate_invitations`, `departments`) and the `department_create` RPC via `as any` to avoid touching `types.ts`.
- Always send `account_type: "corporate_employee"` in the invitation_send payload; never send that for the redemption flow (which uses `invite_code`).
