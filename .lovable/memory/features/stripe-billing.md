---
name: Stripe Billing Configuration
description: Stripe pricing, product/price IDs, checkout flows, subscription gating
type: feature
---
## Pricing
- Base: $14/mo (price_1TKObgCMQX1silSQMZ71bNuM) or $130/yr (price_1TKOd1CMQX1silSQigrP4JGm)
- Premium: $24/mo (price_1TKOdhCMQX1silSQYicToumr) or $220/yr (price_1TKOdzCMQX1silSQSPWiE7ac)
- Per-assessment: $29.99 (price_1TKOeMCMQX1silSQ7tzQLso6)

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
