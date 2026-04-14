

# Plan: Replace Settings button with NavLink

## Single file: `src/components/AppSidebar.tsx`

### Change (lines 168–182)
Replace the `SidebarMenuButton` with `onClick={() => {}}` with an `asChild` version wrapping a `NavLink to="/settings"`.

**Before:**
```tsx
<SidebarMenuButton
  className="hover:bg-sidebar-accent cursor-pointer"
  onClick={() => {}}
>
  <Settings className="h-4 w-4 shrink-0" />
  {!collapsed && (
    <div className="flex items-center justify-between flex-1">
      <span>Settings</span>
      {isSettingsOpen ? <ChevronDown /> : <ChevronRight />}
    </div>
  )}
</SidebarMenuButton>
```

**After:**
```tsx
<SidebarMenuButton asChild>
  <NavLink
    to="/settings"
    className="hover:bg-sidebar-accent"
    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
  >
    <Settings className="h-4 w-4 shrink-0" />
    {!collapsed && (
      <div className="flex items-center justify-between flex-1">
        <span>Settings</span>
        {isSettingsOpen ? <ChevronDown /> : <ChevronRight />}
      </div>
    )}
  </NavLink>
</SidebarMenuButton>
```

No other changes.

