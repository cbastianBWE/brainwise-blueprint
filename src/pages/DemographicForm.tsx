import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["Individual Contributor", "Manager", "Director", "VP/SVP", "C-Suite", "Other"];
const INDUSTRIES = [
  "Agriculture", "Automotive", "Banking & Finance", "Construction", "Consulting",
  "Education", "Energy & Utilities", "Entertainment & Media", "Government",
  "Healthcare", "Hospitality & Tourism", "Information Technology", "Insurance",
  "Legal", "Manufacturing", "Mining", "Non-Profit", "Pharmaceuticals",
  "Real Estate", "Retail", "Telecommunications", "Transportation & Logistics", "Other",
];
const EXPERIENCE = ["0-2", "3-5", "6-10", "11-20", "20+"];
const ORG_LEVELS = ["IC", "Manager", "Director", "VP", "C-Suite", "Other"];

const CORPORATE_TYPES = ["corporate_employee", "company_admin", "org_admin"];

const DemographicForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<string | null>(null);

  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [experience, setExperience] = useState("");
  
  const [orgLevel, setOrgLevel] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("account_type")
        .eq("id", user.id)
        .single();
      setAccountType(data?.account_type ?? null);
    })();
  }, [user]);

  const isCorporate = accountType ? CORPORATE_TYPES.includes(accountType) : false;

  const requiredMissing =
    !role || !industry || !experience || (isCorporate && !orgLevel);

  const handleSave = async () => {
    if (!user || requiredMissing) return;
    setLoading(true);

    const { error: demoErr } = await supabase.from("user_demographics").upsert({
      user_id: user.id,
      role_in_org: role,
      industry,
      years_experience: experience,
    }, { onConflict: "user_id" });

    if (demoErr) {
      setLoading(false);
      toast({ title: "Error", description: demoErr.message, variant: "destructive" });
      return;
    }

    if (isCorporate) {
      const { error: userErr } = await supabase
        .from("users")
        .update({ org_level: orgLevel })
        .eq("id", user.id);
      if (userErr) {
        setLoading(false);
        toast({ title: "Error", description: userErr.message, variant: "destructive" });
        return;
      }
    }

    setLoading(false);
    await queryClient.invalidateQueries({ queryKey: ["onboarding-status", user.id] });
    navigate("/demographic-consent", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
          <CardTitle className="text-2xl">A Few Required Details</CardTitle>
          <CardDescription>
            We need this information to tailor your experience and enable aggregate reporting for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Role in Organization</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
              <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Years of Professional Experience</Label>
            <Select value={experience} onValueChange={setExperience}>
              <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
              <SelectContent>{EXPERIENCE.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {isCorporate && (
            <div className="space-y-2">
              <Label>Organization Level</Label>
              <Select value={orgLevel} onValueChange={setOrgLevel}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>{ORG_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-2">
            <Button onClick={handleSave} disabled={loading || requiredMissing} className="w-full">
              {loading ? "Saving..." : "Save and Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemographicForm;
