# Add "Lesson Builder" picker under Content Authoring

## 1. New page: `src/pages/super-admin/LessonBuilderList.tsx`
- Super-admin page using Card/Button/Input from `@/components/ui`, styled like other `src/pages/super-admin` pages.
- Header: ArrowLeft back button → `/super-admin/content-authoring`, title "Lesson Builder", subtitle "Jump straight into any lesson-blocks lesson to edit its blocks."
- Data: `useQuery({ queryKey: ["lesson-builder-list"] })` with `isLoading` / `error` states. Two separate reads (no FK embed):
  - `(supabase as any).from("content_items").select("id, title, module_id, item_type, archived_at").eq("item_type", "lesson_blocks").is("archived_at", null).order("title")`
  - `(supabase as any).from("modules").select("id, name").in("id", uniqueModuleIds)` (skip if empty)
  - Build a `module_id → name` map; fallback "Unassigned" when `module_id` is null.
- Client-side case-insensitive title filter via an `Input`.
- Render a vertical list of Cards: bold lesson title, muted parent module name, right-aligned "Edit blocks" Button (`Blocks` icon) → `navigate(\`/super-admin/content-authoring/lessons/${item.id}?from=lesson-builder\`)`.
- Empty state: muted "No lesson-blocks lessons yet. Create one from Content Authoring." with a button linking to `/super-admin/content-authoring`.

## 2. Route: `src/App.tsx`
- Import `LessonBuilderList` alongside sibling super-admin imports.
- Add new route directly above the existing `/super-admin/content-authoring/lessons/:contentItemId` route (same `RoleGuard` + `SuperAdminSessionProvider` wrapper):
  `<Route path="/super-admin/content-authoring/lessons" element={...<LessonBuilderList />...} />`
- Leave the `:contentItemId` and quiz routes untouched.

## 3. Editor return target: `src/pages/super-admin/LessonBlocksEditor.tsx`
- Line 2 import: add `useSearchParams` → `import { useNavigate, useParams, useSearchParams } from "react-router-dom";`
- After `const navigate = useNavigate();` (line 59) add:
  ```ts
  const [searchParams] = useSearchParams();
  const backTarget = searchParams.get("from") === "lesson-builder"
    ? "/super-admin/content-authoring/lessons"
    : "/super-admin/content-authoring";
  ```
- Replace the hardcoded `navigate("/super-admin/content-authoring", { replace: true })` in the "not editable" redirect with `navigate(backTarget, { replace: true })`.
- Replace the back button's `onClick={() => guardedNavigate("/super-admin/content-authoring")}` with `onClick={() => guardedNavigate(backTarget)}`.
- No other changes.

## 4. Sidebar child: `src/components/AppSidebar.tsx`
- Import `Blocks` from `lucide-react`.
- In the `navItems.map(...)` block, add a special case mirroring the existing `if (item.title === "My Clients")` branch but for `item.title === "Content Authoring"`:
  - Render the Content Authoring `SidebarMenuItem` exactly as today (NavLink to `item.url` with `item.icon`).
  - When `!collapsed`, render an indented static child directly below it (`ml-4 mt-1 space-y-1` wrapper) containing a `SidebarMenuItem` whose `NavLink` points to `/super-admin/content-authoring/lessons` with the `Blocks` icon and label "Lesson Builder".
  - No chevron, no open/close state — always shown when expanded.
  - Wrap in a `Fragment` with the same key convention used by the My Clients branch.
- Do not change any other nav item.

## Out of scope
- No backend, RPC, schema, or types changes.
- Quiz editor route and behavior untouched.
