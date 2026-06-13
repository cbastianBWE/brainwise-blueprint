Replace `src/components/SubscriptionGate.tsx` with the provided version.

Change: module entitlement keys (`module:<MODULE>`) now resolve through the `user_has_feature` RPC for every principal (corporate, individual, coach), and this check runs **before** the bypass-role shortcut so coaches can be gated. Super admins still pass because the RPC always returns true for them.

All non-module behavior is unchanged: corporate contract checks via RPC, individual Stripe `subscription_status` gating, `ai_chat` credit bypass, and bypass roles for non-module keys.

No other files modified.