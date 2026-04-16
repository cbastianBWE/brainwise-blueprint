

# Plan: Add email query param pre-fill to SignUp.tsx useEffect

## Single file: `src/pages/SignUp.tsx`

Replace the existing `useEffect` that reads `searchParams` (lines ~45–61) with the updated version that first checks for an `?email=` query parameter and pre-fills the email field, then continues with the existing coach token logic unchanged.

No other files changed.

