

# Plan: Gate "Regenerate Interpretation" Behind Subscription Check

## What Changes

**Single file**: `src/pages/MyResults.tsx`

The "Regenerate Interpretation" button currently always shows the confirmation dialog. We'll add a subscription gate so that users without an active subscription see an upgrade prompt instead.

## Implementation

1. **Add state**: `showUpgradeDialog` (boolean, default false)

2. **Replace the AlertDialog trigger pattern**: Instead of wrapping the button in `<AlertDialog>` directly, use two separate dialogs controlled by state:
   - Extract the button's `onClick` to check `profile?.subscription_status === 'active'`
   - If active → open the existing confirmation dialog (set `showConfirmDialog` to true)
   - If not active → open the upgrade dialog (set `showUpgradeDialog` to true)

3. **Upgrade dialog content**:
   - Title: "Subscription Required"
   - Description: "Regenerating your interpretation requires an active subscription."
   - A prominent "Upgrade to Premium" button → `navigate("/pricing")`
   - Below it, a muted note: "Base plan also includes interpretation regeneration."
   - A "Cancel" button to close

4. **Confirmation dialog**: The existing confirmation dialog and `handleRegenerate` flow remain identical, just controlled via state instead of nested `AlertDialogTrigger`.

## Lines affected

~743–768 in `MyResults.tsx` — the `!isCoachView` block containing the AlertDialog. Plus two new state variables near the top of the component.

No other files change. No edge function changes.

