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
   * Feature key checked via the user_has_feature RPC.
   *
   * Module entitlement keys ("module:<MODULE>") resolve through user_has_feature
   * for EVERY principal (corporate, individual, coach), so a module can be turned
   * on or off per principal. Super admins always resolve true in the RPC, so they
   * keep full access. This is intentionally checked before the bypass-role
   * shortcut so coaches can be gated too.
   *
   * Non-module keys: super admin bypasses. Coaches pass everything except
   * `ai_chat`, which requires Coach Premium or one-time chat credits.
   * Corporate resolves via user_has_feature; individuals gate on Stripe
   * subscription status (ai_chat allows a credit bypass).
   */
  feature?: string;
}

export default function SubscriptionGate({ children, feature }: Props) {
  const { isBypassAdmin, isSuperAdmin, isCoach, isCoachPremium, isCorp, isIndividual, loading: roleLoading } = useAccountRole();
  const { profile, loading: profileLoading } = useUserProfile();
  const { user } = useAuth();
  const userId = user?.id;
  const [featureCheck, setFeatureCheck] = useState<"pending" | "allowed" | "denied">("pending");

  const isModuleFeature = !!feature && feature.startsWith("module:");
  // Module keys always resolve via the RPC (every principal). Non-module keys
  // use the RPC only for corporate users, as before.
  const needsFeatureRpc = !!feature && (isModuleFeature || isCorp);

  useEffect(() => {
    if (!needsFeatureRpc || !userId) return;

    let cancelled = false;
    setFeatureCheck("pending");
    (async () => {
      const { data, error } = await supabase.rpc("user_has_feature", {
        p_user: userId,
        p_feature: feature,
      });
      if (cancelled) return;
      setFeatureCheck(error || !data ? "denied" : "allowed");
    })();

    return () => { cancelled = true; };
  }, [needsFeatureRpc, feature, userId]);

  if (roleLoading || profileLoading) return null;
  if (needsFeatureRpc && featureCheck === "pending") return null;

  // Module entitlement keys: one rule for everyone. Checked before the bypass
  // shortcut so coaches can be turned off too; super admins still pass via the RPC.
  if (isModuleFeature) {
    if (featureCheck === "allowed") return <>{children}</>;
    toast.error("This module is not part of your plan.");
    return <Navigate to="/dashboard" replace />;
  }

  // Non-module behavior below.
  if (isSuperAdmin) return <>{children}</>;

  if (isCoach) {
    // Free coaches administer the PTP only. AI chat is the paid boundary.
    if (feature === "ai_chat") {
      const credits = profile?.one_time_chat_credits ?? 0;
      if (isCoachPremium || credits > 0) return <>{children}</>;
      return <Navigate to="/settings/plan" replace />;
    }
    // Everything else keeps today's behaviour for coaches.
    return <>{children}</>;
  }

  // Keep isBypassAdmin referenced for future non-super bypass roles (currently a no-op).
  if (isBypassAdmin) return <>{children}</>;

  if (isCorp) {
    if (!feature) return <>{children}</>;
    if (featureCheck === "allowed") return <>{children}</>;
    toast.error("This feature is not part of your organization's contract.");
    return <Navigate to="/dashboard" replace />;
  }

  if (isIndividual) {
    const isActive = profile?.subscription_status === "active";
    const credits = profile?.one_time_chat_credits ?? 0;
    if (feature === "ai_chat") {
      if (isActive || credits > 0) return <>{children}</>;
      return <Navigate to="/settings/plan" replace />;
    }
    if (!isActive) return <Navigate to="/settings/plan" replace />;
    return <>{children}</>;
  }

  return <Navigate to="/dashboard" replace />;
}
