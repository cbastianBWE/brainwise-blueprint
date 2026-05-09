import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingStatus, useAccountType } from "@/hooks/useOnboardingStatus";
import { useMfaRequired, useMfaSatisfied } from "@/hooks/useMfaStatus";
import { useImpersonation } from "@/contexts/ImpersonationProvider";

const EXEMPT_PATHS = [
  "/onboarding",
  "/demographic-form",
  "/demographic-consent",
  "/peer-sharing-optin",
  "/peer-access-responded",
  "/mfa-enrollment",
];

const IMPERSONATION_REDIRECT_PATHS = [
  "/onboarding",
  "/demographic-form",
  "/demographic-consent",
  "/peer-sharing-optin",
  "/mfa-enrollment",
];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  const userId = session?.user?.id;

  const { data: statusProfile, isLoading: statusLoading } = useQuery({
    queryKey: ["protected-route-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("account_status, deactivated_at, reactivation_deadline")
        .eq("id", userId!)
        .single();
      return data;
    },
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: hasRequired, isLoading: gateLoading } = useOnboardingStatus(userId);
  const { data: accountType, isLoading: accountTypeLoading } = useAccountType(userId);
  const { data: mfaRequired, isLoading: mfaRequiredLoading } = useMfaRequired(userId);
  const { data: mfaSatisfied, isLoading: mfaSatisfiedLoading } = useMfaSatisfied(userId);

  if (
    loading ||
    (session &&
      (statusLoading ||
        gateLoading ||
        accountTypeLoading ||
        mfaRequiredLoading ||
        mfaSatisfiedLoading))
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Deactivation grace-period guard
  if (
    statusProfile?.account_status === "active" &&
    statusProfile?.deactivated_at &&
    (!statusProfile.reactivation_deadline ||
      new Date(statusProfile.reactivation_deadline) > new Date())
  ) {
    if (location.pathname !== "/departed") {
      return <Navigate to="/departed" replace />;
    }
  }

  // Demographics gate (runs before MFA gate)
  if (hasRequired === false && !EXEMPT_PATHS.includes(location.pathname)) {
    if (!accountType) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/demographic-form" replace />;
  }

  // MFA gate
  if (
    mfaRequired === true &&
    mfaSatisfied === false &&
    !EXEMPT_PATHS.includes(location.pathname)
  ) {
    return <Navigate to="/mfa-enrollment" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
