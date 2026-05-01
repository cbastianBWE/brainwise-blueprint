import { useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAccountRole } from "@/lib/accountRoles";
import MarketingPricing from "./marketing/Pricing";

export default function PricingRouter() {
  const { user, loading } = useAuth();
  const { isCorp, loading: roleLoading } = useAccountRole();
  const location = useLocation();
  const toastFiredRef = useRef(false);

  // Avoid flashing public marketing page to authenticated users while auth/role resolves
  if (loading || (user && roleLoading)) {
    return null;
  }

  if (user) {
    if (isCorp) {
      if (!toastFiredRef.current) {
        toastFiredRef.current = true;
        toast.info("Your organization handles billing directly.");
      }
      return <Navigate to="/dashboard" replace />;
    }
    const target = `/settings/plan${location.search}${location.hash}`;
    return <Navigate to={target} replace />;
  }

  return <MarketingPricing />;
}
