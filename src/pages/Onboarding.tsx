import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountType } from "@/hooks/useOnboardingStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PENDING_INVITE_KEY = "pending_invite_code";

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: existingAccountType, isLoading: accountTypeLoading } = useAccountType(user?.id);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Re-onboarding guard: already-onboarded users should never see the picker.
  if (user && accountTypeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (existingAccountType && existingAccountType.length > 0) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Coach client auto-link takes precedence
      const { data } = await supabase
        .from("coach_clients_client_view")
        .select("id")
        .eq("client_user_id", user.id)
        .limit(1);
      if (data && data.length > 0) {
        await selectIndividual();
        return;
      }

      // Check for stashed invite code from sign-up URL
      const stashed = sessionStorage.getItem(PENDING_INVITE_KEY);
      if (stashed && stashed.trim()) {
        setInviteCode(stashed.trim().toUpperCase());
        setPrefilled(true);
        setShowInviteCode(true);
      }
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const callSetAccountType = async (body: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("No active session.");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-account-type`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      }
    );
    let result: any = {};
    try {
      result = await response.json();
    } catch {
      // ignore parse errors
    }
    return { response, result };
  };

  const selectIndividual = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { response, result } = await callSetAccountType({ account_type: "individual" });
      if (!response.ok) throw new Error(result?.error || "Failed to set account type");
      navigate("/demographic-form");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemInvite = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      toast({ title: "Error", description: "Please enter an invitation code.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { response, result } = await callSetAccountType({ invite_code: code });

      if (response.ok) {
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        toast({ title: "Welcome to your organization", description: "You're all set." });
        navigate("/demographic-form");
        return;
      }

      const status = response.status;
      const code409 = result?.code;
      const message: string = result?.error || "";

      if (status === 404 || code409 === "P0002") {
        toast({ title: "Invalid code", description: "Invitation code not found. Check your code and try again.", variant: "destructive" });
      } else if (status === 403 || code409 === "42501") {
        toast({ title: "Wrong email", description: "This invitation is for a different email address. Sign in with the email your admin invited.", variant: "destructive" });
      } else if (status === 400 && /expired/i.test(message)) {
        toast({ title: "Expired", description: "This invitation has expired. Contact your administrator for a new one.", variant: "destructive" });
      } else if (status === 400 && /already been redeemed/i.test(message)) {
        toast({ title: "Already used", description: "This invitation has already been used.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: message || "Something went wrong, please try again", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (prefilled) {
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      navigate("/login");
    } else {
      setShowInviteCode(false);
      setInviteCode("");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (showInviteCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
            <CardTitle className="text-2xl">Enter Invitation Code</CardTitle>
            <CardDescription>Enter the code your company provided</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Invitation code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              disabled={loading}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleBack} disabled={loading}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleRedeemInvite} disabled={loading}>
                {loading ? "Submitting..." : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
          <h1 className="text-2xl font-semibold text-foreground">Welcome to BrainWise</h1>
          <p className="text-muted-foreground mt-1">Tell us how you'll be using the platform</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => !loading && selectIndividual()}
          >
            <CardContent className="pt-6 text-center">
              <User className="mx-auto h-10 w-10 text-primary mb-3" />
              <h3 className="font-semibold text-foreground">I am signing up on my own</h3>
              <p className="text-sm text-muted-foreground mt-2">Personal growth and self-assessment</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => setShowInviteCode(true)}
          >
            <CardContent className="pt-6 text-center">
              <Building2 className="mx-auto h-10 w-10 text-primary mb-3" />
              <h3 className="font-semibold text-foreground">My company gave me access</h3>
              <p className="text-sm text-muted-foreground mt-2">Enter your organization's invitation code</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
