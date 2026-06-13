Modify only `src/components/AppLayout.tsx`:

1. After the existing coupon `useEffect`, add a `branding` state and a second `useEffect` that calls the `get_org_branding_for_current_user` RPC (cast as any), resolves `brand_logo_path` via `supabase.storage.from("org-branding").getPublicUrl(...)`, and stores `{ logoUrl, orgName, isDefault }`. Resets to default when no user, on RPC error, or when `is_default` is true. Uses an `active` flag for cleanup.

2. Replace the entire `<header>` block:
   - Background uses `hsl(var(--primary))`, border + text use `hsl(var(--primary-foreground))` (with `/0.15` for the border) so the org-injected theme tokens drive the chrome.
   - `SidebarTrigger` inherits primary-foreground color.
   - If `branding.isDefault`: render the existing `/brain-icon.png` + "BrainWise Enterprises" Poppins wordmark.
   - Else if `branding.logoUrl`: render the org logo `<img>` (height 32, maxWidth 180, contain).
   - Else: render `branding.orgName` as a Poppins wordmark fallback.
   - `NotificationBell` stays in `ml-auto`.

Nothing else in the file changes — coupon banner, sidebar, `<main>`, and `CoachDisclosureGate` are untouched. No other files modified.
