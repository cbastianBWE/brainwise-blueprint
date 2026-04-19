import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAccountRole } from "@/lib/accountRoles";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  /**
   * Feature key to check for corporate users via user_has_feature RPC.
   * Namespace matches user_has_feature: "ai_chat", "dashboard_access",
   * or "instrument:<uuid>". If omitted, corp users pass through without
   * a feature check (used on routes like /resources where corp access is
   * unconditional but individuals still need an active Stripe sub).
   * Has no effect on individuals (Stripe check) or bypass roles (always pass).
   */
  feature?: string;
}

export default function SubscriptionGate({ children, feature }: Props) {
  const { isBypassAdmin, isCorp, isIndividual, loading: roleLoading } = useAccountRole();
  const { profile, loading: profileLoading } = useUserProfile();
  const { user } = useAuth();
  const [featureCheck, setFeatureCheck] = useState<"pending" | "allowed" | "denied">("pending");

  useEffect(() => {
    if (!isCorp || !feature || !user) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("user_has_feature", {
        p_user: user.id,
        p_feature: feature,
      });
      if (cancelled) return;
      if (error || !data) {
        setFeatureCheck("denied");
      } else {
        setFeatureCheck("allowed");
      }
    })();

    return () => { cancelled = true; };
  }, [isCorp, feature, user]);

  if (roleLoading || profileLoading) return null;
  if (isCorp && feature && featureCheck === "pending") return null;

  // Bypass roles always pass
  if (isBypassAdmin) return <>{children}</>;

  // Corp users
  if (isCorp) {
    if (!feature) return <>{children}</>;
    if (featureCheck === "allowed") return <>{children}</>;
    toast.error("This feature is not part of your organization's contract.");
    return <Navigate to="/dashboard" replace />;
  }

  // Individual users: unchanged Stripe check
  if (isIndividual) {
    if (profile?.subscription_status !== "active") {
      return <Navigate to="/pricing" replace />;
    }
    return <>{children}</>;
  }

  // Unknown role: deny
  return <Navigate to="/dashboard" replace />;
}
