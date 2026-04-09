import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DemographicConsent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConsent = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from("user_demographics").upsert({
      user_id: user.id,
      consent_granted_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate("/demographic-form");
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Brain className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle className="text-2xl">Optional: Help Us Understand Our Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <CardDescription className="text-base leading-relaxed">
            We collect optional background information to improve our platform through aggregate research.
            This data is never shared with your employer, coach, or any third party in identifiable form.
            Providing it is entirely optional and you can withdraw consent at any time.
          </CardDescription>
          <div className="flex flex-col gap-3">
            <Button onClick={handleConsent} disabled={loading} className="w-full">
              {loading ? "Saving..." : "I Consent to Optional Data Collection"}
            </Button>
            <Button variant="outline" onClick={handleSkip} className="w-full">
              Skip for Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemographicConsent;
