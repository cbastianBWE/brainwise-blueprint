## Phase 6 — Prompt 2: Services + Contact pages

Frontend-only work. The `submit-contact-request` Edge Function is already deployed.

### 1. Content file

Copy the uploaded `servicesContent.ts` verbatim to:
- `src/content/marketing/servicesContent.ts`

It exports `meta`, `services` (6 cards), and a `ServiceCard` type. CTAs are either `"open-briefing"` or `"navigate"` (with `to`).

### 2. New primitive: `src/components/marketing/ServiceAccordionCard.tsx`

Controlled card with these props:
```ts
interface Props {
  card: ServiceCard;
  isOpen: boolean;
  onToggle: () => void;
  onOpenBriefing: () => void;
}
```

- White surface, `border-radius: var(--r-lg)`, `border: 1px solid var(--border-1)`, `padding: 24px`. Hover (closed): `var(--shadow-md)`. Open: `var(--shadow-md)` + `border-color: var(--bw-orange-100)`.
- Closed: small orange accent dot, title (Poppins 700, 18px, navy), summary (Montserrat 400, 14px, slate, lh 1.55), chevron bottom-right.
- Open: same header + animated body region. Body copy (Montserrat 400, 14px, lh 1.7, slate-700), "What you get" eyebrow (Poppins 600, 12px, uppercase, ls 0.18em, orange), benefits list (orange ✓ + text, 8px gap, 12px between items, 16px top margin), then CTA `MarketingButton`.
- Animate via `max-height` (0 → ~1000px) + `opacity` (0 → 1), both `var(--dur-med) var(--ease-standard)`. Chevron rotates 180°.
- Wrapper is a `<button type="button">` (or div with role=button + tabIndex=0), keyboard-toggleable on Enter/Space, with `aria-expanded`. Expanded region has `role="region"` + `aria-labelledby` to the title id.
- CTA in body: `e.stopPropagation()` so clicking the button doesn't collapse the card. If `card.cta.action === "open-briefing"`, call `onOpenBriefing`. Else `as={Link} to={card.cta.to}`.

### 3. New page: `src/pages/marketing/Services.tsx`

Wrap in `<div className="bw-marketing-root">` and import `@/styles/marketing-tokens.css`. Page state:
```tsx
const [briefingOpen, setBriefingOpen] = useState(false);
const [openId, setOpenId] = useState<string | null>(null);
```

Sections:
1. `<MarketingNav />`
2. **Hero** — navy bg, padding `96px 48px 80px` (mobile `64px 24px 56px`), centered max-width 1200. Background `<DotArc size={620} opacity={0.08} />` absolute right, content `position: relative; z-index: 1`. `<Eyebrow>Services</Eyebrow>`, H1 (Poppins 800, clamp(34px, 5vw, 54px), white, ls -0.02em, lh 1.1, max 800), subhead (Montserrat 400, 17px, rgba(255,255,255,0.78), lh 1.55, max 720, mt 20). Two CTAs (gap 12, mt 32): primary "Book a Briefing" (opens modal) + invert "See how it works" (smooth-scrolls to `#methodology`).
3. **Services accordion** — cream bg, padding `96px 48px` (mobile `64px 24px`), max 1200. Eyebrow "Engagement Lines" + H2 "What we do." (Poppins 700, clamp(28px, 4vw, 40px), navy, max 720). Grid mt 56:
   - ≥1024: `repeat(3, 1fr)` gap 24
   - 640–1023: 2 cols gap 20
   - <640: 1 col gap 16
   Render `<ServiceAccordionCard>` per item; only one open at a time.
4. **Methodology** — white bg, `id="methodology"`, padding `96px 48px` (mobile `64px 24px`), max 800. Eyebrow "How It Works", H2 "Built on neuroscience, not vibes." Two paragraphs from `meta.methodologyBody1/2` (Montserrat 400, 16px, lh 1.7, slate-700, mt 32, 16px between).
5. **Final CTA** — navy bg, padding `80px 48px` (mobile `56px 24px`), centered max 720. `<DotArc>` mirrored at left. Eyebrow "Get Started", H2 "Tell us about your team.", body paragraph. Two centered CTAs: primary "Book a Briefing" + invert "Contact us" `as={Link} to="/contact"`.
6. `<MarketingFooter />`
7. `<BriefingModal open={briefingOpen} onClose={() => setBriefingOpen(false)} source="services_page" />`

