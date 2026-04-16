import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, User, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingCoach, setCheckingCoach] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("coach_clients")
        .select("id")
        .eq("client_user_id", user.id)
        .limit(1);
      if (data && data.length > 0) {
        await selectAccountType("individual");
      } else {
        setCheckingCoach(false);
      }
    })();
  }, [user]);

  const selectAccountType = async (accountType: string) => {
    if (!user) return;
    setLoading(true);

    try {
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
          body: JSON.stringify({ account_type: accountType }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to set account type");
      }

      navigate("/demographic-consent");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCorporateSubmit = async () => {
    if (!inviteCode.trim()) {
      toast({ title: "Error", description: "Please enter an invitation code.", variant: "destructive" });
      return;
    }
    await selectAccountType("corporate_employee");
  };

  if (checkingCoach) {
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
            <Brain className="mx-auto h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Enter Invitation Code</CardTitle>
            <CardDescription>Enter the code your company provided</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Invitation code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowInviteCode(false)}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleCorporateSubmit} disabled={loading}>
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
          <Brain className="mx-auto h-10 w-10 text-primary mb-2" />
          <h1 className="text-2xl font-semibold text-foreground">Welcome to BrainWise</h1>
          <p className="text-muted-foreground mt-1">Tell us how you'll be using the platform</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => !loading && selectAccountType("individual")}
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
