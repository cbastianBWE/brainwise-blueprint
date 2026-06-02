## Confirmation

Both target files match the prompt's expectations:
- `src/pages/Pricing.tsx` lines 148–181 contain the per-assessment section with the exact grid className, subhead text ("— no subscription needed"), and `.map` block described. `navigate` is already in scope (line 18).
- `src/pages/marketing/Pricing.tsx` `PricingIndividual` signature (line 57), call site (line 482), and the "Or buy a single assessment" block (lines 180–190) match exactly. `setBriefingOpen` already exists for coach/enterprise.

`/contact` is a real route (marketing Contact page).

## Plan

### File 1 — `src/pages/Pricing.tsx`
1. Change subhead em dash: `"Buy individual instrument assessments — no subscription needed"` → `"Buy individual instrument assessments, no subscription needed"`.
2. Change grid container from `grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto` → `grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto`.
3. Inside the grid `<div>`, immediately after the closing of the `ASSESSMENT_PURCHASE.instruments.map(...)`, add one dashed-border Contact card for "NAI, AIRSA & HSS" with a "Contact us" button routing to `/contact` via `navigate("/contact")`.

### File 2 — `src/pages/marketing/Pricing.tsx`
1. Extend `PricingIndividual` props to also accept `onContact: () => void`.
2. Update the call site to pass `onContact={() => setBriefingOpen(true)}`.
3. In the "Or buy a single assessment" block, replace the paragraph text with: `${ASSESSMENT_PURCHASE.price} per assessment for the PTP. NAI, AIRSA, and HSS are available through a consultation.`
4. Below the existing "Get Started" `MarketingButton`, add a second `MarketingButton variant="secondary"` labeled "Contact us" wired to `onContact`. Place both buttons together (side-by-side via the existing wrapper).

### Out of scope (untouched)
Subscription plan cards, prices, checkout calls, coach/enterprise segments.

### Verification
Type-check after edits.
