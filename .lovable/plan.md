## Fix: Password reset "Auth session missing!" error

**File:** `src/pages/ResetPassword.tsx` (single-file change)

### Problem
The page string-matches `window.location.hash` for `type=recovery`, which races Supabase's `detectSessionInUrl` (default true). The client consumes/clears the hash before the `useEffect` reads it, so either the form never shows, or it shows without a real session — causing `callIdentityMutation` to hit the Edge Function with no auth token → "Auth session missing!".

### Changes

**1. Replace `isRecovery` boolean with a three-state `status`**

Remove:
```ts
const [isRecovery, setIsRecovery] = useState(false);
useEffect(() => {
  const hash = window.location.hash;
  if (hash.includes("type=recovery")) setIsRecovery(true);
}, []);
```

Add:
```ts
const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");

useEffect(() => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      setStatus("ready");
    } else if (event === "SIGNED_IN" && session) {
      setStatus("ready");
    }
  });

  // Client may have processed the hash before we subscribed
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) setStatus((s) => (s === "checking" ? "ready" : s));
  });

  timeoutId = setTimeout(() => {
    setStatus((s) => (s === "checking" ? "invalid" : s));
  }, 3500);

  return () => {
    subscription.unsubscribe();
    if (timeoutId) clearTimeout(timeoutId);
  };
}, []);
```

**2. Render per status**
- `"checking"` → new centered card: "Verifying your reset link..." (brand-token styled, matches existing card layout).
- `"invalid"` → existing "Invalid Link" card (unchanged markup).
- `"ready"` → existing "Set New Password" form (unchanged markup).

**3. Harden `handleSubmit`**

After the password-validity and password-match checks (unchanged), before `callIdentityMutation`:
```ts
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  toast({
    title: "Error",
    description: "Your reset link has expired. Please request a new password reset.",
    variant: "destructive",
  });
  return;
}
```
Then the existing `callIdentityMutation({ action: 'update_password', new_password: password })` call runs unchanged.

### Not changing
- Form fields, password-strength checks, show/hide toggles, password-match validation.
- `callIdentityMutation` call itself.
- Styling, brand tokens, card layout.
- Success → `/login` redirect.
- `src/integrations/supabase/client.ts` (auto-generated; `detectSessionInUrl: true` is correct).

### Acceptance check
Real reset link → "Verifying..." → form → submit succeeds → `/login`. Direct visit with no token → "Invalid Link" after ~3.5s. Expired link → either invalid-link card or clear "request a new reset" toast — never the opaque Edge Function error.
