
Single one-line change to `src/components/ProtectedRoute.tsx`: update the useEffect dependency array from `[session?.user?.id]` to `[session?.user?.id, location.pathname]` so the `has_required_demographics` RPC re-runs on each navigation, picking up newly-saved fields. No other logic changes.
