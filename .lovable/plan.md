

# Plan: Add My Clients collapsible nav + update ClientResults back button

## File 1: `src/components/AppSidebar.tsx`

### Change A — Add `isClientsOpen` variable (after line 110)
Add: `const isClientsOpen = location.pathname.startsWith('/coach/clients') || location.pathname.startsWith('/coach/client-results');`

### Change B — Remove Client Results from coachNav (line 47)
Delete: `{ title: "Client Results", url: "/coach/client-results", icon: BarChart3 },`

### Change C — Replace the "My Clients" nav item render with collapsible pattern
In the `navItems.map` loop (lines 143–173), the "My Clients" item currently renders as a regular NavLink. We need to intercept it: when `item.title === "My Clients"`, render the collapsible pattern with a "Client Results" sub-item instead of the default NavLink. This mirrors the existing Settings collapsible block.

The collapsible block includes:
- A NavLink to `/coach/clients` with chevron toggle
- When `isClientsOpen && !collapsed`, a sub-menu with "Client Results" linking to `/coach/client-results`

## File 2: `src/pages/coach/ClientResults.tsx`

### Change D — Add `useNavigate` to imports (line 1)
Change `import { useSearchParams } from "react-router-dom"` to `import { useSearchParams, useNavigate } from "react-router-dom"`

### Change E — Add navigate inside CoachResultsView (after line 341)
Add: `const navigate = useNavigate();`

### Change F — Replace back button (lines 388–395)
Replace `onClick={onBack}` and "Back to assessments" with `onClick={() => navigate(-1)}` and "Back".

No other files changed.

