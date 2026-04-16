

# Plan: Password Strength UI + Eye Toggle Across Three Files

## Overview
Add live password strength indicators, confirm-match feedback, and press-and-hold eye toggle to SignUp and ResetPassword. Add eye toggle only to Login. Strengthen validation rules (8+ chars, uppercase, number, symbol).

## File 1 — `src/pages/SignUp.tsx`

1. **Import** `Eye, EyeOff` from lucide-react (line 9)
2. **Add state** `showPassword`, `showConfirm` after existing state declarations (~line 30)
3. **Replace** `validatePassword` (line 62) with object-returning version + `isPasswordValid` helper
4. **Update** `handleSignUp` validation (line 71) to use `isPasswordValid(password)` with updated error message
5. **Replace** password field (lines 193–196) with eye-toggle wrapper + live strength checklist
6. **Replace** confirm field (lines 197–200) with eye-toggle wrapper + match indicator

## File 2 — `src/pages/Login.tsx`

1. **Import** `Eye, EyeOff` from lucide-react (line 8)
2. **Add state** `showPassword` (~line 16)
3. **Replace** password field (lines 74–77) with eye-toggle wrapper (no strength requirements)

## File 3 — `src/pages/ResetPassword.tsx`

1. **Import** `Eye, EyeOff` from lucide-react (line 8)
2. **Add state** `showPassword`, `showConfirm` (~line 15)
3. **Add** `validatePassword` + `isPasswordValid` functions (before handleSubmit)
4. **Update** validation in `handleSubmit` (lines 29–31) to use four-rule check with updated error message
5. **Replace** password field (lines 74–77) with eye-toggle wrapper + live strength checklist
6. **Replace** confirm field (lines 78–81) with eye-toggle wrapper + match indicator

No other files changed.

