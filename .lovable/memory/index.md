# Project Memory

## Core
BrainWise - assessment platform. Primary: hsl(217, 91%, 50%). Clean card-style UI.
Supabase Auth with email verification. Role-based routing by account_type.
users table auto-created via handle_new_user trigger on auth signup.
Stripe billing: Base $10/mo (or $100/yr), Premium $18/mo (or $180/yr), assessment $29.99. LIVE mode as of Session 36. Config in src/lib/stripe.ts.

## Memories
- [Auth flow](mem://features/auth) — Signup, login, forgot/reset password, role-based redirect, onboarding flow
- [Stripe billing](mem://features/stripe-billing) — Price IDs, product IDs, edge functions, subscription gating
