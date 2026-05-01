# Phase 6 — Prompt 1: Legal pages + footer wiring

Purely additive marketing work. No internal app routes, auth surfaces, or assessment flow touched.

## 1. Copy content files

Copy the four uploaded files verbatim into a new `src/content/legal/` directory:

- `src/content/legal/privacyContent.ts`
- `src/content/legal/termsContent.ts`
- `src/content/legal/cookiesContent.ts`
- `src/content/legal/internationalContent.ts`

Each already imports `LegalBlock` from `@/components/marketing/LegalPageLayout`, so the type contract must match exactly.

## 2. Create `src/components/marketing/LegalPageLayout.tsx`

A new shared primitive. Default export.

**Exported type:**

```ts
export type LegalBlock =
  | { type: "h1"; text: string; id: string }
  | { type: "h2"; text: string; id: string }
  | { type: "h3"; text: string; id: string }
  | { type: "p"; text: string }
  | { type: "table"; header: string[]; body: string[][] };
```

**Props:** `{ title, effectiveDate, blocks }`.

**Structure (wrapped in `<div className="bw-marketing-root">` with `@/styles/marketing-tokens.css` imported):**

- `<MarketingNav />`
- Page header: eyebrow "Legal" (use `<Eyebrow>` component), Poppins 800 ~40px title (`var(--bw-navy)`), small-caps "Effective: {effectiveDate}" subline (`var(--bw-slate-500)`, Montserrat 12px, letter-spacing 0.15em). Centered max-width 1200px with side gutters.
- Two-column body region (max-width 1200px, side gutters):
  - Desktop (≥1024px): grid `240px 1fr`, gap 48px. Left = sticky TOC (`position: sticky; top: 100px; max-height: calc(100vh - 120px); overflow-y: auto`). Right = prose well, max-width 720px.
  - Mobile (<1024px): single column. TOC rendered inside `<details>` (closed by default) above the prose.
- "↑ Back to top" link at end of prose well: Montserrat 500 13px, `var(--bw-slate-500)`, hover `var(--bw-orange)`, smooth scroll to top.
- `<MarketingFooter />`

Use `useIsBelow(1024)` hook pattern (same as `Home.tsx`) for the responsive split.

**Block rendering rules** (render in a single map over `blocks`):

- `h1`: Poppins 700 26px, `var(--bw-navy)`, `margin: 48px 0 16px` (collapse top margin when first block: `:first-child` via inline check — track index 0). Wrap in element with `id={block.id}` and `scroll-margin-top: 90px`.
- `h2`: Poppins 600 19px, `var(--bw-navy)`, `margin: 28px 0 10px`. `id={block.id}`, `scroll-margin-top: 90px`.
- `h3`: Poppins 600 16px, `var(--bw-slate-700)`, `margin: 20px 0 8px`. `id={block.id}`, `scroll-margin-top: 90px`.
- `p`: Montserrat 400 15px, line-height 1.7, `var(--bw-slate-700)`, `margin-bottom: 14px`. Text rendered as plain string — no auto-link, no markdown, no `dangerouslySetInnerHTML`.
- `table`: full width, `border-collapse: collapse`, `margin: 20px 0`, outer border `1px solid var(--border-1)`.
  - `thead th`: bg `var(--bw-cream-200)`, Poppins 600 13px, `var(--bw-navy)`, padding `10px 14px`, border-bottom `1px solid var(--border-1)`.
  - `tbody td`: Montserrat 400 14px, `var(--bw-slate-700)`, padding `10px 14px`, border-bottom `1px solid var(--border-1)`.
  - First column of body cells: Montserrat 600.
  - Last `<tr>` cells: no border-bottom (apply via `:last-child` selector or index check).

**TOC:**

