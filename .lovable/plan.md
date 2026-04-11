

# Plan: Coach Credit Banner on Dashboard

## What Changes

**Single file**: `src/pages/Dashboard.tsx`

Add a dismissible banner at the top of the dashboard when the logged-in user has an unused coach credit (stripe_coupon_id is not null and coupon_expires_at is in the future).

## Implementation

1. **Fetch coupon data**: Use `supabase` client to query `users` table for `stripe_coupon_id`, `coupon_amount`, `coupon_expires_at` where `id = user.id`. Run this in a `useEffect`.

2. **State**: `couponData` (the fetched row or null), `dismissed` (boolean, default false).

3. **Banner display condition**: Show banner when all are true:
   - `couponData.stripe_coupon_id` is not null
   - `couponData.coupon_expires_at` is in the future (`new Date(coupon_expires_at) > new Date()`)
   - `!dismissed`

4. **Banner UI**: A styled `div` (or `Alert`) at the top of the page, before the existing Card:
   - Text: "🎉 You have a $[coupon_amount] coach credit toward an annual subscription! Upgrade and save before it expires on [formatted date]."
   - "Upgrade Now" button → `navigate("/pricing")`
   - X/close button → `setDismissed(true)`
   - Styled with a highlight background (e.g. `bg-primary/10 border-primary`)

5. **No other changes** to the dashboard content.

## Technical Details

- Imports added: `useState`, `useEffect` from React; `supabase` from client; `useNavigate` from react-router-dom; `Button` from ui; `X` from lucide-react
- Date formatted with `toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })`

