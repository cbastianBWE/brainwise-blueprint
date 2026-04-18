import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const EXEMPT_PATHS = ["/onboarding", "/demographic-form", "/demographic-consent", "/peer-sharing-optin", "/peer-access-responded"];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [hasRequired, setHasRequired] = useState<boolean | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    (async () => {
      const [rpcRes, userRes] = await Promise.all([
        supabase.rpc("has_required_demographics", { p_user_id: session.user.id }),
        supabase.from("users").select("account_type").eq("id", session.user.id).single(),
      ]);
      if (cancelled) return;
      setHasRequired(rpcRes.data === true);
      setAccountType(userRes.data?.account_type ?? null);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, location.pathname]);

  if (loading || (session && checking)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (hasRequired === false && !EXEMPT_PATHS.includes(location.pathname)) {
    if (!accountType) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/demographic-form" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