Track viewport with the same `useState/useEffect(window.innerWidth)` pattern used in MarketingNav/Footer for responsive padding & grid columns.

### 4. New page: `src/pages/marketing/Contact.tsx`

Standalone form page (not a modal). Wrap in `bw-marketing-root`.

State:
```tsx
const [form, setForm] = useState({
  name: "", email: "", organization: "",
  inquiry_type: "general", message: "", _bw_contact_url: "",
});
const [status, setStatus] = useState<"idle"|"submitting"|"success"|"error">("idle");
const [errorMsg, setErrorMsg] = useState("");
```

Sections:
1. `<MarketingNav />`
2. **Hero** — cream bg, padding `80px 48px 40px` (mobile `56px 24px 32px`), max 720. Eyebrow "Contact", H1 "Get in touch." (Poppins 800, clamp(34px, 5vw, 48px), navy), subhead about 1-business-day reply + briefing pointer.
3. **Form section** — cream bg continues, padding `16px 48px 96px` (mobile `16px 24px 64px`), max 640. White card: bg white, `border-radius: var(--r-lg)`, padding 40, `box-shadow: var(--shadow-sm)`, `border: 1px solid var(--border-1)`.

   Inside card (form):
   - Honeypot `_bw_contact_url` (offscreen absolute, tabIndex=-1, autoComplete="new-password", aria-hidden, lpignore/1p-ignore attrs).
   - Name (required, max 200), Email (required, max 254, type=email), Organization (optional label, max 200), Inquiry type (select with exact ordering: general/sales/coach_certification/corporate/press/other; default "general"), Message (textarea, required, max 4000, 6 rows).
   - Field styles per spec (label Montserrat 600/13/navy, mb 8; input padding 12px 14px, `var(--r-sm)`, `var(--border-1)`, 15px, white). Field stack mb 20.
   - Submit: full-width `MarketingButton variant="primary" size="lg" type="submit" hideArrow`. Label "Send Message" / "Sending…" while submitting, disabled while submitting.

   Submit handler invokes `supabase.functions.invoke("submit-contact-request", { body: { name, email, organization || undefined, message, inquiry_type, _bw_contact_url, source: "contact_page" } })`. Handles thrown errors and `data.error`.

   **Success** (replaces form inside the card): green check circle (64px, bg `#E9F2EC`, color `var(--bw-forest)`, ✓ 28/700), H2 "Message received." (Poppins 800, 26, navy), body "We'll be in touch within one business day at {form.email}." (Montserrat 400, 15, slate, lh 1.55), ghost button "Send another message" → resets status to idle and clears form.

   **Error**: small message under submit button (Montserrat 400, 13, `var(--bw-orange-700)`).
4. `<MarketingFooter />`

### 5. Wire routes — `src/App.tsx`

Add imports near other marketing imports:
```tsx
import Services from "./pages/marketing/Services";
import Contact from "./pages/marketing/Contact";
```
Add public routes near legal routes:
```tsx
<Route path="/services" element={<Services />} />
<Route path="/contact" element={<Contact />} />
```

### 6. Update `src/components/marketing/MarketingNav.tsx`

Update only Services and Contact entries:
```tsx
const navLinks = [
  { label: "Products", to: "/coming-soon" },
  { label: "Pricing", to: "/coming-soon" },
  { label: "Services", to: "/services" },
  { label: "Contact", to: "/contact" },
];
```

### Out of scope

- No changes to BriefingModal, `submit-briefing-request`, or `submit-contact-request`.
- No changes to legal pages, Pricing, or Products (Prompt 3).
- No cookie banner. No auto-linkification of emails/URLs.

### Verification

After implementation, smoke-test per the prompt's 14 checks: services accordion behavior, briefing modal trigger, smooth-scroll to methodology, contact form happy path (row in `contact_requests`, email arrives), honeypot suppression, validation error path, all six inquiry types produce distinct subject prefixes, mobile layout (single-column grid + reduced padding), nav/footer link routing.