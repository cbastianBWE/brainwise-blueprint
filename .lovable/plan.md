# Phase 5 — Class-based marketing button system

Stop fighting Tailwind preflight via inline-style specificity. Move all marketing button variants to real CSS classes scoped under `.bw-marketing-root`, and reduce `MarketingButton` to a thin class composer.

## Changes

### 1. `src/styles/marketing-tokens.css`
- Append a new "Button system" block at the end with classes: `.bw-btn`, sizes `.bw-btn-sm/md/lg`, variants `.bw-btn-primary/secondary/ghost/invert`, modifier `.bw-btn-on-dark` (for ghost on dark surfaces), `.bw-btn-fullwidth`, `:disabled` state, and `.bw-btn-arrow`.
- Selectors written for both `button` and `a` (`.bw-marketing-root .bw-btn, .bw-marketing-root a.bw-btn`) so anchor and button render identically and beat Tailwind preflight via specificity (no `!important` needed).
- Includes hover states for primary/secondary/ghost/invert.
- Remove (if still present) any leftover `.bw-marketing-root button { background-color: revert; ... }` rule from prior fix attempts. Keep `.bw-marketing-root button { font-family: inherit; }`.

### 2. `src/components/marketing/MarketingButton.tsx` — full rewrite
- Drop the `getVariantStyle` + `i(val)` `!important` hack and the `as any` cast.
- Compose `className` from props: base `bw-btn`, variant class, size class, optional `bw-btn-fullwidth`, and `bw-btn-on-dark` when `variant="ghost"` and new `onDark` prop is true.
- `style` prop still forwarded for one-off overrides.
- Arrow rendered via `<span className="bw-btn-arrow">→</span>`; hidden when `hideArrow` or variant is `ghost`.
- Tag selection unchanged: `as` prop wins, else `<a>` if `to`/`href`, else `<button>`.

### 3. `src/components/marketing/MarketingNav.tsx` — one call site update
- Top-nav "Sign In" (ghost on navy bar): add `onDark` prop so it gets white text/border instead of navy. Applies to both desktop and the mobile-header instance (same component instance — single edit).
- Audience-card "Talk to Us" / "Book a Briefing" stay as `variant="ghost"` with no `onDark` (cream background, navy text/border is correct). Their existing inline `style={{ color: "var(--bw-navy)", borderColor: "var(--border-2)" }}` overrides become redundant but harmless; leave as-is to keep diff minimal.

## Files touched
- `src/styles/marketing-tokens.css` (append + small cleanup)
- `src/components/marketing/MarketingButton.tsx` (full rewrite)
- `src/components/marketing/MarketingNav.tsx` (add `onDark` to nav Sign In)

## Verification checklist
- Hero "Sign Up" (primary on navy): orange fill, white text + arrow
- Hero "Sign In" (invert on navy): transparent + white border, white text + arrow
- Top-nav "Sign In" (ghost + onDark): transparent, subtle white border, white text
- Top-nav "Sign Up" (primary): orange fill, white text
- Audience card "Get Started" (primary on cream): orange fill, white text
- Audience card "Talk to Us" / "Book a Briefing" (ghost on cream): transparent, navy border + text
- Modal "Request Briefing" (primary fullWidth on white): orange fill, white text
- CTA "Sign Up" (primary on navy) + "Book a Briefing" (invert on navy): both visible
- Hover: primary darkens one shade; ghost/invert get subtle bg tint

No other components affected. The Phase 4 mobile-nav hamburger work stays as-is.
