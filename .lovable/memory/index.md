# Project Memory

## Core
BrainWise - assessment platform. Primary: hsl(217, 91%, 50%). Clean card-style UI.
Supabase Auth with email verification. Role-based routing by account_type.
users table auto-created via handle_new_user trigger on auth signup.
Stripe billing: Base $14/mo, Premium $24/mo, assessment $29.99. Config in src/lib/stripe.ts.

## Memories
- [Auth flow](mem://features/auth) — Signup, login, forgot/reset password, role-based redirect, onboarding flow
- [Stripe billing](mem://features/stripe-billing) — Price IDs, product IDs, edge functions, subscription gating
