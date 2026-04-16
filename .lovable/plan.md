

# Plan: Add self-pay dialog and coach-invited instrument flow to InstrumentSelection.tsx

## Single file: `src/components/assessment/InstrumentSelection.tsx`

### 1. Add imports (line 1)
Add `Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription` from `@/components/ui/dialog`.

### 2. Add new state variables (after line 68)
- `showSelfPayDialog`, `selfPayDialogLoading`, `subscriptionPlans`, `selfPayCoachInstrumentIds`

### 3. Expand Promise.all (lines 73–86)
Add two new queries:
- `subscription_plans` fetch (active plans with name, tier, billing_period, price_usd, stripe_price_id)
- `coach_clients` self-pay query (where `stripe_payment_intent_id` is null, `assessment_id` is null, status in sent/opened)

Add `plansRes` and `selfPayCoachClientsRes` to destructuring. Process both after existing data blocks.

### 4. Add helper functions (before return, after `handleSelect`)
- `hasPremiumInvitedInstrument()` — checks if any premium instrument UUID is in self-pay set
- `getSelfPayTotal()` — returns count × $29.99
- `handleSelfPayPerAssessment()` — invokes `create-checkout` with payment mode
- `handleSubscribe(priceId)` — invokes `create-checkout` with subscription mode

### 5. Update button rendering (lines 189–217)
Add `selfPayCoachInvited` check after `coachPaid`. Insert new branch before the fallback `else` with "Your Coach Wants You to Take This" button that opens dialog.

### 6. Update Card opacity (line 222)
Add `selfPayCoachInvited` to the hover condition.

### 7. Add Dialog component (before closing `</div>` on line 248)
Dialog with three payment options: Base subscription (hidden if no premium invited), Premium subscription, and per-assessment one-time payment. Each with pricing from `subscriptionPlans` state.

No other files changed.

