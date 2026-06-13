## Plan: session-time branding injector

### 1. New file `src/components/OrgBrandingInjector.tsx`
Verbatim from the prompt: a headless component that, when the auth user is loaded, calls the `get_org_branding_for_current_user` RPC (cast as any since types haven't been regenerated), converts the returned `brand_primary_color` / `brand_accent_color` hex values to shadcn-style `H S% L%` strings, picks a legible foreground via WCAG luminance, and sets the following CSS variables on `:root`:
- Primary: `--primary`, `--primary-foreground`
- Accent: `--accent`, `--accent-foreground`, `--ring`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-ring`

Clears all overrides when there's no user, when the RPC errors / returns `is_default`, and on unmount. Renders `null`.

### 2. Edits to `src/App.tsx` (2 surgical changes only)
- Add `import OrgBrandingInjector from "@/components/OrgBrandingInjector";` alongside the other `@/components` imports (after line 154).
- Render `<OrgBrandingInjector />` as the first child of `<ImpersonationProvider>` at line 165, before its existing children.

### Notes / assumptions
- Assumes the backend RPC `get_org_branding_for_current_user` exists (per the prompt's "additive only" framing) and returns `{ is_default, brand_primary_color, brand_accent_color, ... }`. Logo is not consumed here — colors only.
- `index.css`, theme tokens, and all other components are untouched.
- The `useAuth` hook is assumed to expose `{ user, loading }` (matches existing usage across the project).
