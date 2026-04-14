

# Plan: Collapsible Settings Group in Sidebar

## Summary
Replace flat Settings/Privacy/Billing items in all nav arrays with a collapsible Settings group driven by `location.pathname.startsWith('/settings')`. The `/coach/invoices` route already exists in App.tsx — no changes needed there.

## Changes (single file: `src/components/AppSidebar.tsx`)

### 1. Add `ChevronDown`, `ChevronRight` to lucide-react imports (line 2-5)

### 2. Remove Settings-related items from all nav arrays
- **individualNav**: Remove lines 41-42 (`Settings` and `Privacy & Permissions`)
- **coachNav**: Remove lines 56-57 (`Billing` and `Settings`)
- **adminNav**: Remove line 68 (`Settings`)
- **superAdminNav**: Remove line 78 (`Settings`)

### 3. Add settings state and sub-items in AppSidebar (after line 114)
```typescript
const isSettingsOpen = location.pathname.startsWith('/settings');
const settingsSubItems = [
  { title: 'General Settings', url: '/settings', icon: Settings },
  { title: 'Privacy & Permissions', url: '/settings/privacy', icon: Shield },
  { title: 'Billing & Receipts', url: '/settings/billing', icon: CreditCard },
];
```

### 4. Add collapsible Settings group after navItems.map (after line 166, before `</SidebarMenu>`)
Insert a `SidebarMenuItem` with a Settings button showing chevron, and a conditionally rendered sub-menu when `isSettingsOpen && !collapsed`.

## App.tsx
No changes needed — `CoachInvoices` import (line 34) and route (line 89) already exist.

