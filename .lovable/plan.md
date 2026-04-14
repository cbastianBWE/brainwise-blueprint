

# Plan: Coach-specific Settings Sub-items

## Single file: `src/components/AppSidebar.tsx`

### Change 1: Replace `settingsSubItems` constant (lines 110–114)
Replace with two constants: `settingsSubItems` (unchanged) and `coachSettingsSubItems` (Billing item has `disabled: true, badge: 'Coming Soon'`).

### Change 2: Replace the sub-items map block (lines 187–201)
Replace `settingsSubItems.map(...)` with a conditional that picks `coachSettingsSubItems` when `profile?.account_type === 'coach'`, otherwise `settingsSubItems`. Each item renders either a disabled `<span>` with badge or a `<NavLink>`, wrapped in `<SidebarMenuItem>`.

### Technical detail
- The `coachSettingsSubItems` array items include optional `disabled?: boolean` and `badge?: string` fields
- Disabled items render as a styled `<span>` with opacity-50 and cursor-not-allowed, matching the pattern already used for disabled nav items in the main nav section
- No other files changed

