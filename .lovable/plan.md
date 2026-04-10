

# Plan: Update Billing Page for Free/Inactive Users

## What Changes

When `subscription.subscribed` is false (no active subscription), the billing page will show:
- **Current Plan**: "Free Account" with subtitle "No active subscription" and a short list of what free accounts get (per-assessment purchases, no AI chat, no resources)
- **Upgrade section**: A visually distinct card below with "Upgrade to Premium" header, $24/mo pricing, Premium feature list, and a "Get Started" button linking to `/pricing`

When active on Base tier: show Base plan info + "Upgrade to Premium" CTA (existing behavior, unchanged).
When active on Premium tier: show Premium plan info, no upgrade CTA (existing behavior, unchanged).

## Changes

### Single file: `src/pages/BillingSettings.tsx`

Replace the content inside the `!isActive` branch (lines 61–112) with three-way logic:

**If `!isActive`:**
- Title: "Free Account" (no badge)
- Subtitle: "No active subscription"
- Feature list: "Per-assessment purchases available ($29.99 each)", "No AI chat included", "No resources access"
- Remove the AI chat limit line
- Replace "View Plans" button with the upgrade card below

**Add a second `<Card>` after the Current Plan card** (only shown when `!isActive` or `tier === "base"`):
- Header: "Upgrade to Premium"
- Price line: "$24/mo or $220/yr"
- Feature list from `PLANS.premium.features`
- "Get Started" button → `navigate("/pricing")`
- Styled with a subtle border accent or background to be visually distinct

**If `isActive && tier === "premium"`:** no upgrade card shown (current behavior preserved).

**If `isActive && tier === "base"`:** current plan card shows Base info as-is, plus the Premium upgrade card below.

