

# Plan: Two Small Navigation & Default Billing Changes

## Change 1 — `src/components/AppLayout.tsx` (line 66)
Change `navigate("/pricing")` to `navigate("/pricing?billing=annual")` in the coupon banner's "Upgrade Now" button.

## Change 2 — `src/pages/Pricing.tsx` (line 17)
Replace the interval state initialization with logic that reads `billing` from the URL search params, defaulting to "annual" if `?billing=annual` is present, otherwise "monthly".

No other files or logic affected.

