Cause: on first paint, `branding.isDefault` is `true` (initial state) before the RPC resolves, so the BrainWise wordmark renders for one frame and then swaps to the org branding.

Fix (scoped to `src/components/AppLayout.tsx` only):

1. Add a `brandingLoaded` boolean to the `branding` state (initial `false`). Set it to `true` in every terminal path of the branding effect: no user, RPC error, `is_default`, and the success path. This way we know when it's safe to render either branch.

2. Also pull `loading` from `useAuth()` so we don't decide "no user → default" while auth is still restoring the session.

3. In the header, gate the branding conditional:
   - While `authLoading || !brandingLoaded`: render an invisible spacer (`<div style={{ height: 28 }} />`) in place of the logo/wordmark so layout height stays stable and nothing flashes.
   - Once ready: render the existing default-vs-org conditional unchanged.

`SidebarTrigger` and `NotificationBell` keep rendering immediately — only the branding slot is gated. No other file is touched.