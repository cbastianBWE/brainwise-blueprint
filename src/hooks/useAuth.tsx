import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const syncSubscription = async () => {
  try {
    await supabase.functions.invoke("check-subscription");
  } catch {
    // silently ignore
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle checkout success redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      // Remove query param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.pathname + url.search);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setLoading(false);
        if (_event === "SIGNED_IN" && session?.user) {
          // Fire and forget — don't block auth state
          syncSubscription();
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Sync subscription on app load for authenticated users
        await syncSubscription();
        // If returning from checkout, sync is already done above
        if (params.get("checkout") === "success") {
          // Extra sync already handled
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useRoleRedirect = () => {
  const navigate = useNavigate();

  const redirectByRole = async (userId: string) => {
    const { data } = await supabase
      .from("users")
      .select("account_type")
      .eq("id", userId)
      .single();

    const accountType = data?.account_type;

    if (!accountType) {
      navigate("/onboarding");
      return;
    }

    switch (accountType) {
      case "coach":
        navigate("/coach/clients");
        break;
      case "admin":
        navigate("/admin/users");
        break;
      case "brainwise_super_admin":
        navigate("/super-admin/health");
        break;
      case "individual":
      case "corporate_employee":
      default:
        navigate("/dashboard");
        break;
    }
  };

  return { redirectByRole };
};
