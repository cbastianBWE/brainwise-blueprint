## Change

In `src/components/ai/LimitReached.tsx`, replace the `if (!subscriptionActive)` block (lines ~23–46) with the new version that:

- Updates heading to "You're out of AI chat messages"
- Updates body copy to "Subscribe to Premium for {premiumLimit} AI coaching messages every month."
- Adds a `<Button onClick={() => navigate("/pricing")}>Upgrade to Premium</Button>` CTA above the existing "Questions? Contact Support" link

The two subscriber branches below remain untouched.

## Technical notes

- `Button` is already imported from `@/components/ui/button`; no new imports needed.
- `premiumLimit` prop (default 400) already exists on the component.
- After edit, run typecheck to confirm clean.