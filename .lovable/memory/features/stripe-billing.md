---
name: Stripe Billing Configuration
description: Stripe pricing, product/price IDs, checkout flows, subscription gating
type: feature
---
## Pricing (LIVE MODE — Session 36)
- Base: $10/mo (price_1TS3WV2FY7qIyIXA5L2Gs71D) or $100/yr (price_1TS3WU2FY7qIyIXAPG37X3eg)
- Premium: $18/mo (price_1TS3WY2FY7qIyIXA6aO8QZfO) or $180/yr (price_1TS3WY2FY7qIyIXAUrBknGRQ)
- Per-assessment: $29.99 (price_1TS3WY2FY7qIyIXAalOKbxdZ)

## Product IDs
- Base: prod_UJ0cysJxUCxn4a (monthly), prod_UJ0eLA4SN7O3aK (annual)
- Premium: prod_UJ0fZEaEn6S9Vu (monthly), prod_UJ0fymvPeKTbcG (annual)
- Assessment: prod_UJ0fo5LTXmz9Y3

## Edge Functions
- create-checkout: creates Stripe Checkout session (subscription or payment)
- check-subscription: verifies active sub via Stripe, syncs to users table
- customer-portal: opens Stripe billing portal

## Gating
- Resources and AI Chat require subscription_status = 'active'
- Super admins, admins, coaches bypass gate
- assessment_purchases table tracks one-time purchases

## Config file: src/lib/stripe.ts
