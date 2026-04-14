

# Plan: Build General Settings Page in `src/pages/Settings.tsx`

## Summary
Replace the current redirect-only Settings page with a full General Settings page containing Profile, Preferences, Notifications, and Account sections.

## Single file: `src/pages/Settings.tsx`

### Data Loading
- Single `useEffect` fetches `full_name, email, account_type, timezone, date_format, notifications` from `users` table where `id = user.id`
- Loading spinner (Loader2 from lucide) while fetching

### Section 1 — Profile (Card)
- **Full Name**: text input + Save button → updates `users.full_name`
- **Email**: text input + Save button → updates via `supabase.auth.updateUser({ email })` AND `users.email`
- **Change Password**: button → calls `supabase.auth.resetPasswordForEmail(email)`, shows success toast
- **Account Type**: read-only Badge using `formatAccountType()` helper (maps `individual` → "Individual", `coach` → "Coach", `admin` → "Admin", `brainwise_super_admin` → "Super Admin", `corporate_employee` → "Corporate Employee")

### Section 2 — Preferences (Card)
- **Timezone**: Select with ~15 common timezones (America/New_York, America/Chicago, America/Denver, America/Los_Angeles, America/Anchorage, Pacific/Honolulu, Europe/London, Europe/Paris, Europe/Berlin, Asia/Tokyo, Asia/Shanghai, Asia/Kolkata, Australia/Sydney, Pacific/Auckland). Saves to `users.timezone` on change.
- **Date Format**: Select with MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD. Saves to `users.date_format`.
- **Language**: Disabled select showing "English (Default)" with "Coming Soon" badge.

### Section 3 — Notifications (Card)
- Four Switch toggles loaded from `users.notifications` JSONB:
  - `assessment_reminders` → "Assessment Reminders"
  - `coach_messages` → "Coach Messages"
  - `platform_updates` → "Platform Updates"
  - `new_results` → "New Results Available"
- Each toggle saves immediately via full JSONB update to `users.notifications`

### Section 4 — Account (Card)
- "Delete Account" destructive button → AlertDialog with warning text
- On confirm: `supabase.auth.signOut()` + `navigate("/")`

### UX Details
- "Saved" badge appears for 2s after any successful save (state: `savedField` string, cleared via setTimeout)
- Toast on errors
- Uses existing project patterns: shadcn Card, Button, Badge, Switch, Select, AlertDialog, Input, Label
- Imports: useAuth, supabase client, sonner toast, lucide icons (Loader2, User, Globe, Bell, Trash2)

### No other files changed

