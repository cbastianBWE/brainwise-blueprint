Combine corp shared pages into one toggle page; hide Teams.

## File 1 (new): `src/pages/SharedHub.tsx`
Create per spec — local `view` state ("corp" | "general") with two toggle buttons rendering `<SharedResults />` or `<SharedWithMe />`.

## File 2: `src/App.tsx`
- Add `import SharedHub from "@/pages/SharedHub";`
- Add `<Route path="/shared" element={<SharedHub />} />` next to existing `/shared-results` and `/shared-with-me` (both kept).
- Change `/admin/teams` route to `<Navigate to="/dashboard" replace />`.
- Remove `import AdminTeams from "./pages/admin/AdminTeams";`.

## File 3: `src/components/AppSidebar.tsx`
- In `corporateNav` and `adminNav`: replace the two entries "Shared With Me" + "Shared Results" with a single `{ title: "Shared", url: "/shared", icon: Inbox }`.
- In `adminNav` only: remove the "Teams" entry.
- `individualNav`, `coachNav`, `superAdminNav` unchanged.
