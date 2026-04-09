import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";

interface Props {
  children: ReactNode;
}

export default function SubscriptionGate({ children }: Props) {
  const { profile, loading } = useUserProfile();

  if (loading) return null;

  // Super admins, admins, and coaches bypass subscription gate
  const bypassRoles = ["brainwise_super_admin", "admin", "coach"];
  if (profile?.account_type && bypassRoles.includes(profile.account_type)) {
    return <>{children}</>;
  }

  if (profile?.subscription_status !== "active") {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
}
