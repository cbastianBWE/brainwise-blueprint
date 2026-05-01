import { ReactNode, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAccountRole } from "@/lib/accountRoles";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  toastMessage?: string;
}

/**
 * Redirects corporate users away from Stripe-related routes.
 * Used on /settings/plan and /settings/billing. Corp users have no Stripe
 * subscription (their org's contract is the source of truth), so these
 * pages would either 403 at create-checkout or show stale data.
 * Toast is fired once per mount via a ref guard to avoid double-fires
 * in React StrictMode.
 */
export default function CorpRedirect({ children, toastMessage }: Props) {
  const { isCorp, loading } = useAccountRole();
  const toastFired = useRef(false);

  useEffect(() => {
    if (!loading && isCorp && toastMessage && !toastFired.current) {
      toast.info(toastMessage);
      toastFired.current = true;
    }
  }, [loading, isCorp, toastMessage]);

  if (loading) return null;
  if (isCorp) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
