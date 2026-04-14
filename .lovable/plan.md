

# Plan: Add Coach Management Page for Super Admins

## Overview
Three files changed: sidebar nav item, route registration, and a new page with invite/pending/active coach management.

## File 1: `src/components/AppSidebar.tsx`
**Line 68**: Insert after Platform Health line:
```tsx
{ title: "Coach Management", url: "/super-admin/coaches", icon: Users },
```

## File 2: `src/App.tsx`
- Add import for `CoachManagement` from `./pages/super-admin/CoachManagement`
- Add route after line 102 (after PlatformHealth route):
```tsx
<Route path="/super-admin/coaches" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CoachManagement /></SuperAdminSessionProvider></RoleGuard>} />
```

## File 3: `src/pages/super-admin/CoachManagement.tsx` (new)
Full page with three card sections:

### Section 1 — Invite Coaches
Card with `Tabs` component (three tabs):
- **Single Invite**: Form fields (first_name, last_name, email, certification_type dropdown). Calls `supabase.functions.invoke('invite-coach', { body })`. Success toast.
- **Bulk Invite**: Dynamic rows with Add Another button. Send All button loops through rows calling invite-coach. Summary toast "X sent, Y failed".
- **Upload Excel**: File input for .xlsx. Uses `xlsx` package (SheetJS) to parse. Preview table. Send button. Download Template button generates blank .xlsx with 4 headers.

### Section 2 — Pending Invitations
Query `coach_invitations` where `status = 'pending'`. Table with Name, Email, Certification, Invited Date, Expires, Actions (Resend / Cancel). Resend re-invokes invite-coach. Cancel updates status to 'expired'.

### Section 3 — Active Coaches
Query `users` where `account_type = 'coach'`. For each coach, also fetch `coach_certifications`. Table with Name, Email, Certifications (badges), Status. "Mark Certified" button opens a Dialog to select certification type, then updates `coach_certifications` setting `status = 'certified'`, `certified_at = now()`, `certified_by = auth.uid()`.

### Technical details
- Uses existing UI components: Card, Tabs, Table, Button, Select, Dialog, Badge, Input, Label
- `CERT_LABELS` constant maps internal keys to display names (same as SignUp.tsx)
- `xlsx` package needed — will add via import (already available or will be installed)
- Pending invitations RLS already allows super admin full access
- Users table allows super admin read access
- Coach certifications table allows super admin full access (read + write)
- No database migrations needed

