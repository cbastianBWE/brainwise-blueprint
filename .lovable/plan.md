

# Plan: Add loading spinner to Onboarding.tsx during coach check

## Single file: `src/pages/Onboarding.tsx`

### Change 1 — Add `checkingCoach` state (after line 17)
Add: `const [checkingCoach, setCheckingCoach] = useState(true);`

### Change 2 — Update useEffect (lines 19–31)
Replace the existing useEffect to add `setCheckingCoach(false)` in the else branch when no coach_clients record is found.

### Change 3 — Add loading spinner guard (before line 76)
Insert a `if (checkingCoach)` block that returns a centered spinner, preventing the onboarding UI from flashing before the coach check completes.

No other files changed.

