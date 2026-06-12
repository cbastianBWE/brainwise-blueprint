# Consolidate super-admin sidebar

## 1. `src/components/AppSidebar.tsx` (superAdminNav only)
- Rename `{ title: "Company Accounts", url: "/super-admin/companies", icon: Briefcase }` → title `"Organizations"` (url and icon unchanged).
- Remove the `{ title: "Create Organization", url: "/super-admin/create-organization", icon: Plus }` entry.
- After removal, if `Plus` is unused elsewhere in the file, drop it from the `lucide-react` import; otherwise leave it.

## 2. `src/pages/super-admin/CompanyAccounts.tsx`
- Import `Plus` from `lucide-react` (alongside existing icons).
- Change `<h1>` text from `"Company Accounts"` to `"Organizations"`.
- Convert the existing header `<div>` into a flex row: title/subtitle on the left, a right-aligned `Button` on the right that calls `navigate("/super-admin/create-organization")` with a `Plus` icon and label `"Create Organization"`.
- Header sits above the empty-state vs. populated conditional, so the button shows in both states.
- Table, data loading, and the row-level `View Account` navigation remain unchanged.

## 3. `src/pages/super-admin/CompanyDetail.tsx`
- Update the back button label `"Back to Company Accounts"` → `"Back to Organizations"`. Keep `navigate("/super-admin/companies")` target as-is.

## Out of scope
- The `/super-admin/create-organization` route and `CreateOrganization.tsx` page are untouched and remain reachable via the new header button.
