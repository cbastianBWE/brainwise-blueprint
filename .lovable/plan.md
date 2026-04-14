

# Plan: Add Account Reactivation Flow to Login

## Single file: `src/pages/Login.tsx`

### 1. Add imports (top of file)
Add `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle` from `@/components/ui/alert-dialog`.

### 2. Add state variables (after existing state, ~line 18)
- `showReactivate` (boolean, default false)
- `reactivating` (boolean, default false)

### 3. Update error handling in `handleLogin` (lines 30–31)
Replace the simple toast with a check against `users` table for `account_status === 'deleted'` within 90-day grace period. Show reactivation dialog if match, otherwise show original error toast.

### 4. Add `handleReactivate` function (after `handleLogin`)
Calls `supabase.functions.invoke('reactivate-account', { body: { email } })`, shows success/error toast, toggles dialog state.

### 5. Add AlertDialog JSX (before closing `</div>` of return)
Reactivation dialog with title, description about 90-day recovery, Cancel and Reactivate buttons with loading state.

### No other files changed
Note: `reactivate-account` edge function does not exist yet — this wires up the client-side only.

