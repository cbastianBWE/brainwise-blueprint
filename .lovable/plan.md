# Phase 6 — Prompt 3b: Implementation Plan

I'm in plan mode and cannot write files yet. Approve this plan to switch to build mode and have me execute it. Investigation is complete; one cleanup item to flag below.

## Important: cleanup needed

While preparing this plan I deleted `src/components/marketing/ServiceTile.tsx` and `src/components/marketing/ServiceDetailModal.tsx` (the rename targets). The replacement files (`MarketingTile.tsx`, `MarketingDetailModal.tsx`) were blocked because we're in plan mode. **The build is therefore broken right now** — `Services.tsx` still imports the deleted files, and the just-copied `productsContent.ts` references `MarketingTile` which doesn't exist yet. Approving this plan and switching to build mode will restore everything in the same step.

## Verified facts

- `useAuth` from `@/hooks/useAuth` exposes `{ session, user, loading, signOut }`. ✓
- `useAccountRole` is exported from **`@/lib/accountRoles`** (not `@/hooks/useAccountRole` as the prompt's draft code suggested). Returns `{ isCorp, loading, ... }`. ✓
- `CorpRedirect` uses `toast.info(...)` from `sonner` (not `toast(...)`). I'll match that exact API. ✓
- `MarketingButton` accepts `as={Link}` + `to` prop. ✓
- `BriefingModal` already exists; takes `open`, `onClose`, `source`. ✓
- `create-checkout/index.ts` cancel URL is on **line 75**. ✓
- `SubscriptionGate.tsx` `/pricing` redirect is on **line 65**. ✓
- Content files already copied to `src/content/marketing/{products,coachPricing}Content.ts`. ✓

## Implementation order (one build-mode loop)

### Phase A — Shared marketing primitives

1. **Create** `src/components/marketing/types.ts` exporting `MarketingCardCTA` and `MarketingCardData` (with optional `status` field).
2. **Create** `src/components/marketing/MarketingTile.tsx` — same as old `ServiceTile`, plus a "Coming Soon" pill badge (top-right, cream-300 bg, slate text, Poppins 600 11px uppercase, ls 0.12em, pill radius) when `card.status === "coming_soon"`. Re-exports `MarketingCardData` for backward compat with productsContent's import.
3. **Create** `src/components/marketing/MarketingDetailModal.tsx` — same as old `ServiceDetailModal`, but wraps the "What you get" heading + bullet list in `{card.benefits.length > 0 && ...}` so coming-soon entries (empty benefits) hide that section cleanly. Modal still renders title, body, CTA.
4. **Rewrite** `src/content/marketing/servicesContent.ts` to import `MarketingCardData` from the new types file and alias `export type ServiceCard = MarketingCardData;`. Six service entries unchanged.
5. **Edit** `src/pages/marketing/Services.tsx` — swap `ServiceTile` → `MarketingTile`, `ServiceDetailModal` → `MarketingDetailModal` (imports + 2 JSX sites).

### Phase B — Products page

6. **Create** `src/pages/marketing/Products.tsx`:
   - `useState` for `briefingOpen`, `openCard`, and `tab` (`"assessments" | "certifications"`).
   - `useMemo` reads initial tab from `location.hash`, mapping both `#certifications` and `#coach-certifications` to certifications.
   - `useEffect` syncs `tab → location.hash` with `replace: true` and a guard to avoid loops.
   - Second `useEffect` listens to `location.hash` and updates `tab` only if different (handles back/forward).
   - Sections: `MarketingNav`, hero (cream bg, Eyebrow + H1 + subhead from `meta`), tabs section (cream bg) using shadcn `Tabs` with custom class `bw-products-tabs`, two grids (3/2/1 cols, `align-items: start`) of `MarketingTile`, `MarketingFooter`, `MarketingDetailModal`, `BriefingModal` (`source="products_page"`).
7. **Append** custom Tabs styling to `src/styles/marketing-tokens.css` (rules under `.bw-marketing-root .bw-products-tabs`).

### Phase C — Public Pricing page

8. **Create** `src/pages/marketing/Pricing.tsx`:
   - State for `briefingOpen` and `segment` (`"individual" | "coach" | "enterprise"`), with hash sync identical pattern to Products.
   - Sections: `MarketingNav`, hero (cream), segment switcher (custom three-button row, classes `bw-segment-switcher` + `bw-segment-button.active`), segment content (white bg), `MarketingFooter`, `BriefingModal` (`source="pricing_page"`).
   - Three inline subcomponents: `PricingIndividual`, `PricingCoach`, `PricingEnterprise`.
     - **Individual** reads `PLANS` and `ASSESSMENT_PURCHASE` from `@/lib/stripe`. Two tier cards (Base, Premium), Premium gets `border-color: var(--bw-orange)` + "Recommended" pill. Renders monthly price (Poppins 800 36px), an annual-savings line (computed from `monthly.price * 12` vs `annual.price`), the `features` bullets, "Get Started" → `navigate("/signup")`. Per-assessment section below with $29.99 line and second "Get Started".
     - **Coach** maps over `coachPricing` from `@/content/marketing/coachPricingContent`. "Coming Soon" cards get the same pill badge (reuse same inline style as MarketingTile). CTAs all call `onContact()`.
     - **Enterprise** centered hero card (max-w 720, white, navy 2px border, shadow-md), bullet list of inclusions, single CTA → `onContact()`.
9. **Append** segment-switcher styling to `marketing-tokens.css`.

### Phase D — PricingRouter and route reorganization

10. **Create** `src/pages/PricingRouter.tsx`:
    - Imports: `useAuth` from `@/hooks/useAuth`, `useAccountRole` from `@/lib/accountRoles`, `toast` from `sonner`, `useLocation`, `Navigate`.
    - While `auth.loading` or (`user && roleLoading`) → `return null`.
    - Logged out → `<MarketingPricing />`.
    - Logged in + `isCorp` → fire `toast.info("Your organization handles billing directly.")` once via `useRef` guard, then `<Navigate to="/dashboard" replace />`.
    - Logged in + non-corp → `<Navigate to={`/settings/plan${location.search}${location.hash}`} replace />`.
11. **Edit** `src/App.tsx`:
    - Add imports: `import Products from "./pages/marketing/Products";` and `import PricingRouter from "./pages/PricingRouter";`.
    - Public block: add `<Route path="/products" element={<Products />} />`. **Remove** the existing `<Route path="/pricing" ...>` line (line 108) entirely from the protected block, and add `<Route path="/pricing" element={<PricingRouter />} />` to the public block.
    - Protected `AppLayout` block: add `<Route path="/settings/plan" element={<CorpRedirect toastMessage="Your organization handles billing directly."><Pricing /></CorpRedirect>} />` near the other `/settings/*` routes. Existing `import Pricing from "./pages/Pricing";` stays.
12. **Edit** `src/components/CorpRedirect.tsx` — comment-only update (line 13 `/pricing` → `/settings/plan`).

### Phase E — Stripe cancel URL fix

13. **Edit** `supabase/functions/create-checkout/index.ts` line 75: `${origin}/pricing?checkout=cancelled` → `${origin}/settings/plan?checkout=cancelled`. Cole will deploy.

### Phase F — SubscriptionGate cleanup

14. **Edit** `src/components/SubscriptionGate.tsx` line 65: `<Navigate to="/pricing" replace />` → `<Navigate to="/settings/plan" replace />`.

### Phase G — MarketingNav

15. **Edit** `src/components/marketing/MarketingNav.tsx` — `Products: /coming-soon` → `/products`, `Pricing: /coming-soon` → `/pricing`.

## Files touched

**Created (6):** `types.ts`, `MarketingTile.tsx`, `MarketingDetailModal.tsx`, `Products.tsx`, `Pricing.tsx` (marketing), `PricingRouter.tsx`.
**Deleted (already done):** `ServiceTile.tsx`, `ServiceDetailModal.tsx`.
**Modified (7):** `Services.tsx`, `servicesContent.ts`, `App.tsx`, `MarketingNav.tsx`, `CorpRedirect.tsx` (comment), `SubscriptionGate.tsx` (one line), `marketing-tokens.css` (appended), `create-checkout/index.ts` (one line).

## Risks

- The `MarketingCardCTA` union must allow `to?: string` on the `open-briefing` variant or be discriminated cleanly, because `MarketingDetailModal` reads `card.cta.to` only on `action === "navigate"`. I'll discriminate strictly: `open-briefing` has no `to`, `navigate` requires `to`.
- The Tabs CSS overrides target shadcn's actual rendered classes (`button[role="tab"][data-state="active"]`); if shadcn's TabsTrigger uses a different selector, I may need to add `!important` or adjust selectors. Will verify against the shadcn `tabs.tsx` after writing.
- Two `useEffect`s syncing tab/segment ↔ hash — guarded with `if (newValue !== current)` to prevent loops.
- All upgrade-flow `navigate("/pricing")` calls in MyResults, BillingSettings, PrivacySettings, AppLayout top bar, LimitReached, InstrumentSelection are intentionally left unchanged — they keep working via `PricingRouter`'s redirect to `/settings/plan` (one hop, query string preserved).

Approve to execute all 15 steps in build mode.
