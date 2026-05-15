## Group X Routing Sweep — Make Resources reachable for all user types

Three small routing edits so all five user types reach the same Resources page shell.

### 1. `src/App.tsx`
Remove `SubscriptionGate` wrapper from the `/resources` route only:
```tsx
<Route path="/resources" element={<Resources />} />
```
Keep outer `<ProtectedRoute>` and the `AdminResources` import. No other changes. `SubscriptionGate` remains in use on `/ai-chat` routes.

### 2. `src/pages/admin/AdminResources.tsx`
Full replacement (2 lines → 2 lines), now rendering the real Resources shell:
```tsx
import Resources from "@/pages/Resources";
export default function AdminResources() { return <Resources />; }
```

### 3. `src/components/AppSidebar.tsx`
Add one entry to `superAdminNav`, between "Content Authoring" and "Resource Authoring":
```ts
{ title: "Resources", url: "/resources", icon: BookOpen },
```
`BookOpen` is already imported. No other nav arrays touched.

### Verification
- Free individual → `/resources` renders shell (no redirect to `/settings/plan`)
- Subscribed individual → unchanged
- org_admin / company_admin → `/admin/resources` renders the same shell
- Super admin → new sidebar entry navigates to `/resources` shell; `/super-admin/resources` authoring still works
- Coach `/coach/resources` unchanged
- No console errors

No component, logic, or schema changes.
