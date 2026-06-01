# Super-admin Platform Features page

The instructions are accurate and consistent with the codebase. Verified:

- `src/pages/super-admin/PlatformFeatures.tsx` does not exist — safe to create.
- `src/pages/company/Features.tsx` already owns the `Features` import name in `App.tsx` (line 79). Using the distinct component name `PlatformFeatures` avoids the collision.
- `superAdminNav` lives in `src/components/AppSidebar.tsx` at lines 83–102 and uses the `{ title, url, icon }` shape — the proposed nav entry slots in cleanly. `SlidersHorizontal` is not yet imported from `lucide-react` (line 2–8), so it needs to be added to that import.
- `Members.tsx` already calls `supabase.rpc("search_impersonation_targets", ...)` typed, confirming that RPC signature.
- `platform_features` and the two new RPCs are not in `src/integrations/supabase/types.ts`, so the `(supabase.rpc as any)` / `from("platform_features" as any)` casts are required as specified.

One small adjustment: place the new nav entry directly under "Members" (after line 86) so platform-wide admin controls cluster together, rather than at the bottom. Pure ordering preference, no behavior change.

## Files

**NEW `src/pages/super-admin/PlatformFeatures.tsx`**

- Page shell mirroring other super-admin pages (page title, two `Card`s).
- **Card 1 — Platform-wide instrument flags**
  - On mount: `supabase.from("platform_features" as any).select("feature, enabled, label, category, updated_at").like("feature", "instrument:%").order("label")`.
  - Render each row: label, "updated {relative time}" if `updated_at`, shadcn `Switch`.
  - Toggle opens a `Dialog` with a `Textarea` for reason; Confirm disabled until `reason.trim().length >= 10`. Warning copy: "This changes visibility for ALL individual users."
  - On confirm: `(supabase.rpc as any)("platform_feature_set", { p_feature, p_enabled: next, p_reason: reason })`. On success update local row + `toast.success`; on error revert + `toast.error(err.message)`.
- **Card 2 — Per-individual overrides**
  - Debounced (~250ms) search `Input`. Query: `supabase.rpc("search_impersonation_targets", { p_query, p_limit: 25, p_offset: 0, p_account_types: ["individual"] })`. Render selectable list (full_name + email).
  - On select: fetch `supabase.from("member_feature_overrides").select("feature, enabled").eq("user_id", selectedUser.user_id)` → `Map<feature, boolean>`.
  - Render the 5 seeded instruments (use labels from Card 1's fetched rows so we don't duplicate the uuid list — fall back to the known uuid map if Card 1 data isn't ready). For each, a 3-way control (e.g. `ToggleGroup` with `Default | Allow | Block`) reflecting map state.
  - On change: reason dialog (≥10 chars) → `(supabase.rpc as any)("individual_feature_override_set", { p_user, p_feature, p_enabled: Allow?true:Block?false:null, p_reason })`. Refetch overrides on success; surface RPC error message on failure (so corporate-target rejection is visible).

**EDIT `src/App.tsx`**

- Add `import PlatformFeatures from "./pages/super-admin/PlatformFeatures";` with the other super-admin imports.
- Add route inside the `AppLayout` block, alongside the other `/super-admin/*` routes:
  ```tsx
  <Route path="/super-admin/features" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><PlatformFeatures /></SuperAdminSessionProvider></RoleGuard>} />
  ```

**EDIT `src/components/AppSidebar.tsx`**

- Add `SlidersHorizontal` to the `lucide-react` import (line 2–8).
- Insert into `superAdminNav` just after the "Members" entry (line 86):
  ```ts
  { title: "Features", url: "/super-admin/features", icon: SlidersHorizontal },
  ```

## Out of scope

No backend changes, no edits to `types.ts`, no touching `company/Features.tsx`, MyResults, AiChat, or other super-admin pages.

## Verification

After build: report the three changed files and confirm `tsc` is clean.