- Build entries from `blocks.filter(b => b.type === "h1")`. Each entry shows `block.text`, links to `#${block.id}`.
- On click: `e.preventDefault()`, then `document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })`. The `scroll-margin-top: 90px` on headings handles the sticky-nav offset.
- Active highlighting via `IntersectionObserver`: observe each `h1` element, track which is most recently intersecting near top of viewport (`rootMargin: "-80px 0px -70% 0px"`), store active id in state.
- TOC items: Montserrat 500 13px, padding `6px 0`, no underline. Color = `var(--bw-orange)` if active else `var(--bw-slate-500)`. Hover `var(--bw-orange)`.
- Mobile `<details>` wraps the same TOC list; `<summary>` reads "On this page".

## 3. Create four page components

Each is a 5-line wrapper. Default export.

```tsx
// src/pages/marketing/Privacy.tsx
import LegalPageLayout from "@/components/marketing/LegalPageLayout";
import { meta, content } from "@/content/legal/privacyContent";
export default function Privacy() {
  return <LegalPageLayout title={meta.title} effectiveDate={meta.effectiveDate} blocks={content} />;
}
```

Same shape for `Terms.tsx`, `Cookies.tsx`, `InternationalCompliance.tsx`.

## 4. Wire routes in `src/App.tsx`

Add four imports near the other marketing imports:

```tsx
import Privacy from "./pages/marketing/Privacy";
import Terms from "./pages/marketing/Terms";
import Cookies from "./pages/marketing/Cookies";
import InternationalCompliance from "./pages/marketing/InternationalCompliance";
```

Add four routes inside the Public routes block, after `/auth/verify-conversion` and before `/departed`:

```tsx
<Route path="/privacy" element={<Privacy />} />
<Route path="/terms" element={<Terms />} />
<Route path="/cookies" element={<Cookies />} />
<Route path="/international-privacy" element={<InternationalCompliance />} />
```

No other changes to `App.tsx`.

## 5. Replace `src/components/marketing/MarketingFooter.tsx`

Keep existing top row (wordmark + tagline). Replace the bottom block so it includes:

- Middle row: legal links column (Privacy Policy → `/privacy`, Terms of Service → `/terms`, Cookies → `/cookies`, International Privacy → `/international-privacy`) using `<Link>` from `react-router-dom`. Links use class `bw-footer-link`, color `rgba(255,255,255,0.72)`, Montserrat 500 13px, no underline. Two-column on desktop (Legal | Contact), single column on mobile (<768px) using `useIsMobile` or inline window check matching existing patterns.
- Contact column: heading "Contact" (Poppins 600 12px uppercase letter-spacing 0.18em, `var(--bw-orange)`), then plain text `support@brainwiseenterprises.com` (NOT a `mailto:`), Montserrat 13px white at 70% opacity.
- Bottom row: only `© 2026 BrainWise Enterprises.` on the left. Remove the "Privacy Policy and Terms of Service coming soon" text entirely.

Add a small column-heading style for "Legal" matching the "Contact" heading.

## 6. Add hover rule in `src/styles/marketing-tokens.css`

Right next to the existing `.bw-nav-link:hover` rule:

```css
.bw-footer-link:hover { color: var(--bw-orange) !important; }
```

## What NOT to do

- No auto-linkify of emails or URLs. All content rendered as plain text.
- No paraphrasing or reformatting of legal content — verbatim only.
- No changes to `MarketingNav`, `/pricing`, internal app routes, or any auth surface.
- No new dependencies.
- No analytics, scroll telemetry, or cookie banner.

## Verification

After build, smoke-test:

1. `/privacy`, `/terms`, `/cookies`, `/international-privacy` all render with correct title, effective date, TOC entries (one per `h1`), and tables.
2. Footer links from `/` navigate to all four pages without 404.
3. Desktop: TOC sticky on scroll, active section turns orange via IntersectionObserver. Click TOC entry → smooth scroll to section, heading not hidden under sticky nav.
4. Mobile <1024px: TOC collapses into closed `<details>`, single-column layout.
5. "Back to top" smooth-scrolls to page top.
6. `/terms` §16 contains "the laws of Georgia" and "Fulton County, Georgia" verbatim.
7. `/international-privacy` §2 renders bracketed DPO note with brackets intact.
