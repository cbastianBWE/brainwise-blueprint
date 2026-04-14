

# Plan: Update deleteAccount to invoke Edge Function

## Single file: `src/pages/Settings.tsx`

### Change (lines 138–141)
Replace the `deleteAccount` function with a version that calls `supabase.functions.invoke('delete-account')` before signing out, with error handling via try/catch and `toast.error`.

**Before:**
```tsx
const deleteAccount = async () => {
  await signOut();
  navigate("/");
};
```

**After:**
```tsx
const deleteAccount = async () => {
  try {
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) throw error;
    await signOut();
    navigate('/');
  } catch (err) {
    toast.error('Failed to delete account. Please try again.');
  }
};
```

No other files changed. Note: the `delete-account` edge function does not exist yet — this wires up the client-side call only.

