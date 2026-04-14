

# Plan: Reorder coachNav in AppSidebar.tsx

## Single change in `src/components/AppSidebar.tsx`

Replace the `coachNav` array (currently lines ~44-54) with the new order:

1. My Assessments, My Results, My Clients, Client Results, AI Chat, Chat History
2. Resources (disabled), Certification (disabled), My Profile (disabled), Billing (disabled), Settings

Key differences from current:
- **My Assessments** and **My Results** moved before **My Clients**
- **Billing** now marked `disabled: true` with "Coming Soon" badge (was enabled)
- **My Profile** moved after **Certification** (was before it)

No other files touched. No import changes needed (CreditCard already imported).

