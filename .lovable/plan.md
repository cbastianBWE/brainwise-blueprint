# Phase 5 — Marketing Homepage Build

Inventory re-confirmed: `/` → `src/pages/Index.tsx`, supabase client at `@/integrations/supabase/client`, shadcn Dialog present. Brand assets `/brain-icon.png` (512×512) and `/logo-orange-white.png` (768×664) already in `public/`.

## Files to create

1. **`src/styles/marketing-tokens.css`** — Google Fonts import (Poppins/Montserrat/Inter), full `--bw-*` token palette, semantic mappings, scoped `.bw-marketing-root` reset, focus-state helper for inputs, nav-link hover helper.

2. **`src/components/marketing/MarketingButton.tsx`** — variants `primary | secondary | ghost | invert`, sizes `sm | md | lg`, pill shape, trailing → arrow on non-ghost, `as` prop for react-router `Link`, `fullWidth`, `hideArrow`, `disabled`, inline-style based on tokens.

3. **`src/components/marketing/Eyebrow.tsx`** — Poppins 700 12px / 0.2em / uppercase, default orange, color override prop.

4. **`src/components/marketing/DotArc.tsx`** — absolutely positioned `<img src="/brain-icon.png">` wrapper, props `size`, `opacity`, `style`, pointer-events none.

5. **`src/components/marketing/MarketingNav.tsx`** — sticky navy nav, brain-icon + "BrainWise Enterprises" wordmark, four center links (Products/Pricing/Services/Contact → `/coming-soon`) hidden <768px, Sign In (ghost) / Sign Up (primary) right block, sm size on mobile.

6. **`src/components/marketing/MarketingFooter.tsx`** — navy, single-row top (icon + wordmark left, "Faster Change. More Wins." tagline right), bottom row with copyright + support email + Phase-6 placeholder text.

7. **`src/components/marketing/BriefingModal.tsx`** — `createPortal` to body, backdrop with blur, dialog ARIA, ESC + backdrop-click close, autofocus first input, honeypot `website` field off-screen, five labeled inputs (Name, Email, Company, Role, Message), submit calls `supabase.functions.invoke('submit-briefing-request', { body: { …form, source } })`, success state with checkmark, error state below button.

8. **`src/pages/marketing/Home.tsx`** — composes Nav + Hero (DotArc, eyebrow, H1 with orange "psychometric assessments" span, subhead, Sign Up/Sign In CTAs) + Stats (4-col grid with colored left borders, responsive 2/1) + AudienceCards (3-col, Get Started → /signup, Talk to Us → modal source `audience_card_coach`, Book a Briefing → modal source `audience_card_enterprise`) + Instruments (PTP/NAI/AIRSA/HSS, 2x2 grid) + CTA (split layout, DotArc, Sign Up + Book a Briefing) + Footer + BriefingModal. SEO meta tags via `useEffect` (title, description, og:*).

9. **`src/pages/marketing/ComingSoon.tsx`** — cream full-viewport centered: eyebrow, H1 "We're building this.", body, Sign Up + ← Back to home CTAs.

## Routing change

**`src/App.tsx`**:
- Remove `import Index from "./pages/Index"`.
- Add `import Home from "./pages/marketing/Home"` and `import ComingSoon from "./pages/marketing/ComingSoon"`.
- Replace `<Route path="/" element={<Index />} />` with `<Route path="/" element={<Home />} />`.
- Add `<Route path="/coming-soon" element={<ComingSoon />} />` in the public routes block.
- Leave every other route unchanged.

## Delete

- **`src/pages/Index.tsx`** — orphaned placeholder.

## Out of scope (not doing)

- No changes to existing app routes, AppLayout, Tailwind config, email templates, or backend.
- No Phase 6 pages (Products/Pricing/Services/Contact/Privacy/Terms/Cookies/International).
- No new dependencies, no favicon, no fake logos/quotes.

## Definition of done verification (post-build)

Will confirm all 10 DoD items, including: `/` renders new homepage, `/coming-soon` reachable, `/login` & `/signup` still work, nav center links route to `/coming-soon`, `Index.tsx` deleted, modal opens from coach/enterprise cards + CTA "Book a Briefing", hero CTAs go to /signup and /login, modal submits via edge function, mobile 375px clean, brain-icon renders cleanly on navy, exact "BrainWise Enterprises" capitalization throughout.
