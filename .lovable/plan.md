

# Plan: Update coachNav in AppSidebar.tsx

## Changes (single file: `src/components/AppSidebar.tsx`)

1. **Import**: Add `CreditCard` to the lucide-react import (line 2).

2. **Replace coachNav array** (lines 44–54) with:
```typescript
const coachNav: NavItem[] = [
  { title: "My Clients", url: "/coach/clients", icon: Users },
  { title: "My Assessments", url: "/assessment", icon: ClipboardList },
  { title: "My Results", url: "/my-results", icon: BarChart3 },
  { title: "Client Results", url: "/coach/client-results", icon: BarChart3 },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "Resources", url: "/coach/resources", icon: BookOpen, disabled: true, badge: "Coming Soon" },
  { title: "My Profile", url: "/coach/profile", icon: UserCircle, disabled: true, badge: "Coming Soon" },
  { title: "Certification", url: "/coach/certification", icon: Award, disabled: true, badge: "Coming Soon" },
  { title: "Billing", url: "/settings/billing", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];
```

- Order Assessment removed
- Three new items added (My Assessments, My Results, Billing)
- Resources, My Profile, Certification marked disabled with "Coming Soon" badge

No other files changed.

