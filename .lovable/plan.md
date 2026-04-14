

# Plan: Add Coach Invitation Flow to SignUp

## Single file: `src/pages/SignUp.tsx`

### Change 1: Update imports (lines 1–2)
- Add `useEffect` to the React import
- Add `useSearchParams` to the router import
- Add `Loader2, Info` from lucide-react

### Change 2: Add CERT_LABELS constant (before the component, after imports ~line 11)
```tsx
const CERT_LABELS: Record<string, string> = {
  ptp_coach: 'PTP Certified Coach',
  ai_transformation_coach: 'AI Transformation Certified Coach',
  ai_transformation_ptp_coach: 'AI Transformation + PTP Certified Coach',
  my_brainwise_coach: 'My BrainWise Coach',
};
```

### Change 3: Add coach invitation state (after line 21)
- `searchParams` via `useSearchParams()`
- `coachToken` (string | null)
- `coachInvitation` (object | null with first_name, last_name, email, certification_type)
- `tokenLoading` (boolean)

### Change 4: Add useEffect to load invitation (after state declarations)
On mount, check `searchParams.get('coach_token')`. If present, query `coach_invitations` table for matching pending token. Pre-fill firstName, lastName, email from result.

### Change 5: Update handleSignUp success block (line 60)
After `setSuccess(true)`, if `coachToken && coachInvitation`, invoke `accept-coach-invitation` edge function with the token.

### Change 6: Update form UI (lines 85–136)
- If `tokenLoading`, show a centered `Loader2` spinner
- If `coachInvitation` is set, show a blue info banner above the form with the certification label
- Make firstName, lastName, and email inputs `readOnly` with `className="bg-muted"` when `coachInvitation` is present

### No other files changed

